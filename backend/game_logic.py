"""FarmTycoon game logic: tick processing, weather simulation, market pricing."""
from __future__ import annotations

import math
import random
from datetime import datetime, timezone
from typing import Any

# ── CONSTANTS ─────────────────────────────────────────────────────────────────
SECONDS_PER_GAME_DAY = 10
STARTING_CASH = 25000.0

# ── SAISONS ───────────────────────────────────────────────────────────────────
DAYS_PER_SEASON = 30
DAYS_PER_YEAR   = 120  # 4 saisons × 30 jours

SEASONS = {
    0: {"name": "Printemps", "key": "spring", "icon": "🌸", "weather_bias": "rainy",   "yield_mult": 1.10},
    1: {"name": "Été",       "key": "summer", "icon": "☀️",  "weather_bias": "sunny",   "yield_mult": 1.05},
    2: {"name": "Automne",   "key": "autumn", "icon": "🍂",  "weather_bias": "cloudy",  "yield_mult": 0.95},
    3: {"name": "Hiver",     "key": "winter", "icon": "❄️",  "weather_bias": "drought", "yield_mult": 0.70},
}

# Cultures autorisées par saison (None = toutes saisons)
CROP_SEASONS: dict[str, list[str]] = {
    "wheat":     ["spring", "autumn"],
    "corn":      ["summer"],
    "soy":       ["spring", "summer"],
    "barley":    ["spring", "autumn", "winter"],
    "sunflower": ["summer"],
}

def day_to_season_info(day: int) -> dict[str, Any]:
    """Retourne year, season_index, season_day, season_name depuis un numéro de jour."""
    day_zero = max(0, day - 1)
    year        = day_zero // DAYS_PER_YEAR + 1
    day_in_year = day_zero % DAYS_PER_YEAR
    season_idx  = day_in_year // DAYS_PER_SEASON
    season_day  = day_in_year % DAYS_PER_SEASON + 1
    season      = SEASONS[season_idx]
    return {
        "year":        year,
        "season_index": season_idx,
        "season_day":  season_day,
        "season_name": season["name"],
        "season_key":  season["key"],
        "season_icon": season["icon"],
        "display":     f"Année {year} — {season['name']} (Jour {season_day}/{DAYS_PER_SEASON})",
        "yield_mult":  season["yield_mult"],
    }

def is_crop_in_season(crop_type: str, season_key: str) -> bool:
    allowed = CROP_SEASONS.get(crop_type)
    if allowed is None:
        return True
    return season_key in allowed

# ── LEVEL SYSTEM ──────────────────────────────────────────────────────────────
# Contenu déverrouillé par niveau
LEVEL_UNLOCKS: dict[int, dict[str, Any]] = {
    1:  {"crops":     ["wheat", "barley"],          "desc": "Cultures de base"},
    3:  {"livestock": ["chicken"],                  "desc": "Élevage de poulets"},
    5:  {"crops":     ["corn"],
         "vehicles":  ["tractor_basic"],            "desc": "Maïs + Tracteur basique"},
    7:  {"crops":     ["soy", "sunflower"],         "desc": "Cultures premium"},
    8:  {"livestock": ["pig", "sheep"],             "desc": "Cochons et moutons"},
    10: {"livestock": ["cattle"],
         "vehicles":  ["tractor_premium", "irrigation_rig"], "desc": "Vaches laitières + véhicules premium"},
    12: {"vehicles":  ["harvester"],
         "upgrades":  ["genetic_program", "climate_control"], "desc": "Moissonneuse + upgrades avancées"},
    15: {"contracts": "export",                     "desc": "Contrats d'export internationaux"},
}

def get_unlocked_content(level: int) -> dict[str, list[str]]:
    """Retourne tout le contenu déverrouillé pour un niveau donné."""
    unlocked: dict[str, list] = {
        "crops": [], "livestock": [], "vehicles": [], "upgrades": [], "contracts": []
    }
    for req_level, content in LEVEL_UNLOCKS.items():
        if level >= req_level:
            for key, val in content.items():
                if key == "desc":
                    continue
                if isinstance(val, list):
                    unlocked.setdefault(key, []).extend(val)
                else:
                    unlocked.setdefault(key, []).append(val)
    return unlocked

def check_level_requirement(level: int, category: str, item: str) -> bool:
    """Vérifie si un item est accessible pour le niveau donné."""
    unlocked = get_unlocked_content(level)
    return item in unlocked.get(category, [])

