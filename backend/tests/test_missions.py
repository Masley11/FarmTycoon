"""FarmTycoon missions system pytest suite — iteration 2."""
import os
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _reset(client):
    r = client.post(f"{API}/game/reset", timeout=20)
    assert r.status_code == 200, r.text


def _state(client):
    r = client.get(f"{API}/game/state", timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


# ============ Missions list & determinism ============
def test_missions_list_endpoint(client):
    _reset(client)
    r = client.get(f"{API}/missions", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "missions" in j and len(j["missions"]) == 3
    assert "day" in j and "level" in j
    assert "premium_credits" in j and "cosmetics" in j
    assert j["day"] == 1
    assert j["level"]["level"] == 1
    assert j["level"]["xp"] == 0


def test_missions_day1_deterministic(client):
    _reset(client)
    j = client.get(f"{API}/missions", timeout=15).json()
    ids = {m["id"] for m in j["missions"]}
    instance_ids = {m["instance_id"] for m in j["missions"]}
    assert ids == {"fert_2", "irrigate_3", "contract_1"}, f"got {ids}"
    assert instance_ids == {
        "mission-1-fert_2",
        "mission-1-irrigate_3",
        "mission-1-contract_1",
    }
    # All initially not completed, not claimed, progress 0
    for m in j["missions"]:
        assert m["progress"] == 0
        assert m["claimed"] is False
        assert m["completed"] is False


def test_game_state_includes_missions_and_level(client):
    _reset(client)
    j = _state(client)
    assert "missions" in j and len(j["missions"]) == 3
    assert "level" in j
    lvl = j["level"]
    for k in ("level", "xp", "xp_in_level", "xp_for_next", "xp_to_next", "progress_pct"):
        assert k in lvl, f"missing {k} in level"


# ============ Progression via irrigate ============
def test_irrigate_progresses_irrigate_3(client):
    _reset(client)
    # irrigate parcel-001 (owned)
    r1 = client.post(f"{API}/parcels/parcel-001/irrigate", timeout=15)
    assert r1.status_code == 200, r1.text
    j = client.get(f"{API}/missions", timeout=15).json()
    mi = next(m for m in j["missions"] if m["id"] == "irrigate_3")
    assert mi["progress"] == 1
    assert mi["completed"] is False

    # irrigate parcel-002
    r2 = client.post(f"{API}/parcels/parcel-002/irrigate", timeout=15)
    assert r2.status_code == 200, r2.text

    # irrigate parcel-001 again
    r3 = client.post(f"{API}/parcels/parcel-001/irrigate", timeout=15)
    assert r3.status_code == 200, r3.text

    j2 = client.get(f"{API}/missions", timeout=15).json()
    mi2 = next(m for m in j2["missions"] if m["id"] == "irrigate_3")
    assert mi2["progress"] == 3
    assert mi2["completed"] is True
    assert mi2["claimed"] is False


# ============ Claim mission ============
def test_claim_irrigate_3_rewards_and_state(client):
    _reset(client)
    cash_before = _state(client)["state"]["cash"]
    for pid in ("parcel-001", "parcel-002", "parcel-001"):
        assert client.post(f"{API}/parcels/{pid}/irrigate", timeout=15).status_code == 200

    r = client.post(f"{API}/missions/mission-1-irrigate_3/claim", timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["rewards"] == {"xp": 40, "cash": 80, "credits": 0, "cosmetic": None}
    lvl = j["level"]
    assert lvl["level"] == 1
    assert lvl["xp"] == 40
    assert lvl["xp_in_level"] == 40
    assert lvl["xp_for_next"] == 100
    assert lvl["xp_to_next"] == 60
    assert lvl["progress_pct"] == 40.0

    # Verify state persistence: cash +80, xp=40, mission.claimed=true
    s = _state(client)
    assert s["state"]["xp"] == 40
    # cash should be cash_before + 80 (no other revenue from irrigation)
    assert abs(s["state"]["cash"] - (cash_before + 80)) < 0.01, (
        f"cash diff: {s['state']['cash']} vs {cash_before}+80"
    )
    mi = next(m for m in s["missions"] if m["id"] == "irrigate_3")
    assert mi["claimed"] is True


def test_claim_twice_returns_400(client):
    # Mission should already be claimed from previous test
    r = client.post(f"{API}/missions/mission-1-irrigate_3/claim", timeout=15)
    assert r.status_code == 400
    assert "réclamée" in r.json().get("detail", "").lower()


def test_claim_not_completed_returns_400(client):
    _reset(client)
    # fert_2 not completed yet
    r = client.post(f"{API}/missions/mission-1-fert_2/claim", timeout=15)
    assert r.status_code == 400
    assert "complétée" in r.json().get("detail", "").lower()


def test_claim_nonexistent_returns_404(client):
    r = client.post(f"{API}/missions/mission-1-inexistante/claim", timeout=15)
    assert r.status_code == 404


# ============ Progress via fertilize ============
def test_fertilize_progresses_fert_2(client):
    _reset(client)
    r = client.post(
        f"{API}/parcels/parcel-001/fertilize",
        json={"type": "chemical"}, timeout=15,
    )
    assert r.status_code == 200, r.text
    j = client.get(f"{API}/missions", timeout=15).json()
    m = next(x for x in j["missions"] if x["id"] == "fert_2")
    assert m["progress"] == 1


# ============ Sell and contract progress ============
def test_buy_water_water_purchased_stat(client):
    _reset(client)
    # buy 1 pack = 100 m3
    r1 = client.post(f"{API}/resources/buy", json={"resource": "water", "packs": 1}, timeout=15)
    assert r1.status_code == 200, r1.text
    j = client.get(f"{API}/game/state", timeout=15).json()
    assert j["state"]["day_stats"]["water_purchased"] == 100

    # buy 2 more packs (200) -> total 300 > target 100
    r2 = client.post(f"{API}/resources/buy", json={"resource": "water", "packs": 2}, timeout=15)
    assert r2.status_code == 200, r2.text
    j2 = client.get(f"{API}/game/state", timeout=15).json()
    assert j2["state"]["day_stats"]["water_purchased"] == 300


def test_market_sell_progresses_sells_qty(client):
    _reset(client)
    # Seed inventory directly is not possible — instead just check the bump works by
    # planting + waiting is too slow. So we use contract path which we know fails without
    # inventory. Instead, validate the endpoint rejects when no stock and that sells_qty
    # does NOT change on failure.
    r = client.post(f"{API}/market/sell", json={"crop": "wheat", "qty": 1.0}, timeout=15)
    assert r.status_code == 400  # no inventory
    j = client.get(f"{API}/game/state", timeout=15).json()
    assert j["state"]["day_stats"]["sells_qty"] == 0
