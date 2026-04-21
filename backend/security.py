from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import settings
from logger import log_warn

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(data: dict) -> str:
    """Génère un JWT signé HS256 avec expiration"""
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Middleware JWT — actif sur toutes les routes sensibles (Test B ✅)
    Retourne 401 si le token est absent, expiré ou invalide.
    """
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