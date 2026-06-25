"""FarmTycoon — Authentification JWT + bcrypt (Phase 1).

Module autonome qui expose :
- les helpers `hash_password` / `verify_password` / `create_access_token`
- la dépendance `get_current_user_id` à utiliser sur les routes protégées
- un `APIRouter` `auth_router` montant /auth/signup, /auth/login, /auth/me

Le client Mongo et la collection `users` sont injectés via `init_auth(db)`
depuis `backend/index.py` pour éviter une double-connexion au cluster.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

# ── Config ────────────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    # Fallback dev uniquement — Vercel doit fournir un vrai secret.
    JWT_SECRET = "dev-only-insecure-secret-change-me-in-production"
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))  # 7 jours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Injecté par init_auth()
_db: Any = None


def init_auth(db) -> None:
    """À appeler depuis index.py au démarrage pour partager le client Mongo."""
    global _db
    _db = db


# ── Hash & JWT ────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("missing sub")
        return user_id
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalide: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Dépendance FastAPI ────────────────────────────────────────────────────────
async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    return decode_token(token)


async def get_current_user(user_id: str = Depends(get_current_user_id)) -> dict:
    if _db is None:
        raise HTTPException(status_code=500, detail="Auth non initialisée")
    user = await _db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


def _serialize_user(user: dict) -> dict:
    return {
        "id": user["_id"],
        "email": user["email"],
        "company": user.get("company"),
        "created_at": user.get("created_at"),
    }


# ── Schémas ───────────────────────────────────────────────────────────────────
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


# ── Routes ────────────────────────────────────────────────────────────────────
auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/signup")
async def signup(body: SignupBody):
    if _db is None:
        raise HTTPException(status_code=500, detail="Auth non initialisée")
    email = body.email.lower().strip()
    if await _db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "_id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "created_at": now,
        "last_login_at": now,
        "company": None,
    }
    await _db.users.insert_one(user_doc)
    return {
        "token": create_access_token(user_id),
        "user": _serialize_user(user_doc),
        "has_company": False,
    }


@auth_router.post("/login")
async def login(body: LoginBody):
    if _db is None:
        raise HTTPException(status_code=500, detail="Auth non initialisée")
    email = body.email.lower().strip()
    user = await _db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {
        "token": create_access_token(user["_id"]),
        "user": _serialize_user(user),
        "has_company": user.get("company") is not None,
    }


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": _serialize_user(user), "has_company": user.get("company") is not None}
