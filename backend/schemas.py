import re
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator, Field


# Regex : lettres, espaces, tirets, apostrophes uniquement → bloque les injections
_SAFE_NAME = re.compile(r"^[a-zA-ZÀ-ÿ\s\-\']{1,100}$")


def _validate_name(v: str) -> str:
    """Valide qu'un nom ne contient pas de caractères injectables"""
    if not _SAFE_NAME.match(v):
        raise ValueError(
            "Caractères non autorisés (SQL injection / XSS bloqué)"
        )
    return v.strip()


# --- Auth ---

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=200)
    role: str = Field(..., pattern="^(praticien|admin)$")


# --- Patients ---

class PatientCreate(BaseModel):
    first_name:             str           = Field(..., min_length=1, max_length=100)
    last_name:              str           = Field(..., min_length=1, max_length=100)
    birth_date:             Optional[date]= None
    phone_number:           Optional[str] = Field(None, max_length=20)
    email_address:          Optional[str] = Field(None, max_length=254)
    mail_address:           Optional[str] = Field(None, max_length=500)
    social_security_number: Optional[str] = Field(None, max_length=50)
    pathology:              Optional[str] = Field(None, max_length=500)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        return _validate_name(v)


class PatientResponse(BaseModel):
    id:         int
    first_name: str
    last_name:  str
    pathology:  Optional[str]
    birth_date: Optional[date]

    class Config:
        from_attributes = True
        
        
# --- Consultations ---

class ConsultationCreate(BaseModel):
    """
    Schéma pour créer une consultation / Schema for creating a consultation
    """
    anamnesis:    str = Field(..., min_length=1, max_length=2000)
    diagnosis:    str = Field(..., min_length=1, max_length=2000)
    medical_acts: Optional[str] = Field(None, max_length=2000)
    prescription: Optional[str] = Field(None, max_length=2000)


class ConsultationResponse(BaseModel):
    """
    Schéma pour la réponse consultation / Schema for consultation response
    """
    id:                int
    patient_id:        int
    praticien_id:      int
    anamnesis:         str
    diagnosis:         str
    medical_acts:      Optional[str]
    prescription:      Optional[str]
    consultation_date: datetime

    class Config:
        from_attributes = True
