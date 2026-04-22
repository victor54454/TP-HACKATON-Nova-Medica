from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import settings
from logger import log_warn

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# JWT
def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

#Middleware JWT
def verify_token(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        username: Optional[str] = payload.get("sub")
        if username is None:
            log_warn("JWT", "Token sans subject (sub)")
            raise credentials_exception
        return payload

    except JWTError as e:
        log_warn("JWT", f"Token rejeté : {str(e)}")
        raise credentials_exception

#Middleware Admin
def verify_admin(payload: dict = Depends(verify_token)) -> dict:
    if payload.get("role") != "admin":
        from logger import log_warn
        log_warn("AUTH_RBAC", f"Accès Admin refusé pour l'utilisateur {payload.get('sub')}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privilèges administrateur requis")
    return payload

#Middleware Reception ou Praticien
def verify_reception_or_praticien(payload: dict = Depends(verify_token)) -> dict:
    role = payload.get("role")
    if role not in ["accueil", "praticien"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    return payload