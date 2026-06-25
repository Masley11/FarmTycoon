"""FarmTycoon backend — Agricultural Management Platform."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime, timezone

import game_logic as gl

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client    = AsyncIOMotorClient(mongo_url)
db        = client[os.environ["DB_NAME"]]

app        = FastAPI(title="FarmTycoon API", version="2.0.0")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger  = logging.getLogger("farmtycoon")
GAME_ID = "global"

# ── HELPERS ───────────────────────────────────────────────────────────────────
async def _load_state() -> dict[str, Any]:
    doc = await db.game_state.find_one({"id": GAME_ID}, {"_id": 0})
    if not doc:
        doc = gl.default_game_state()
        await db.game_state.insert_one(doc.copy())
    return doc

async def _load_parcels() -> list[dict[str, Any]]:
    cursor  = db.parcels.find({}, {"_id": 0})
    parcels = await cursor.to_list(length=1000)
    if not parcels:
        parcels = gl.default_parcels()
        for p in parcels:
            await db.parcels.insert_one(p.copy())
    return parcels

async def _save_state(state: dict[str, Any]) -> None:
    await db.game_state.replace_one({"id": GAME_ID}, state, upsert=True)

async def _save_parcels(parcels: list[dict[str, Any]]) -> None:
    for p in parcels:
        await db.parcels.replace_one({"id": p["id"]}, p, upsert=True)

def _bump_stat(state: dict[str, Any], key: str, delta: float = 1) -> None:
    if "day_stats" not in state or not isinstance(state.get("day_stats"), dict):
        state["day_stats"] = gl.empty_day_stats()
    state["day_stats"][key] = state["day_stats"].get(key, 0) + delta
    gl.update_mission_progress(state)

def _ensure_missions(state: dict[str, Any]) -> None:
    if not state.get("daily_missions"):
        state["daily_missions"] = gl.generate_daily_missions(state["day"])
    if "day_stats" not in state or not isinstance(state.get("day_stats"), dict):
        state["day_stats"] = gl.empty_day_stats()
    if "xp" not in state:
        state["xp"] = 0
    if "cosmetics" not in state:
        state["cosmetics"] = []

async def _log_activity(message: str, type_: str = "info", day: int | None = None) -> None:
    entry = {
        "id":      f"act-{datetime.now(timezone.utc).timestamp()*1000:.0f}",
        "message": message,
        "type":    type_,
        "day":     day,
        "ts":      datetime.now(timezone.utc).isoformat(),
    }
    await db.activity_log.insert_one(entry)

async def _auto_tick(state, parcels):
    _ensure_missions(state)
    pending = gl.compute_pending_days(state)
    days    = min(pending, 30)
    if days > 0:
        summary = gl.process_ticks(state, parcels, days)
        state["last_tick_at"] = gl.now_utc().isoformat()
        for act in summary["activities"]:
            await _log_activity(act["message"], act["type"], act["day"])
        await _save_state(state)
        await _save_parcels(parcels)
    gl.update_mission_progress(state)
    return state, parcels, days

# ── MODELS ────────────────────────────────────────────────────────────────────
class PlantRequest(BaseModel):
    crop_type: str

class FertilizeRequest(BaseModel):
    type: str

class BuyResourceRequest(BaseModel):
    resource: str
    packs: int = Field(ge=1, le=100)

class SellRequest(BaseModel):
    crop: str
    qty: float = Field(gt=0)

class BuyLivestockRequest(BaseModel):
    type: str
    count: int = Field(ge=1, le=200)

class SellLivestockRequest(BaseModel):
    count: int = Field(ge=1)

class BuyVehicleRequest(BaseModel):
    type: str

class HireEmployeeRequest(BaseModel):
    role: str

class BuyUpgradeRequest(BaseModel):
    key: str

# ── ROUTES ────────────────────────────────────────────────────────────────────
@app.get("/")
async def read_root():
    return {"message": "FarmTycoon API opérationnelle"}

@api_router.get("/")
async def root():
    return {"app": "FarmTycoon", "status": "ok"}

# ── GAME STATE ────────────────────────────────────────────────────────────────
@api_router.get("/game/state")
async def get_state():
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, ticks = await _auto_tick(state, parcels)

    alerts          = gl.build_alerts(state, parcels)
    crop_prices     = {k: gl.crop_market_price(k, state["market_multipliers"]) for k in gl.CROP_CATALOG}
    resource_prices = {k: gl.resource_market_price(k, state["weather"]) for k in gl.RESOURCE_CATALOG}
    contracts       = gl.generate_contracts(state)
    level_info      = gl.xp_to_level(state.get("xp", 0))
    season_info     = gl.day_to_season_info(state["day"])

    activity_cursor = db.activity_log.find({}, {"_id": 0}).sort("ts", -1).limit(15)
    activity        = await activity_cursor.to_list(length=15)

    return {
        "state":    state,
        "parcels":  parcels,
        "alerts":   alerts,
        "crop_prices":     crop_prices,
        "resource_prices": resource_prices,
        "contracts":       contracts,
        "catalog": {
            "crops":            gl.CROP_CATALOG,
            "resources":        gl.RESOURCE_CATALOG,
            "livestock":        gl.LIVESTOCK_CATALOG,
            "livestock_products": gl.LIVESTOCK_PRODUCTS,
            "vehicles":         gl.VEHICLE_CATALOG,
            "employee_roles":   gl.EMPLOYEE_ROLES,
            "upgrades":         gl.UPGRADE_CATALOG,
        },
        "missions":      state.get("daily_missions", []),
        "level":         level_info,
        "season":        season_info,
        "ticks_applied": ticks,
        "activity":      activity,
    }

@api_router.get("/game/season")
async def get_season():
    state      = await _load_state()
    season_info = gl.day_to_season_info(state["day"])
    level_info  = gl.xp_to_level(state.get("xp", 0))
    return {"season": season_info, "level": level_info, "day": state["day"]}

@api_router.post("/game/tick")
async def force_tick():
    state   = await _load_state()
    parcels = await _load_parcels()
    summary = gl.process_ticks(state, parcels, 1)
    state["last_tick_at"] = gl.now_utc().isoformat()
    for act in summary["activities"]:
        await _log_activity(act["message"], act["type"], act["day"])
    await _save_state(state)
    await _save_parcels(parcels)
    season_info = gl.day_to_season_info(state["day"])
    return {"day": state["day"], "season": season_info}

@api_router.post("/game/reset")
async def reset_game():
    await db.game_state.delete_many({})
    await db.parcels.delete_many({})
    await db.activity_log.delete_many({})
    state   = gl.default_game_state()
    parcels = gl.default_parcels()
    await db.game_state.insert_one(state.copy())
    for p in parcels:
        await db.parcels.insert_one(p.copy())
    await _log_activity("Nouvelle exploitation initialisée", "info", 1)
    return {"ok": True}

# ── PARCELS ───────────────────────────────────────────────────────────────────
@api_router.post("/parcels/{parcel_id}/buy")
async def buy_parcel(parcel_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    parcel = next((p for p in parcels if p["id"] == parcel_id), None)
    if not parcel:               raise HTTPException(404, "Parcelle introuvable")
    if parcel["owned"]:          raise HTTPException(400, "Parcelle déjà acquise")
    if state["cash"] < parcel["price"]: raise HTTPException(400, "Trésorerie insuffisante")
    state["cash"] -= parcel["price"]
    parcel["owned"] = True
    await _save_state(state)
    await _save_parcels([parcel])
    await _log_activity(f"Acquisition: {parcel['name']} (−{parcel['price']:.0f}€)", "purchase", state["day"])
    return {"ok": True, "parcel": parcel}

@api_router.post("/parcels/{parcel_id}/plant")
async def plant_crop(parcel_id: str, payload: PlantRequest):
    if payload.crop_type not in gl.CROP_CATALOG:
        raise HTTPException(400, "Type de culture inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)

    # Vérification niveau
    level_info    = gl.xp_to_level(state.get("xp", 0))
    level         = level_info["level"]
    crop_min_level = gl.CROP_CATALOG[payload.crop_type].get("min_level", 1)
    if level < crop_min_level:
        raise HTTPException(400, f"Niveau {crop_min_level} requis (vous êtes niveau {level})")

    # Vérification saison
    season_info   = gl.day_to_season_info(state["day"])
    out_of_season = not gl.is_crop_in_season(payload.crop_type, season_info["season_key"])

    parcel = next((p for p in parcels if p["id"] == parcel_id), None)
    if not parcel:          raise HTTPException(404, "Parcelle introuvable")
    if not parcel["owned"]: raise HTTPException(400, "Parcelle non détenue")
    if parcel["crop_type"]: raise HTTPException(400, "Une culture est déjà en place")

    crop = gl.CROP_CATALOG[payload.crop_type]
    cost = crop["seed_cost_per_ha"] * parcel["size_ha"]
    if state["cash"] < cost:
        raise HTTPException(400, "Trésorerie insuffisante pour les semences")

    state["cash"]          -= cost
    parcel["crop_type"]     = payload.crop_type
    parcel["planted_day"]   = state["day"]
    parcel["growth"]        = 0
    parcel["weed_level"]    = 0
    parcel["fertilizer_boost"] = 0
    parcel["soil_moisture"] = max(parcel["soil_moisture"], 55)
    parcel["expected_yield"] = round(crop["yield_per_ha"] * parcel["size_ha"], 2)
    _bump_stat(state, "plantings")

    await _save_state(state)
    await _save_parcels([parcel])
    await _log_activity(
        f"Semis {crop['name']} sur {parcel['name']} (−{cost:.0f}€)" + (" ⚠️ hors saison" if out_of_season else ""),
        "field", state["day"]
    )
    return {
        "ok": True, "parcel": parcel,
        "out_of_season":  out_of_season,
        "season_warning": f"⚠️ {crop['name']} hors saison — rendement -40%" if out_of_season else None
    }

@api_router.post("/parcels/{parcel_id}/harvest")
async def harvest(parcel_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    parcel = next((p for p in parcels if p["id"] == parcel_id), None)
    if not parcel:              raise HTTPException(404, "Parcelle introuvable")
    if not parcel["crop_type"]: raise HTTPException(400, "Aucune culture à récolter")
    if parcel["growth"] < 90:   raise HTTPException(400, "Culture pas encore mature")

    crop_type  = parcel["crop_type"]
    crop       = gl.CROP_CATALOG[crop_type]
    yield_tons = round(parcel["expected_yield"] * (parcel["growth"] / 100.0), 2)
    state["inventory"][crop_type] = state["inventory"].get(crop_type, 0.0) + yield_tons

    # XP pour la récolte
    state["xp"] = state.get("xp", 0) + 10

    parcel.update({"crop_type": None, "planted_day": None, "growth": 0,
                   "weed_level": 0, "fertilizer_boost": 0, "expected_yield": 0.0})
    _bump_stat(state, "harvests")
    await _save_state(state)
    await _save_parcels([parcel])
    await _log_activity(f"Récolte: {yield_tons:.1f} t de {crop['name']} sur {parcel['name']}", "harvest", state["day"])
    return {"ok": True, "harvested": yield_tons, "crop": crop_type, "xp_gained": 10}

@api_router.post("/parcels/{parcel_id}/irrigate")
async def irrigate(parcel_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    parcel = next((p for p in parcels if p["id"] == parcel_id), None)
    if not parcel or not parcel["owned"]: raise HTTPException(404, "Parcelle introuvable")
    needed = round(parcel["size_ha"] * 8.0, 1)
    if state["water"] < needed: raise HTTPException(400, f"Eau insuffisante (besoin {needed} m³)")
    state["water"] -= needed
    parcel["soil_moisture"] = min(100, parcel["soil_moisture"] + 45)
    _bump_stat(state, "irrigations")
    await _save_state(state)
    await _save_parcels([parcel])
    await _log_activity(f"Irrigation: {parcel['name']} (−{needed} m³)", "field", state["day"])
    return {"ok": True, "parcel": parcel}

@api_router.post("/parcels/{parcel_id}/fertilize")
async def fertilize(parcel_id: str, payload: FertilizeRequest):
    t            = payload.type
    resource_key = {"chemical": "fertilizer_chemical", "bio": "fertilizer_bio", "premium": "fertilizer_premium"}.get(t)
    if not resource_key: raise HTTPException(400, "Type d'engrais invalide")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    parcel = next((p for p in parcels if p["id"] == parcel_id), None)
    if not parcel or not parcel["owned"]: raise HTTPException(404, "Parcelle introuvable")
    needed = round(parcel["size_ha"] * 12.0, 1)
    if state[resource_key] < needed: raise HTTPException(400, f"Stock {resource_key} insuffisant")
    boost = {"chemical": 18, "bio": 12, "premium": 28}[t]
    state[resource_key] -= needed
    parcel["fertilizer_boost"] = min(40, parcel["fertilizer_boost"] + boost)
    _bump_stat(state, "fertilizations")
    await _save_state(state)
    await _save_parcels([parcel])
    await _log_activity(f"Fertilisation {t}: {parcel['name']} (+{boost}%)", "field", state["day"])
    return {"ok": True, "parcel": parcel}

@api_router.post("/parcels/{parcel_id}/herbicide")
async def herbicide(parcel_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    parcel = next((p for p in parcels if p["id"] == parcel_id), None)
    if not parcel or not parcel["owned"]: raise HTTPException(404, "Parcelle introuvable")
    needed = round(parcel["size_ha"] * 0.8, 1)
    if state["herbicide"] < needed: raise HTTPException(400, f"Herbicide insuffisant (besoin {needed} L)")
    state["herbicide"] -= needed
    parcel["weed_level"] = max(0, parcel["weed_level"] - 70)
    await _save_state(state)
    await _save_parcels([parcel])
    await _log_activity(f"Herbicide: {parcel['name']}", "field", state["day"])
    return {"ok": True, "parcel": parcel}

# ── RESOURCES ─────────────────────────────────────────────────────────────────
@api_router.post("/resources/buy")
async def buy_resource(payload: BuyResourceRequest):
    if payload.resource not in gl.RESOURCE_CATALOG: raise HTTPException(400, "Ressource inconnue")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    res        = gl.RESOURCE_CATALOG[payload.resource]
    unit_price = gl.resource_market_price(payload.resource, state["weather"])
    # Réduction station carburant
    if payload.resource == "fuel" and gl.has_upgrade(state, "fuel_station"):
        unit_price *= 0.85
    total_qty  = res["pack"] * payload.packs
    total_cost = round(unit_price * total_qty, 2)
    if state["cash"] < total_cost: raise HTTPException(400, "Trésorerie insuffisante")
    state["cash"]           -= total_cost
    state[payload.resource]  = state.get(payload.resource, 0.0) + total_qty
    if payload.resource == "water":
        _bump_stat(state, "water_purchased", total_qty)
    else:
        gl.update_mission_progress(state)
    await _save_state(state)
    await _log_activity(f"Achat {res['name']}: +{total_qty} {res['unit']} (−{total_cost:.0f}€)", "purchase", state["day"])
    return {"ok": True, "new_balance": state["cash"], "added_qty": total_qty}

# ── MARKET ────────────────────────────────────────────────────────────────────
@api_router.post("/market/sell")
async def sell_inventory(payload: SellRequest):
    valid = {**gl.CROP_CATALOG, **gl.LIVESTOCK_PRODUCTS}
    if payload.crop not in valid: raise HTTPException(400, "Produit inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    have = state["inventory"].get(payload.crop, 0.0)
    if have < payload.qty: raise HTTPException(400, f"Stock insuffisant ({have:.1f} disponible)")
    price   = gl.crop_market_price(payload.crop, state["market_multipliers"]) if payload.crop in gl.CROP_CATALOG else gl.LIVESTOCK_PRODUCTS[payload.crop]["base_price"]
    revenue = round(price * payload.qty, 2)
    state["inventory"][payload.crop] = round(have - payload.qty, 2)
    state["cash"] += revenue
    state["xp"]    = state.get("xp", 0) + max(1, int(payload.qty))
    _bump_stat(state, "sells_qty", payload.qty)
    await _save_state(state)
    name = gl.CROP_CATALOG[payload.crop]["name"] if payload.crop in gl.CROP_CATALOG else gl.LIVESTOCK_PRODUCTS[payload.crop]["name"]
    await _log_activity(f"Vente: {payload.qty:.1f} {name} (+{revenue:.0f}€)", "sale", state["day"])
    return {"ok": True, "revenue": revenue, "new_cash": state["cash"]}

@api_router.post("/contracts/{contract_id}/fulfill")
async def fulfill_contract(contract_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    contracts = gl.generate_contracts(state)
    contract  = next((c for c in contracts if c["id"] == contract_id), None)
    if not contract: raise HTTPException(404, "Contrat indisponible")
    have = state["inventory"].get(contract["crop"], 0.0)
    if have < contract["qty"]: raise HTTPException(400, f"Stock insuffisant ({have:.1f} t / {contract['qty']} t requis)")
    # Bonus réfrigération
    bonus = 1.10 if gl.has_upgrade(state, "refrigeration") else 1.0
    revenue = round(contract["total_value"] * bonus, 2)
    state["inventory"][contract["crop"]] = round(have - contract["qty"], 2)
    state["cash"] += revenue
    state["xp"]    = state.get("xp", 0) + 25
    _bump_stat(state, "contracts_fulfilled")
    _bump_stat(state, "sells_qty", contract["qty"])
    await _save_state(state)
    await _log_activity(f"Contrat: {contract['qty']} t {contract['crop_name']} (+{revenue:.0f}€)", "sale", state["day"])
    return {"ok": True, "revenue": revenue}

# ── LIVESTOCK ─────────────────────────────────────────────────────────────────
@api_router.post("/livestock/buy")
async def buy_livestock(payload: BuyLivestockRequest):
    if payload.type not in gl.LIVESTOCK_CATALOG: raise HTTPException(400, "Type d'animal inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    level_info = gl.xp_to_level(state.get("xp", 0))
    min_level  = gl.LIVESTOCK_CATALOG[payload.type].get("min_level", 1)
    if level_info["level"] < min_level:
        raise HTTPException(400, f"Niveau {min_level} requis (vous êtes niveau {level_info['level']})")
    cat   = gl.LIVESTOCK_CATALOG[payload.type]
    total = cat["buy_price"] * payload.count
    if state["cash"] < total: raise HTTPException(400, "Trésorerie insuffisante")
    state["cash"] -= total
    herd = {"id": f"herd-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            "type": payload.type, "count": payload.count, "health": 100,
            "last_vet_day": state["day"], "last_production": 0.0, "acquired_day": state["day"]}
    state.setdefault("livestock", []).append(herd)
    await _save_state(state)
    await _log_activity(f"Achat: {payload.count}x {cat['name']} (−{total:.0f}€)", "purchase", state["day"])
    return {"ok": True, "herd": herd, "new_cash": state["cash"]}

@api_router.post("/livestock/{herd_id}/vet")
async def vet_livestock(herd_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    herd = next((h for h in state.get("livestock", []) if h["id"] == herd_id), None)
    if not herd: raise HTTPException(404, "Troupeau introuvable")
    cat      = gl.LIVESTOCK_CATALOG[herd["type"]]
    vet_cost = round(cat["buy_price"] * 0.08 * herd["count"], 0)
    if state["cash"] < vet_cost: raise HTTPException(400, f"Insuffisant (soin: {vet_cost}€)")
    state["cash"] -= vet_cost
    herd["health"]       = 100
    herd["last_vet_day"] = state["day"]
    await _save_state(state)
    await _log_activity(f"Soins vétérinaires: {cat['name']} x{herd['count']} (−{vet_cost:.0f}€)", "info", state["day"])
    return {"ok": True, "herd": herd, "new_cash": state["cash"]}

@api_router.post("/livestock/{herd_id}/sell")
async def sell_livestock(herd_id: str, payload: SellLivestockRequest):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    herd = next((h for h in state.get("livestock", []) if h["id"] == herd_id), None)
    if not herd: raise HTTPException(404, "Troupeau introuvable")
    if payload.count > herd["count"]: raise HTTPException(400, f"Seulement {herd['count']} animaux disponibles")
    cat     = gl.LIVESTOCK_CATALOG[herd["type"]]
    revenue = round(cat["buy_price"] * cat["resell"] * payload.count, 0)
    state["cash"] += revenue
    herd["count"] -= payload.count
    if herd["count"] == 0:
        state["livestock"] = [h for h in state["livestock"] if h["id"] != herd_id]
    await _save_state(state)
    await _log_activity(f"Vente bétail: {payload.count}x {cat['name']} (+{revenue:.0f}€)", "sale", state["day"])
    return {"ok": True, "revenue": revenue, "new_cash": state["cash"]}

# ── VEHICLES ──────────────────────────────────────────────────────────────────
@api_router.post("/vehicles/buy")
async def buy_vehicle(payload: BuyVehicleRequest):
    if payload.type not in gl.VEHICLE_CATALOG: raise HTTPException(400, "Véhicule inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    level_info = gl.xp_to_level(state.get("xp", 0))
    min_level  = gl.VEHICLE_CATALOG[payload.type].get("min_level", 1)
    if level_info["level"] < min_level:
        raise HTTPException(400, f"Niveau {min_level} requis (vous êtes niveau {level_info['level']})")
    cat = gl.VEHICLE_CATALOG[payload.type]
    if state["cash"] < cat["buy_price"]: raise HTTPException(400, "Trésorerie insuffisante")
    state["cash"] -= cat["buy_price"]
    vehicle = {"id": f"veh-{int(datetime.now(timezone.utc).timestamp()*1000)}",
               "type": payload.type, "condition": 100, "status": "working", "acquired_day": state["day"]}
    state.setdefault("vehicles", []).append(vehicle)
    await _save_state(state)
    await _log_activity(f"Achat véhicule: {cat['name']} (−{cat['buy_price']:.0f}€)", "purchase", state["day"])
    return {"ok": True, "vehicle": vehicle, "new_cash": state["cash"]}

@api_router.post("/vehicles/{vehicle_id}/repair")
async def repair_vehicle(vehicle_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    veh = next((v for v in state.get("vehicles", []) if v["id"] == vehicle_id), None)
    if not veh: raise HTTPException(404, "Véhicule introuvable")
    cat    = gl.VEHICLE_CATALOG[veh["type"]]
    damage = 100 - veh.get("condition", 100)
    if damage == 0: raise HTTPException(400, "Véhicule déjà en parfait état")
    cost   = round(cat["buy_price"] * 0.005 * damage * (0.5 if gl.has_upgrade(state, "mechanic_shop") else 1.0), 0)
    if state["cash"] < cost: raise HTTPException(400, f"Insuffisant (coût: {cost}€)")
    state["cash"] -= cost
    veh["condition"] = 100
    veh["status"]    = "working"
    await _save_state(state)
    await _log_activity(f"Réparation: {cat['name']} (−{cost:.0f}€)", "info", state["day"])
    return {"ok": True, "vehicle": veh, "new_cash": state["cash"]}

@api_router.post("/vehicles/{vehicle_id}/sell")
async def sell_vehicle(vehicle_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    veh = next((v for v in state.get("vehicles", []) if v["id"] == vehicle_id), None)
    if not veh: raise HTTPException(404, "Véhicule introuvable")
    cat     = gl.VEHICLE_CATALOG[veh["type"]]
    revenue = round(cat["buy_price"] * 0.45 * (veh.get("condition", 100) / 100), 0)
    state["cash"] += revenue
    state["vehicles"] = [v for v in state["vehicles"] if v["id"] != vehicle_id]
    await _save_state(state)
    await _log_activity(f"Vente véhicule: {cat['name']} (+{revenue:.0f}€)", "sale", state["day"])
    return {"ok": True, "revenue": revenue, "new_cash": state["cash"]}

# ── EMPLOYEES ─────────────────────────────────────────────────────────────────
@api_router.post("/employees/hire")
async def hire_employee(payload: HireEmployeeRequest):
    if payload.role not in gl.EMPLOYEE_ROLES: raise HTTPException(400, "Rôle inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    role      = gl.EMPLOYEE_ROLES[payload.role]
    signup    = role["daily_salary"] * 3
    if state["cash"] < signup: raise HTTPException(400, f"Prime d'embauche insuffisante ({signup}€)")
    state["cash"] -= signup
    emp = {"id": f"emp-{int(datetime.now(timezone.utc).timestamp()*1000)}",
           "role": payload.role, "hired_day": state["day"]}
    state.setdefault("employees", []).append(emp)
    await _save_state(state)
    await _log_activity(f"Embauche: {role['name']} (prime −{signup:.0f}€)", "info", state["day"])
    return {"ok": True, "employee": emp, "new_cash": state["cash"]}

@api_router.post("/employees/{employee_id}/fire")
async def fire_employee(employee_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    emp = next((e for e in state.get("employees", []) if e["id"] == employee_id), None)
    if not emp: raise HTTPException(404, "Employé introuvable")
    role      = gl.EMPLOYEE_ROLES[emp["role"]]
    indemnity = role["daily_salary"] * 2
    if state["cash"] < indemnity: raise HTTPException(400, f"Indemnités insuffisantes ({indemnity}€)")
    state["cash"] -= indemnity
    state["employees"] = [e for e in state["employees"] if e["id"] != employee_id]
    await _save_state(state)
    await _log_activity(f"Licenciement: {role['name']} (indemnité −{indemnity:.0f}€)", "info", state["day"])
    return {"ok": True, "new_cash": state["cash"]}

# ── UPGRADES ──────────────────────────────────────────────────────────────────
@api_router.post("/upgrades/buy")
async def buy_upgrade(payload: BuyUpgradeRequest):
    if payload.key not in gl.UPGRADE_CATALOG: raise HTTPException(400, "Amélioration inconnue")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    if payload.key in (state.get("upgrades") or []): raise HTTPException(400, "Déjà achetée")
    cat        = gl.UPGRADE_CATALOG[payload.key]
    level_info = gl.xp_to_level(state.get("xp", 0))
    min_level  = cat.get("min_level", 1)
    if level_info["level"] < min_level:
        raise HTTPException(400, f"Niveau {min_level} requis (vous êtes niveau {level_info['level']})")
    if state["cash"] < cat["price"]: raise HTTPException(400, f"Insuffisant ({cat['price']}€)")
    state["cash"] -= cat["price"]
    state.setdefault("upgrades", []).append(payload.key)
    await _save_state(state)
    await _log_activity(f"Amélioration: {cat['name']} (−{cat['price']:.0f}€)", "purchase", state["day"])
    return {"ok": True, "new_cash": state["cash"]}

# ── ANALYTICS & MISSIONS ──────────────────────────────────────────────────────
@api_router.get("/analytics")
async def analytics():
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    season_info = gl.day_to_season_info(state["day"])
    return {"history": state.get("history", []), "inventory": state["inventory"],
            "cash": state["cash"], "day": state["day"], "season": season_info}

@api_router.post("/missions/{instance_id}/claim")
async def claim_mission(instance_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    mission = next((m for m in state.get("daily_missions", []) if m["instance_id"] == instance_id), None)
    if not mission:              raise HTTPException(404, "Mission introuvable")
    if mission.get("claimed"):   raise HTTPException(400, "Récompense déjà réclamée")
    if not mission.get("completed"): raise HTTPException(400, "Mission non complétée")
    state["cash"]            += mission.get("cash", 0)
    state["xp"]               = state.get("xp", 0) + mission.get("xp", 0)
    state["premium_credits"]  = state.get("premium_credits", 0) + mission.get("credits", 0)
    mission["claimed"] = True
    level_info   = gl.xp_to_level(state["xp"])
    new_cosmetic = None
    owned_ids    = {c.get("id") for c in state.get("cosmetics", [])}
    for lvl, cos in gl.COSMETIC_UNLOCKS.items():
        if level_info["level"] >= lvl and cos["id"] not in owned_ids:
            state.setdefault("cosmetics", []).append({**cos, "unlocked_at_level": lvl})
            new_cosmetic = cos
    await _save_state(state)
    await _log_activity(f"Mission: {mission['title']} (+{mission.get('xp',0)} XP)", "info", state["day"])
    return {"ok": True, "rewards": {"xp": mission.get("xp",0), "cash": mission.get("cash",0),
            "credits": mission.get("credits",0), "cosmetic": new_cosmetic}, "level": level_info}

app.include_router(api_router)

@api_router.post("/livestock/{herd_id}/vet")
async def vet_livestock(herd_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    herd = next((h for h in state.get("livestock", []) if h["id"] == herd_id), None)
    if not herd: raise HTTPException(404, "Troupeau introuvable")
    cat      = gl.LIVESTOCK_CATALOG[herd["type"]]
    vet_cost = round(cat["buy_price"] * 0.08 * herd["count"], 0)
    if state["cash"] < vet_cost: raise HTTPException(400, f"Insuffisant (soin: {vet_cost}€)")
    state["cash"] -= vet_cost
    herd["health"]       = 100
    herd["last_vet_day"] = state["day"]
    await _save_state(state)
    await _log_activity(f"Soins vétérinaires: {cat['name']} x{herd['count']} (−{vet_cost:.0f}€)", "info", state["day"])
    return {"ok": True, "herd": herd, "new_cash": state["cash"]}

@api_router.post("/livestock/{herd_id}/sell")
async def sell_livestock(herd_id: str, payload: SellLivestockRequest):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    herd = next((h for h in state.get("livestock", []) if h["id"] == herd_id), None)
    if not herd: raise HTTPException(404, "Troupeau introuvable")
    if payload.count > herd["count"]: raise HTTPException(400, f"Seulement {herd['count']} animaux disponibles")
    cat     = gl.LIVESTOCK_CATALOG[herd["type"]]
    revenue = round(cat["buy_price"] * cat["resell"] * payload.count, 0)
    state["cash"] += revenue
    herd["count"] -= payload.count
    if herd["count"] == 0:
        state["livestock"] = [h for h in state["livestock"] if h["id"] != herd_id]
    await _save_state(state)
    await _log_activity(f"Vente bétail: {payload.count}x {cat['name']} (+{revenue:.0f}€)", "sale", state["day"])
    return {"ok": True, "revenue": revenue, "new_cash": state["cash"]}

# ── VEHICLES ──────────────────────────────────────────────────────────────────
@api_router.post("/vehicles/buy")
async def buy_vehicle(payload: BuyVehicleRequest):
    if payload.type not in gl.VEHICLE_CATALOG: raise HTTPException(400, "Véhicule inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    level_info = gl.xp_to_level(state.get("xp", 0))
    min_level  = gl.VEHICLE_CATALOG[payload.type].get("min_level", 1)
    if level_info["level"] < min_level:
        raise HTTPException(400, f"Niveau {min_level} requis (vous êtes niveau {level_info['level']})")
    cat = gl.VEHICLE_CATALOG[payload.type]
    if state["cash"] < cat["buy_price"]: raise HTTPException(400, "Trésorerie insuffisante")
    state["cash"] -= cat["buy_price"]
    vehicle = {"id": f"veh-{int(datetime.now(timezone.utc).timestamp()*1000)}",
               "type": payload.type, "condition": 100, "status": "working", "acquired_day": state["day"]}
    state.setdefault("vehicles", []).append(vehicle)
    await _save_state(state)
    await _log_activity(f"Achat véhicule: {cat['name']} (−{cat['buy_price']:.0f}€)", "purchase", state["day"])
    return {"ok": True, "vehicle": vehicle, "new_cash": state["cash"]}

@api_router.post("/vehicles/{vehicle_id}/repair")
async def repair_vehicle(vehicle_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    veh = next((v for v in state.get("vehicles", []) if v["id"] == vehicle_id), None)
    if not veh: raise HTTPException(404, "Véhicule introuvable")
    cat    = gl.VEHICLE_CATALOG[veh["type"]]
    damage = 100 - veh.get("condition", 100)
    if damage == 0: raise HTTPException(400, "Véhicule déjà en parfait état")
    cost   = round(cat["buy_price"] * 0.005 * damage * (0.5 if gl.has_upgrade(state, "mechanic_shop") else 1.0), 0)
    if state["cash"] < cost: raise HTTPException(400, f"Insuffisant (coût: {cost}€)")
    state["cash"] -= cost
    veh["condition"] = 100
    veh["status"]    = "working"
    await _save_state(state)
    await _log_activity(f"Réparation: {cat['name']} (−{cost:.0f}€)", "info", state["day"])
    return {"ok": True, "vehicle": veh, "new_cash": state["cash"]}

@api_router.post("/vehicles/{vehicle_id}/sell")
async def sell_vehicle(vehicle_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    veh = next((v for v in state.get("vehicles", []) if v["id"] == vehicle_id), None)
    if not veh: raise HTTPException(404, "Véhicule introuvable")
    cat     = gl.VEHICLE_CATALOG[veh["type"]]
    revenue = round(cat["buy_price"] * 0.45 * (veh.get("condition", 100) / 100), 0)
    state["cash"] += revenue
    state["vehicles"] = [v for v in state["vehicles"] if v["id"] != vehicle_id]
    await _save_state(state)
    await _log_activity(f"Vente véhicule: {cat['name']} (+{revenue:.0f}€)", "sale", state["day"])
    return {"ok": True, "revenue": revenue, "new_cash": state["cash"]}

# ── EMPLOYEES ─────────────────────────────────────────────────────────────────
@api_router.post("/employees/hire")
async def hire_employee(payload: HireEmployeeRequest):
    if payload.role not in gl.EMPLOYEE_ROLES: raise HTTPException(400, "Rôle inconnu")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    role   = gl.EMPLOYEE_ROLES[payload.role]
    signup = role["daily_salary"] * 3
    if state["cash"] < signup: raise HTTPException(400, f"Prime d'embauche insuffisante ({signup}€)")
    state["cash"] -= signup
    emp = {"id": f"emp-{int(datetime.now(timezone.utc).timestamp()*1000)}",
           "role": payload.role, "hired_day": state["day"]}
    state.setdefault("employees", []).append(emp)
    await _save_state(state)
    await _log_activity(f"Embauche: {role['name']} (prime −{signup:.0f}€)", "info", state["day"])
    return {"ok": True, "employee": emp, "new_cash": state["cash"]}

@api_router.post("/employees/{employee_id}/fire")
async def fire_employee(employee_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    emp = next((e for e in state.get("employees", []) if e["id"] == employee_id), None)
    if not emp: raise HTTPException(404, "Employé introuvable")
    role      = gl.EMPLOYEE_ROLES[emp["role"]]
    indemnity = role["daily_salary"] * 2
    if state["cash"] < indemnity: raise HTTPException(400, f"Indemnités insuffisantes ({indemnity}€)")
    state["cash"] -= indemnity
    state["employees"] = [e for e in state["employees"] if e["id"] != employee_id]
    await _save_state(state)
    await _log_activity(f"Licenciement: {role['name']} (indemnité −{indemnity:.0f}€)", "info", state["day"])
    return {"ok": True, "new_cash": state["cash"]}

# ── UPGRADES ──────────────────────────────────────────────────────────────────
@api_router.post("/upgrades/buy")
async def buy_upgrade(payload: BuyUpgradeRequest):
    if payload.key not in gl.UPGRADE_CATALOG: raise HTTPException(400, "Amélioration inconnue")
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    if payload.key in (state.get("upgrades") or []): raise HTTPException(400, "Déjà achetée")
    cat        = gl.UPGRADE_CATALOG[payload.key]
    level_info = gl.xp_to_level(state.get("xp", 0))
    min_level  = cat.get("min_level", 1)
    if level_info["level"] < min_level:
        raise HTTPException(400, f"Niveau {min_level} requis (vous êtes niveau {level_info['level']})")
    if state["cash"] < cat["price"]: raise HTTPException(400, f"Insuffisant ({cat['price']}€)")
    state["cash"] -= cat["price"]
    state.setdefault("upgrades", []).append(payload.key)
    await _save_state(state)
    await _log_activity(f"Amélioration: {cat['name']} (−{cat['price']:.0f}€)", "purchase", state["day"])
    return {"ok": True, "new_cash": state["cash"]}

# ── ANALYTICS & MISSIONS ──────────────────────────────────────────────────────
@api_router.get("/analytics")
async def analytics():
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    season_info = gl.day_to_season_info(state["day"])
    return {"history": state.get("history", []), "inventory": state["inventory"],
            "cash": state["cash"], "day": state["day"], "season": season_info}

@api_router.post("/missions/{instance_id}/claim")
async def claim_mission(instance_id: str):
    state   = await _load_state()
    parcels = await _load_parcels()
    state, parcels, _ = await _auto_tick(state, parcels)
    mission = next((m for m in state.get("daily_missions", []) if m["instance_id"] == instance_id), None)
    if not mission:                  raise HTTPException(404, "Mission introuvable")
    if mission.get("claimed"):       raise HTTPException(400, "Récompense déjà réclamée")
    if not mission.get("completed"): raise HTTPException(400, "Mission non complétée")
    state["cash"]           += mission.get("cash", 0)
    state["xp"]              = state.get("xp", 0) + mission.get("xp", 0)
    state["premium_credits"] = state.get("premium_credits", 0) + mission.get("credits", 0)
    mission["claimed"] = True
    level_info   = gl.xp_to_level(state["xp"])
    new_cosmetic = None
    owned_ids    = {c.get("id") for c in state.get("cosmetics", [])}
    for lvl, cos in gl.COSMETIC_UNLOCKS.items():
        if level_info["level"] >= lvl and cos["id"] not in owned_ids:
            state.setdefault("cosmetics", []).append({**cos, "unlocked_at_level": lvl})
            new_cosmetic = cos
    await _save_state(state)
    await _log_activity(f"Mission: {mission['title']} (+{mission.get('xp',0)} XP)", "info", state["day"])
    return {"ok": True, "rewards": {"xp": mission.get("xp",0), "cash": mission.get("cash",0),
            "credits": mission.get("credits",0), "cosmetic": new_cosmetic}, "level": level_info}

# ── AUTH (Phase 1) ────────────────────────────────────────────────────────────
import auth as auth_module

auth_module.init_auth(db)
api_router.include_router(auth_module.auth_router)

@app.on_event("startup")
async def _ensure_indexes() -> None:
    """Crée les index nécessaires au multi-tenant (idempotent)."""
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"index users.email: {e}")

    # Wipe legacy single-tenant data: opt-in via env var pour éviter une perte
    # accidentelle au redéploiement. Mettre WIPE_LEGACY=1 une seule fois.
    if os.environ.get("WIPE_LEGACY") == "1":
        logger.warning("WIPE_LEGACY=1 — purge des collections game_state/parcels/activity_log")
        await db.game_state.delete_many({})
        await db.parcels.delete_many({})
        await db.activity_log.delete_many({})

app.include_router(api_router)