# ── CATALOGS ──────────────────────────────────────────────────────────────────
CROP_CATALOG: dict[str, dict[str, Any]] = {
    "wheat":     {"name": "Blé",       "growth_days": 12, "yield_per_ha": 6.5,  "seed_cost_per_ha": 180.0, "base_price": 240.0, "water_need": 1.2, "fertilizer_need": 1.0, "min_level": 1},
    "corn":      {"name": "Maïs",      "growth_days": 16, "yield_per_ha": 9.0,  "seed_cost_per_ha": 260.0, "base_price": 210.0, "water_need": 1.5, "fertilizer_need": 1.2, "min_level": 5},
    "soy":       {"name": "Soja",      "growth_days": 14, "yield_per_ha": 3.2,  "seed_cost_per_ha": 220.0, "base_price": 460.0, "water_need": 1.0, "fertilizer_need": 0.9, "min_level": 7},
    "barley":    {"name": "Orge",      "growth_days": 10, "yield_per_ha": 5.8,  "seed_cost_per_ha": 150.0, "base_price": 200.0, "water_need": 1.0, "fertilizer_need": 0.8, "min_level": 1},
    "sunflower": {"name": "Tournesol", "growth_days": 18, "yield_per_ha": 2.8,  "seed_cost_per_ha": 200.0, "base_price": 520.0, "water_need": 0.8, "fertilizer_need": 0.7, "min_level": 7},
}

RESOURCE_CATALOG: dict[str, dict[str, Any]] = {
    "water":               {"name": "Eau",             "unit": "m³",  "base_price": 1.2,  "pack": 100},
    "fuel":                {"name": "Carburant",        "unit": "L",   "base_price": 1.85, "pack": 200},
    "electricity":         {"name": "Électricité",      "unit": "kWh", "base_price": 0.22, "pack": 500},
    "fertilizer_chemical": {"name": "Engrais chimique", "unit": "kg",  "base_price": 0.95, "pack": 100},
    "fertilizer_bio":      {"name": "Engrais bio",      "unit": "kg",  "base_price": 1.60, "pack": 100},
    "fertilizer_premium":  {"name": "Engrais premium",  "unit": "kg",  "base_price": 2.80, "pack": 100},
    "herbicide":           {"name": "Herbicide",        "unit": "L",   "base_price": 12.0, "pack": 20},
}

WEATHER_CONDITIONS = ["sunny", "cloudy", "rainy", "storm", "drought"]

LIVESTOCK_CATALOG: dict[str, dict[str, Any]] = {
    "cattle":  {"name": "Vache laitière",  "buy_price": 850,  "produces": "milk",  "daily_yield": 0.022, "feed_cost_per_day": 4.5,  "resell": 0.55, "vet_interval": 7,  "min_level": 10},
    "pig":     {"name": "Cochon",          "buy_price": 280,  "produces": "meat",  "daily_yield": 0.015, "feed_cost_per_day": 2.4,  "resell": 0.50, "vet_interval": 10, "min_level": 8},
    "chicken": {"name": "Poule pondeuse",  "buy_price": 18,   "produces": "eggs",  "daily_yield": 0.65,  "feed_cost_per_day": 0.18, "resell": 0.40, "vet_interval": 14, "min_level": 3},
    "sheep":   {"name": "Mouton",          "buy_price": 220,  "produces": "wool",  "daily_yield": 0.008, "feed_cost_per_day": 1.6,  "resell": 0.50, "vet_interval": 12, "min_level": 8},
}

LIVESTOCK_PRODUCTS: dict[str, dict[str, Any]] = {
    "milk": {"name": "Lait",   "unit": "L",   "base_price": 0.85},
    "eggs": {"name": "Œufs",   "unit": "u.",  "base_price": 0.28},
    "meat": {"name": "Viande", "unit": "kg",  "base_price": 8.5},
    "wool": {"name": "Laine",  "unit": "kg",  "base_price": 6.0},
}

VEHICLE_CATALOG: dict[str, dict[str, Any]] = {
    "tractor_basic":   {"name": "Tracteur Basique",       "buy_price": 8000,  "fuel_per_day_active": 12, "condition_per_day": 1.4, "bonus_growth": 0,  "bonus_yield": 0,  "bonus_water": 0,  "min_level": 5},
    "tractor_premium": {"name": "Tracteur Premium",        "buy_price": 22000, "fuel_per_day_active": 8,  "condition_per_day": 0.6, "bonus_growth": 8,  "bonus_yield": 5,  "bonus_water": 0,  "min_level": 10},
    "harvester":       {"name": "Moissonneuse-batteuse",   "buy_price": 32000, "fuel_per_day_active": 18, "condition_per_day": 1.0, "bonus_growth": 0,  "bonus_yield": 12, "bonus_water": 0,  "min_level": 12},
    "irrigation_rig":  {"name": "Système d'irrigation",    "buy_price": 12000, "fuel_per_day_active": 4,  "condition_per_day": 0.4, "bonus_growth": 0,  "bonus_yield": 0,  "bonus_water": 30, "min_level": 10},
}

EMPLOYEE_ROLES: dict[str, dict[str, Any]] = {
    "field_hand": {"name": "Ouvrier agricole", "daily_salary": 80,  "effect": "growth_bonus",     "effect_value": 6,   "desc": "Boost la vitesse de croissance des cultures (+6%/employé)."},
    "mechanic":   {"name": "Mécanicien",       "daily_salary": 110, "effect": "vehicle_save",     "effect_value": 50,  "desc": "Réduit l'usure des véhicules (-50%/employé, max 1)."},
    "vet":        {"name": "Vétérinaire",      "daily_salary": 130, "effect": "livestock_health", "effect_value": 100, "desc": "Soigne automatiquement le bétail chaque jour."},
    "driver":     {"name": "Chauffeur",        "daily_salary": 95,  "effect": "fuel_save",        "effect_value": 15,  "desc": "Réduit la consommation de carburant (-15%/employé, max 1)."},
}

