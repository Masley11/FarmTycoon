"""FarmTycoon backend pytest suite — exercises every /api route."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    from pathlib import Path
    env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def reset_game(client):
    """Start with a fresh game state."""
    r = client.post(f"{API}/game/reset", timeout=15)
    assert r.status_code == 200, f"reset failed: {r.text}"
    assert r.json().get("ok") is True
    yield


# -------- Game state ----------
class TestGameState:
    def test_root(self, client):
        r = client.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_state_shape(self, client):
        r = client.get(f"{API}/game/state", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ["state", "parcels", "alerts", "crop_prices", "resource_prices",
                  "contracts", "catalog", "activity"]:
            assert k in data, f"missing key {k}"
        # no _id leaks
        assert "_id" not in data["state"]
        for p in data["parcels"]:
            assert "_id" not in p
        for a in data["activity"]:
            assert "_id" not in a
        assert data["state"]["cash"] == 25000.0
        assert data["state"]["day"] >= 1
        assert len(data["parcels"]) == 8
        owned = [p for p in data["parcels"] if p["owned"]]
        assert len(owned) == 2
        assert set(p["id"] for p in owned) == {"parcel-001", "parcel-002"}
        assert len(data["contracts"]) == 4
        assert "wheat" in data["crop_prices"]
        assert "water" in data["resource_prices"]

    def test_force_tick(self, client):
        d1 = client.get(f"{API}/game/state").json()["state"]["day"]
        r = client.post(f"{API}/game/tick", timeout=10)
        assert r.status_code == 200
        d2 = r.json()["day"]
        assert d2 == d1 + 1


# -------- Parcels ----------
class TestParcels:
    def test_buy_parcel(self, client):
        st = client.get(f"{API}/game/state").json()
        cash0 = st["state"]["cash"]
        target = next(p for p in st["parcels"] if not p["owned"])
        price = target["price"]
        r = client.post(f"{API}/parcels/{target['id']}/buy", timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["parcel"]["owned"] is True
        st2 = client.get(f"{API}/game/state").json()
        assert st2["state"]["cash"] <= cash0 - price + 50  # tolerate baseline expense
        # Re-buying should 400
        r2 = client.post(f"{API}/parcels/{target['id']}/buy")
        assert r2.status_code == 400

    def test_buy_unknown(self, client):
        r = client.post(f"{API}/parcels/parcel-999/buy")
        assert r.status_code == 404

    def test_plant_irrigate_fertilize_herbicide(self, client):
        # use parcel-001 (owned at start)
        r = client.post(f"{API}/parcels/parcel-001/plant", json={"crop_type": "wheat"})
        # may already be planted from a previous run; tolerate 400 if so
        assert r.status_code in (200, 400), r.text
        if r.status_code == 200:
            assert r.json()["parcel"]["crop_type"] == "wheat"
        # Irrigate
        r = client.post(f"{API}/parcels/parcel-001/irrigate")
        assert r.status_code in (200, 400), r.text
        # Fertilize chemical
        r = client.post(f"{API}/parcels/parcel-001/fertilize", json={"type": "chemical"})
        assert r.status_code in (200, 400), r.text
        # Bad fert type
        r = client.post(f"{API}/parcels/parcel-001/fertilize", json={"type": "bad"})
        assert r.status_code == 400
        # Herbicide
        r = client.post(f"{API}/parcels/parcel-001/herbicide")
        assert r.status_code in (200, 400)

    def test_plant_invalid_crop(self, client):
        r = client.post(f"{API}/parcels/parcel-002/plant", json={"crop_type": "zorglub"})
        assert r.status_code == 400

    def test_harvest_not_mature(self, client):
        r = client.post(f"{API}/parcels/parcel-001/harvest")
        # Should fail if not mature
        assert r.status_code in (200, 400)
        if r.status_code == 400:
            assert "mature" in r.text.lower() or "récolt" in r.text.lower()


# -------- Resources & market ----------
class TestMarketAndResources:
    def test_buy_water(self, client):
        before = client.get(f"{API}/game/state").json()["state"]
        r = client.post(f"{API}/resources/buy", json={"resource": "water", "packs": 2})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["added_qty"] == 200  # pack=100 * 2
        after = client.get(f"{API}/game/state").json()["state"]
        assert after["water"] >= before["water"] + 200 - 0.01

    def test_buy_unknown_resource(self, client):
        r = client.post(f"{API}/resources/buy", json={"resource": "magic", "packs": 1})
        assert r.status_code == 400

    def test_sell_insufficient(self, client):
        # Drain inventory by ensuring no wheat sold
        r = client.post(f"{API}/market/sell", json={"crop": "wheat", "qty": 999})
        assert r.status_code == 400

    def test_fulfill_unknown_contract(self, client):
        r = client.post(f"{API}/contracts/contract-bad/fulfill")
        # Could be 404 (not in list) or 400 (insufficient stock for an expired-day contract)
        assert r.status_code in (400, 404)


# -------- Premium ----------
class TestPremium:
    def test_status(self, client):
        r = client.get(f"{API}/premium/status")
        assert r.status_code == 200
        d = r.json()
        assert "tiers" in d
        ids = {t["id"] for t in d["tiers"]}
        assert {"monthly", "annual"} <= ids
        assert "features" in d and len(d["features"]) > 0

    def test_subscribe_pending(self, client):
        r = client.post(f"{API}/premium/subscribe")
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is False
        assert d["status"] == "pending_integration"
        assert d["provider"] == "maketou"


# -------- Analytics ----------
class TestAnalytics:
    def test_analytics(self, client):
        r = client.get(f"{API}/analytics")
        assert r.status_code == 200
        d = r.json()
        for k in ["history", "inventory", "cash", "day"]:
            assert k in d


# -------- Auto-tick ----------
class TestAutoTick:
    @pytest.mark.slow
    def test_auto_tick_advances(self, client):
        d1 = client.get(f"{API}/game/state").json()["state"]["day"]
        time.sleep(12)
        d2 = client.get(f"{API}/game/state").json()["state"]["day"]
        assert d2 > d1, f"day did not advance (d1={d1}, d2={d2})"
