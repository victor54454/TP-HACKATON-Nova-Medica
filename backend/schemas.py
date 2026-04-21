import re
from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator, Field, EmailStr


# bloque les caractères spéciaux
_SAFE_NAME = re.compile(r"^[a-zA-ZÀ-ÿ\s\-\']{1,100}$")
_SSN_REGEX = re.compile(r"^\d{15}$")


def _validate_name(v: str) -> str:
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


# --- Patients ---

class PatientReceptionCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name:  str = Field(..., min_length=1, max_length=100)
    birth_date: date
    social_security_number: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        return _validate_name(v)

    @field_validator("social_security_number")
    @classmethod
    def validate_ssn(cls, v):
        if not _SSN_REGEX.match(v):
            raise ValueError("Le numéro de sécurité sociale doit contenir exactement 15 chiffres")
        return v

class PatientPraticienCreate(PatientReceptionCreate):
    pathology: Optional[str] = Field(None, max_length=500)

class PatientCreate(PatientPraticienCreate):
    pass

class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name:  Optional[str] = Field(None, min_length=1, max_length=100)
    birth_date: Optional[date] = None
    social_security_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    pathology: Optional[str] = Field(None, max_length=500)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if v is not None:
            return _validate_name(v)
        return v

    @field_validator("social_security_number")
    @classmethod
    def validate_ssn(cls, v):
        if v is not None and not _SSN_REGEX.match(v):
            raise ValueError("Le numéro de sécurité sociale doit contenir exactement 15 chiffres")
        return v

class PatientResponse(BaseModel):
    id:         int
    first_name: str
    last_name:  str
    birth_date: date
    social_security_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pathology: Optional[str] = None

    class Config:
        from_attributes = True


# --- Admin ---

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    role: str

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

class ConsultationCreate(BaseModel):
    date: Optional[date] = None
    diagnosis: str
    doctor: Optional[str] = None

class ConsultationResponse(BaseModel):
    id: int
    date: date
    diagnosis: str
    doctor: str
    patient_id: int
    
    class Config:
        from_attributes = True