UPGRADE_CATALOG: dict[str, dict[str, Any]] = {
    "smart_sensors":   {"name": "Capteurs intelligents",    "price": 5000,  "cat": "field",     "min_level": 1,  "effect": "Réduit la pousse des mauvaises herbes (-50%)."},
    "auto_irrigation": {"name": "Irrigation automatique",   "price": 10000, "cat": "field",     "min_level": 5,  "effect": "Irrigation auto. quand l'humidité du sol < 30%."},
    "drainage_system": {"name": "Système de drainage",      "price": 4500,  "cat": "field",     "min_level": 3,  "effect": "Protège les cultures pendant les tempêtes."},
    "refrigeration":   {"name": "Réfrigération entrepôt",   "price": 8000,  "cat": "warehouse", "min_level": 5,  "effect": "Prime sur les contrats: +10%."},
    "security":        {"name": "Sécurité renforcée",       "price": 3500,  "cat": "warehouse", "min_level": 3,  "effect": "Réduit les pertes aléatoires."},
    "smart_storage":   {"name": "Stockage intelligent",     "price": 6500,  "cat": "warehouse", "min_level": 7,  "effect": "Inventaire mieux organisé."},
    "auto_feeder":     {"name": "Alimentation automatique", "price": 5500,  "cat": "livestock", "min_level": 5,  "effect": "Coût d'alimentation -25%."},
    "climate_control": {"name": "Climatisation bâtiment",   "price": 7500,  "cat": "livestock", "min_level": 12, "effect": "Le bétail résiste aux tempêtes et sécheresses."},
    "genetic_program": {"name": "Programme génétique",      "price": 12000, "cat": "livestock", "min_level": 12, "effect": "+15% de rendement animal."},
    "mechanic_shop":   {"name": "Atelier mécanique",        "price": 8500,  "cat": "garage",    "min_level": 7,  "effect": "Réparations -50% du coût."},
    "fuel_station":    {"name": "Station carburant",        "price": 11000, "cat": "garage",    "min_level": 8,  "effect": "Carburant -15% à l'achat."},
    "premium_parts":   {"name": "Pièces premium",           "price": 6000,  "cat": "garage",    "min_level": 10, "effect": "Véhicules -30% d'usure."},
}

# ── HELPERS ───────────────────────────────────────────────────────────────────
def has_upgrade(state: dict[str, Any], key: str) -> bool:
    return key in (state.get("upgrades") or [])

def count_employees(state: dict[str, Any], role: str) -> int:
    return sum(1 for e in (state.get("employees") or []) if e.get("role") == role)

# ── XP / LEVEL ────────────────────────────────────────────────────────────────
def xp_to_level(xp: int) -> dict[str, Any]:
    thresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]
    while thresholds[-1] < xp + 1:
        thresholds.append(thresholds[-1] + (thresholds[-1] - thresholds[-2]) + 50)
    level = 1
    for i, t in enumerate(thresholds):
        if xp >= t:
            level = i + 1
    base = thresholds[level - 1]
    nxt  = thresholds[level] if level < len(thresholds) else base + 500
    in_lvl = xp - base
    span   = max(1, nxt - base)
    unlocked = get_unlocked_content(level)
    next_unlock = None
    for req_lv, content in sorted(LEVEL_UNLOCKS.items()):
        if req_lv > level:
            next_unlock = {"level": req_lv, "desc": content.get("desc", "")}
            break
    return {
        "level":        level,
        "xp":           xp,
        "xp_in_level":  in_lvl,
        "xp_for_next":  nxt,
        "xp_to_next":   max(0, nxt - xp),
        "progress_pct": round(min(100, (in_lvl / span) * 100), 1),
        "unlocked":     unlocked,
        "next_unlock":  next_unlock,
    }

# ── MISSIONS ──────────────────────────────────────────────────────────────────
MISSION_POOL: list[dict[str, Any]] = [
    {"id": "harvest_2",  "title": "Récolter 2 parcelles",  "desc": "Apportez 2 cultures à maturité.",    "stat": "harvests",            "target": 2,    "xp": 30, "cash": 60,  "credits": 0, "unit": "récoltes"},
    {"id": "harvest_3",  "title": "Récolter 3 parcelles",  "desc": "Bouclez 3 récoltes aujourd'hui.",    "stat": "harvests",            "target": 3,    "xp": 60, "cash": 120, "credits": 1, "unit": "récoltes"},
    {"id": "sell_3t",    "title": "Vendre 3 tonnes",        "desc": "Écoulez 3 tonnes au marché.",         "stat": "sells_qty",           "target": 3.0,  "xp": 40, "cash": 80,  "credits": 0, "unit": "t"},
    {"id": "sell_8t",    "title": "Gros volume: 8 tonnes",  "desc": "Vendez 8 tonnes.",                    "stat": "sells_qty",           "target": 8.0,  "xp": 80, "cash": 200, "credits": 2, "unit": "t"},
    {"id": "contract_1", "title": "Honorer 1 contrat",      "desc": "Exécutez un contrat avec prime.",     "stat": "contracts_fulfilled", "target": 1,    "xp": 70, "cash": 0,   "credits": 1, "unit": "contrat"},
    {"id": "fert_2",     "title": "Fertiliser 2 parcelles", "desc": "Boostez 2 parcelles avec un engrais.","stat": "fertilizations",      "target": 2,    "xp": 30, "cash": 60,  "credits": 0, "unit": "fertilisations"},
    {"id": "irrigate_3", "title": "Irriguer 3 parcelles",   "desc": "Maintenez vos sols hydratés.",        "stat": "irrigations",         "target": 3,    "xp": 40, "cash": 80,  "credits": 0, "unit": "irrigations"},
    {"id": "plant_2",    "title": "Semer 2 parcelles",      "desc": "Lancez 2 nouveaux semis.",            "stat": "plantings",           "target": 2,    "xp": 35, "cash": 70,  "credits": 0, "unit": "semis"},
    {"id": "save_water", "title": "Économiser l'eau",        "desc": "Max 100 m³ d'eau achetés.",           "stat": "water_purchased",     "target": 100,  "xp": 50, "cash": 100, "credits": 1, "unit": "m³", "reverse": True},
]

COSMETIC_UNLOCKS: dict[int, dict[str, str]] = {
    3:  {"id": "theme_classic",    "name": "Thème Classique",        "kind": "theme"},
    5:  {"id": "theme_emerald",    "name": "Thème Émeraude",         "kind": "theme"},
    8:  {"id": "theme_terracotta", "name": "Thème Terracotta",       "kind": "theme"},
    12: {"id": "theme_midnight",   "name": "Thème Midnight",         "kind": "theme"},
    18: {"id": "banner_harvest",   "name": "Bannière Récolte d'Or",  "kind": "banner"},
}

def empty_day_stats() -> dict[str, float]:
    return {"harvests": 0, "sells_qty": 0.0, "contracts_fulfilled": 0,
            "fertilizations": 0, "irrigations": 0, "plantings": 0, "water_purchased": 0.0}

def generate_daily_missions(day: int) -> list[dict[str, Any]]:
    """
    3 missions générées tous les 3 jours (pas chaque jour).
    Le joueur a 3 jours pour les compléter.
    """
    # Groupe de 3 jours : jour 1-3 = groupe 1, jour 4-6 = groupe 2, etc.
    mission_group = (day - 1) // 3
    rng   = random.Random(mission_group * 1009 + 7)
    picks = rng.sample(MISSION_POOL, 3)
    return [
        {
            **m,
            "instance_id": f"mission-{mission_group}-{m['id']}",
            "progress":    0.0,
            "claimed":     False,
            "completed":   False,
            "expires_day": (mission_group + 1) * 3 + 1,  # expire après 3 jours
        }
        for m in picks
    ]

def update_mission_progress(state: dict[str, Any]) -> None:
    stats = state.get("day_stats", empty_day_stats())
    for m in state.get("daily_missions", []):
        cur = stats.get(m["stat"], 0)
        m["progress"] = cur
        if m.get("reverse"):
            m["completed"] = False
        else:
            m["completed"] = cur >= m["target"]

def _finalize_passive_missions(state: dict[str, Any]) -> None:
    stats = state.get("day_stats", empty_day_stats())
    for m in state.get("daily_missions", []):
        if m.get("reverse") and not m.get("claimed"):
            m["completed"] = stats.get(m["stat"], 0) <= m["target"]

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def parse_tick_datetime(value: Any) -> datetime | None:
    """Normalise last_tick_at depuis MongoDB (Date) ou ancien ISO string."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None

# ── DEFAULT STATE ─────────────────────────────────────────────────────────────
def default_game_state() -> dict[str, Any]:
    ts = now_utc()
    return {
        "id": "global",
        "cash": STARTING_CASH,
        "day": 1,
        "last_tick_at": ts,
        "created_at": ts.isoformat(),
        "water": 500.0, "fuel": 300.0, "electricity": 1000.0,
        "fertilizer_chemical": 200.0, "fertilizer_bio": 0.0,
        "fertilizer_premium": 0.0, "herbicide": 30.0,
        "inventory": {**{k: 0.0 for k in CROP_CATALOG}, **{k: 0.0 for k in LIVESTOCK_PRODUCTS}},
        "vehicles": [], "livestock": [], "employees": [], "upgrades": [],
        "premium_active": False, "premium_credits": 0,
        "weather": {"condition": "sunny", "temperature_c": 22, "humidity": 55, "wind_kmh": 8, "drought_index": 0.2},
        "market_multipliers": {k: 1.0 for k in CROP_CATALOG},
        "history": [],
        "day_revenue": 0.0, "day_expenses": 0.0,
        "xp": 0, "cosmetics": [],
        "day_stats": empty_day_stats(),
        "daily_missions": generate_daily_missions(1),
    }

def default_parcels() -> list[dict[str, Any]]:
    seeds = [
        {"name": "Parcelle Est",       "size_ha": 8.0,  "fertility": 78, "water_access": 70, "climate": "temperate", "price": 12000, "owned": True},
        {"name": "Parcelle Sud",       "size_ha": 6.5,  "fertility": 65, "water_access": 60, "climate": "temperate", "price": 9500,  "owned": True},
        {"name": "Plaine Nord",        "size_ha": 14.0, "fertility": 82, "water_access": 75, "climate": "humid",     "price": 24000, "owned": False},
        {"name": "Versant Ouest",      "size_ha": 5.0,  "fertility": 55, "water_access": 45, "climate": "arid",      "price": 6500,  "owned": False},
        {"name": "Vallée Verte",       "size_ha": 18.0, "fertility": 88, "water_access": 85, "climate": "humid",     "price": 34000, "owned": False},
        {"name": "Coteau Sablonneux",  "size_ha": 4.5,  "fertility": 48, "water_access": 35, "climate": "arid",      "price": 5200,  "owned": False},
        {"name": "Grand Champ",        "size_ha": 22.0, "fertility": 72, "water_access": 65, "climate": "temperate", "price": 32000, "owned": False},
        {"name": "Pré Fleuri",         "size_ha": 9.5,  "fertility": 70, "water_access": 72, "climate": "temperate", "price": 15000, "owned": False},
    ]
    return [{"id": f"parcel-{i+1:03d}", **s,
             "crop_type": None, "planted_day": None, "growth": 0,
             "weed_level": 0, "fertilizer_boost": 0, "soil_moisture": 60, "expected_yield": 0.0}
            for i, s in enumerate(seeds)]

# ── WEATHER ───────────────────────────────────────────────────────────────────
def _roll_weather(prev: dict[str, Any], season_key: str) -> dict[str, Any]:
    prev_cond = prev.get("condition", "sunny")
    # Biais météo selon la saison
    season_bias = {
        "spring": {"rainy": 0.08, "sunny": -0.05},
        "summer": {"sunny": 0.10, "drought": 0.05, "rainy": -0.05},
        "autumn": {"cloudy": 0.08, "storm": 0.05},
        "winter": {"drought": 0.10, "storm": 0.05, "sunny": -0.10},
    }.get(season_key, {})

    transitions = {
        "sunny":   [("sunny", 0.45), ("cloudy", 0.25), ("rainy", 0.15), ("drought", 0.12), ("storm", 0.03)],
        "cloudy":  [("cloudy", 0.30), ("sunny", 0.30), ("rainy", 0.25), ("storm", 0.10),   ("drought", 0.05)],
        "rainy":   [("rainy", 0.35), ("cloudy", 0.30), ("storm", 0.15), ("sunny", 0.18),   ("drought", 0.02)],
        "storm":   [("rainy", 0.45), ("cloudy", 0.30), ("sunny", 0.20), ("storm", 0.05),   ("drought", 0.0)],
        "drought": [("drought", 0.55), ("sunny", 0.30), ("cloudy", 0.10), ("rainy", 0.05), ("storm", 0.0)],
    }
    rolls = [(c, max(0.0, p + season_bias.get(c, 0))) for c, p in transitions[prev_cond]]
    total = sum(p for _, p in rolls)
    rolls = [(c, p / total) for c, p in rolls]

    r, cumul, cond = random.random(), 0.0, "sunny"
    for c, p in rolls:
        cumul += p
        if r <= cumul:
            cond = c
            break

    temps = {"sunny": 26, "cloudy": 20, "rainy": 17, "storm": 15, "drought": 33}
    season_temp_adj = {"spring": -2, "summer": 6, "autumn": -4, "winter": -12}.get(season_key, 0)
    temp     = temps[cond] + season_temp_adj + random.randint(-3, 3)
    humidity = {"sunny": 50, "cloudy": 65, "rainy": 85, "storm": 90, "drought": 25}[cond] + random.randint(-5, 5)
    wind     = {"sunny": 8,  "cloudy": 12, "rainy": 18, "storm": 45, "drought": 6}[cond]  + random.randint(-3, 5)
    drought_idx = max(0.0, min(1.0, prev.get("drought_index", 0.2) + (0.08 if cond == "drought" else -0.05 if cond in ("rainy", "storm") else 0.0)))
    return {"condition": cond, "temperature_c": temp,
            "humidity": max(10, min(100, humidity)), "wind_kmh": max(0, wind),
            "drought_index": round(drought_idx, 2)}

def _market_drift(prev_multipliers: dict[str, float]) -> dict[str, float]:
    new = {}
    for k, v in prev_multipliers.items():
        drift  = random.uniform(-0.06, 0.06)
        revert = (1.0 - v) * 0.10
        new[k] = round(max(0.7, min(1.4, v + drift + revert)), 3)
    return new

def crop_market_price(crop_type: str, multipliers: dict[str, float]) -> float:
    return round(CROP_CATALOG[crop_type]["base_price"] * multipliers.get(crop_type, 1.0), 2)

def resource_market_price(resource: str, weather: dict[str, Any]) -> float:
    base = RESOURCE_CATALOG[resource]["base_price"]
    if resource == "water":
        base *= 1 + weather.get("drought_index", 0.0) * 0.8
    if resource == "fuel":
        base *= 1 + (weather.get("wind_kmh", 0) > 30) * 0.05
    return round(base, 3)

# ── PARCEL TICK ───────────────────────────────────────────────────────────────
def _advance_parcel_day(parcel: dict[str, Any], weather: dict[str, Any],
                        state: dict[str, Any], season_key: str) -> dict[str, float]:
    used = {"water": 0.0, "fuel": 0.0, "electricity": 0.0, "expenses": 0.0}
    if not parcel.get("owned") or not parcel.get("crop_type"):
        return used

    crop = CROP_CATALOG[parcel["crop_type"]]
    cond = weather["condition"]

    # Moisture
    moisture_change = {"sunny": -8, "cloudy": -4, "rainy": +15, "storm": +20, "drought": -18}[cond]
    # En hiver l'humidité se dissipe plus lentement (gel)
    if season_key == "winter":
        moisture_change = min(moisture_change, -2)
    parcel["soil_moisture"] = max(0, min(100, parcel["soil_moisture"] + moisture_change))

    # Auto irrigation
    if parcel["soil_moisture"] < 40 and state["water"] > 0:
        water_needed   = round(crop["water_need"] * parcel["size_ha"] * 2.0, 2)
        actually_used  = min(state["water"], water_needed)
        state["water"] -= actually_used
        used["water"]  += actually_used
        parcel["soil_moisture"] = min(100, parcel["soil_moisture"] + int(actually_used / max(0.1, parcel["size_ha"]) * 4))

    # Weed growth (smart sensors -50%)
    weed_rate = random.randint(2, 6)
    if has_upgrade(state, "smart_sensors"):
        weed_rate = max(1, weed_rate // 2)
    parcel["weed_level"] = min(100, parcel["weed_level"] + weed_rate)

    # Fuel / electricity
    fuel_need = round(0.6 * parcel["size_ha"], 2)
    if state["fuel"] >= fuel_need:
        state["fuel"] -= fuel_need
        used["fuel"] += fuel_need
    elec_need = round(0.4 * parcel["size_ha"], 2)
    if state["electricity"] >= elec_need:
        state["electricity"] -= elec_need
        used["electricity"] += elec_need

    # Growth
    field_bonus      = count_employees(state, "field_hand") * 0.06
    veh_growth_bonus = sum(VEHICLE_CATALOG[v["type"]]["bonus_growth"]
                           for v in (state.get("vehicles") or [])
                           if v.get("status") != "broken") / 100.0
    growth_rate      = (100.0 / crop["growth_days"]) * (1.0 + field_bonus + veh_growth_bonus)
    moisture_factor  = 0.5 + (parcel["soil_moisture"] / 100.0) * 0.7
    fertility_factor = 0.6 + (parcel["fertility"] / 100.0) * 0.6
    fert_factor      = 1.0 + parcel["fertilizer_boost"] / 100.0
    storm_protect    = 0.95 if has_upgrade(state, "drainage_system") else 0.85
    weather_factor   = {"sunny": 1.05, "cloudy": 1.0, "rainy": 1.02, "storm": storm_protect, "drought": 0.6}[cond]
    weed_penalty     = 1.0 - (parcel["weed_level"] / 100.0) * 0.5

    # Saison : rendement modulé
    season_data  = next((s for s in SEASONS.values() if s["key"] == season_key), SEASONS[0])
    season_yield = season_data["yield_mult"]
    # Culture hors saison = pénalité supplémentaire
    if not is_crop_in_season(parcel["crop_type"], season_key):
        season_yield *= 0.60

    delta = growth_rate * moisture_factor * fertility_factor * fert_factor * weather_factor * weed_penalty
    parcel["growth"] = min(100, parcel["growth"] + delta)
    parcel["fertilizer_boost"] = max(0, parcel["fertilizer_boost"] - 2)

    # Expected yield
    base_yield   = crop["yield_per_ha"] * parcel["size_ha"]
    quality      = (parcel["fertility"] / 100.0) * 0.5 + (parcel["soil_moisture"] / 100.0) * 0.3 + (1 - parcel["weed_level"] / 100.0) * 0.2
    yield_bonus  = sum(VEHICLE_CATALOG[v["type"]].get("bonus_yield", 0) for v in (state.get("vehicles") or []) if v.get("status") != "broken") / 100.0
    parcel["expected_yield"] = round(base_yield * (0.6 + quality * 0.6) * (1 + yield_bonus) * season_yield, 2)
    return used

# ── OPERATIONS TICK ───────────────────────────────────────────────────────────
def _advance_operations_day(state: dict[str, Any]) -> dict[str, Any]:
    expenses, activities = 0.0, []
    has_vet         = count_employees(state, "vet") >= 1
    has_mechanic    = count_employees(state, "mechanic") >= 1
    has_driver      = count_employees(state, "driver") >= 1
    has_auto_feeder = has_upgrade(state, "auto_feeder")
    has_climate     = has_upgrade(state, "climate_control")
    has_genetics    = has_upgrade(state, "genetic_program")
    has_premium_parts = has_upgrade(state, "premium_parts")
    weather_cond    = state["weather"]["condition"]

    # Livestock
    for herd in state.get("livestock", []):
        cat   = LIVESTOCK_CATALOG.get(herd["type"])
        if not cat: continue
        count = max(0, int(herd.get("count", 0)))
        if count == 0: continue

        feed_cost = cat["feed_cost_per_day"] * count * (0.75 if has_auto_feeder else 1.0)
        if state["cash"] >= feed_cost:
            state["cash"] -= feed_cost
            expenses += feed_cost
        else:
            herd["health"] = max(0, herd.get("health", 100) - 8)
            activities.append({"type": "weather", "message": f"Bétail affamé: {cat['name']} (trésorerie insuffisante)"})

        days_since_vet = state["day"] - herd.get("last_vet_day", 0)
        if has_vet:
            herd["health"]       = min(100, herd.get("health", 100) + 5)
            herd["last_vet_day"] = state["day"]
        elif days_since_vet > cat["vet_interval"]:
            herd["health"] = max(0, herd.get("health", 100) - 3)

        if weather_cond in ("storm", "drought") and not has_climate:
            herd["health"] = max(0, herd["health"] - 4)

        health_factor  = herd["health"] / 100.0
        genetic_factor = 1.15 if has_genetics else 1.0
        produced       = cat["daily_yield"] * count * health_factor * genetic_factor
        produced       = round(produced) if cat["produces"] == "eggs" else round(produced, 2)
        herd["last_production"] = produced
        state["inventory"][cat["produces"]] = round(state["inventory"].get(cat["produces"], 0) + produced, 2)

    # Vehicles
    for v in state.get("vehicles", []):
        cat = VEHICLE_CATALOG.get(v["type"])
        if not cat or v.get("status") == "broken": continue
        fuel_need = cat["fuel_per_day_active"] * (0.85 if has_driver else 1.0)
        if state["fuel"] >= fuel_need:
            state["fuel"] -= fuel_need
            v["status"] = "working"
        else:
            v["status"] = "idle"
        deg = cat["condition_per_day"] * (0.5 if has_mechanic else 1.0) * (0.7 if has_premium_parts else 1.0)
        v["condition"] = max(0, round(v.get("condition", 100) - deg, 1))
        if v["condition"] < 20:
            v["status"] = "broken"
            activities.append({"type": "weather", "message": f"{cat['name']} en panne (condition: {v['condition']}%)"})

    # Salaires
    for e in state.get("employees", []):
        cat = EMPLOYEE_ROLES.get(e["role"])
        if not cat: continue
        expenses     += cat["daily_salary"]
        state["cash"] -= cat["daily_salary"]

    return {"expenses": round(expenses, 2), "activities": activities}

# ── PROCESS TICKS ─────────────────────────────────────────────────────────────
def process_ticks(state: dict[str, Any], parcels: list[dict[str, Any]], days_to_advance: int) -> dict[str, Any]:
    activities      = []
    daily_history   = list(state.get("history", []))

    for _ in range(days_to_advance):
        _finalize_passive_missions(state)
        state["day"]     += 1
        state["day_stats"] = empty_day_stats()
        state["daily_missions"] = generate_daily_missions(state["day"])

        # Saison courante
        season_info  = day_to_season_info(state["day"])
        season_key   = season_info["season_key"]

        # Transition de saison — notification
        if season_info["season_day"] == 1:
            activities.append({
                "type":    "info",
                "message": f"{season_info['season_icon']} Nouvelle saison: {season_info['display']}",
                "day":     state["day"],
            })

        state["weather"]           = _roll_weather(state["weather"], season_key)
        state["market_multipliers"] = _market_drift(state["market_multipliers"])

        day_expenses = 0.0
        for p in parcels:
            _advance_parcel_day(p, state["weather"], state, season_key)
            if p["owned"]:
                day_expenses += 8.0

        ops           = _advance_operations_day(state)
        day_expenses += ops["expenses"]
        for msg in ops["activities"]:
            activities.append({"type": msg["type"], "message": msg["message"], "day": state["day"]})

        state["cash"] -= day_expenses

        snapshot = {
            "day":      state["day"],
            "cash":     round(state["cash"], 2),
            "revenue":  0.0,
            "expenses": round(day_expenses, 2),
            "weather":  state["weather"]["condition"],
            "temp":     state["weather"]["temperature_c"],
            "season":   season_info["display"],
        }
        daily_history.append(snapshot)
        if len(daily_history) > 14:
            daily_history = daily_history[-14:]

        if random.random() < 0.15:
            crop  = random.choice(list(CROP_CATALOG.keys()))
            mult  = state["market_multipliers"][crop]
            trend = "hausse" if mult > 1.05 else "baisse" if mult < 0.95 else "stable"
            activities.append({"type": "market", "message": f"Marché: {CROP_CATALOG[crop]['name']} en {trend} ({mult:.2f}x)", "day": state["day"]})

        if state["weather"]["condition"] == "drought":
            activities.append({"type": "weather", "message": "Sécheresse: le prix de l'eau augmente", "day": state["day"]})

    state["history"] = daily_history
    return {"days_processed": days_to_advance, "activities": activities}

def compute_pending_days(state: dict[str, Any]) -> int:
    last_tick_at = parse_tick_datetime(state.get("last_tick_at"))
    if not last_tick_at: return 0
    elapsed = (now_utc() - last_tick_at).total_seconds()
    return max(0, int(elapsed // SECONDS_PER_GAME_DAY))

# ── ALERTS ────────────────────────────────────────────────────────────────────
def build_alerts(state: dict[str, Any], parcels: list[dict[str, Any]]) -> list[dict[str, Any]]:
    alerts = []
    if state["water"] < 100:
        alerts.append({"severity": "danger",  "title": "Réserves d'eau critiques", "detail": f"{state['water']:.0f} m³", "category": "resource"})
    elif state["water"] < 300:
        alerts.append({"severity": "warning", "title": "Niveau d'eau bas",         "detail": f"{state['water']:.0f} m³", "category": "resource"})
    if state["fuel"] < 80:
        alerts.append({"severity": "danger",  "title": "Carburant insuffisant",    "detail": f"{state['fuel']:.0f} L",  "category": "resource"})
    elif state["fuel"] < 200:
        alerts.append({"severity": "warning", "title": "Carburant bas",            "detail": f"{state['fuel']:.0f} L",  "category": "resource"})
    if state["electricity"] < 200:
        alerts.append({"severity": "warning", "title": "Électricité limitée",      "detail": f"{state['electricity']:.0f} kWh", "category": "resource"})
    if state["weather"]["condition"] == "drought":
        alerts.append({"severity": "warning", "title": "Alerte sécheresse",        "detail": "Consommation d'eau accrue",       "category": "weather"})
    if state["weather"]["condition"] == "storm":
        alerts.append({"severity": "danger",  "title": "Tempête en cours",         "detail": "Risque pour les cultures",        "category": "weather"})

    # Alerte hiver
    season_info = day_to_season_info(state["day"])
    if season_info["season_key"] == "winter":
        alerts.append({"severity": "warning", "title": "❄️ Hiver — Rendements réduits", "detail": "-30% sur toutes les cultures", "category": "season"})

    for p in parcels:
        if not p["owned"]: continue
        if p["crop_type"] and p["growth"] >= 100:
            alerts.append({"severity": "success", "title": f"Récolte prête: {p['name']}",
                           "detail": f"~{p['expected_yield']:.1f} t de {CROP_CATALOG[p['crop_type']]['name']}",
                           "category": "harvest", "parcel_id": p["id"]})
        elif p["crop_type"] and p["weed_level"] > 65:
            alerts.append({"severity": "warning", "title": f"Mauvaises herbes: {p['name']}",
                           "detail": f"Niveau {int(p['weed_level'])}%", "category": "field", "parcel_id": p["id"]})
        elif p["crop_type"] and p["soil_moisture"] < 25:
            alerts.append({"severity": "warning", "title": f"Sol sec: {p['name']}",
                           "detail": f"Humidité {p['soil_moisture']}%", "category": "field", "parcel_id": p["id"]})
    return alerts

# ── CONTRACTS ─────────────────────────────────────────────────────────────────
def generate_contracts(state: dict[str, Any]) -> list[dict[str, Any]]:
    level_info = xp_to_level(state.get("xp", 0))
    level      = level_info["level"]
    random.seed(state["day"] * 7919)
    contracts  = []
    # Cultures accessibles selon le niveau
    available_crops = [k for k in CROP_CATALOG if CROP_CATALOG[k]["min_level"] <= level]
    if not available_crops:
        available_crops = ["wheat"]
    for i in range(4):
        c       = random.choice(available_crops)
        qty     = round(random.uniform(2.0, 18.0), 1)
        base    = CROP_CATALOG[c]["base_price"]
        bonus   = random.uniform(1.05, 1.35)
        # Bonus export si niveau >= 15
        if level >= 15:
            bonus = random.uniform(1.20, 1.60)
        price    = round(base * bonus, 2)
        deadline = state["day"] + random.randint(4, 12)
        contracts.append({
            "id":           f"contract-{state['day']}-{i}",
            "crop":         c,
            "crop_name":    CROP_CATALOG[c]["name"],
            "qty":          qty,
            "price_per_ton": price,
            "total_value":  round(qty * price, 2),
            "deadline_day": deadline,
            "premium":      bonus,
            "export":       level >= 15 and bonus > 1.35,
        })
    random.seed()
    return contracts

# Ce fichier remplace backend/game_logic.py en totalité
