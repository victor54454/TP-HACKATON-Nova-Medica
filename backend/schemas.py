# backend/schemas.py
import re
from datetime import date, datetime, timedelta
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

def _validate_password(v: str) -> str:
    """
    Valide les mots de passe pour s'assurer qu'ils sont suffisamment complexes
    Validates that password meets security requirements:
    """
    if len(v) < 12:
        raise ValueError("Le mot de passe doit comporter au moins 12 caractères/The password must be at least 12 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Le mot de passe doit contenir au moins une lettre majuscule/The password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Le mot de passe doit contenir au moins une lettre minuscule/The password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", v):
        raise ValueError("Le mot de passe doit contenir au moins un chiffre/The password must contain at least one digit")
    if not re.search(r"[@$!%*?&]", v):
        raise ValueError("Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)/The password must contain at least one special character (@$!%*?&)")
    return v



# --- Auth ---

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=12, max_length=200)
    role: str = Field(..., pattern="^(praticien|admin)$")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        return _validate_password(v)


class PasswordChangeRequest(BaseModel):
    """Schéma pour la demande de changement de mot de passe/Schema for password change request"""
    new_password: str = Field(..., min_length=12, max_length=200)
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        return _validate_password(v)


# --- Patients ---

class PatientReceptionCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name:  str = Field(..., min_length=1, max_length=100)
    birth_date: date
    social_security_number: str
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = Field(None, max_length=254)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v):
        today = date.today()
        if v > today:
            raise ValueError("La date de naissance ne peut pas être dans le futur")
        if (today - v).days > 130 * 365:
            raise ValueError("L'âge du patient ne peut pas dépasser 130 ans")
        return v

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
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = Field(None, max_length=254)
    pathology: Optional[str] = Field(None, max_length=500)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v):
        if v is not None:
            today = date.today()
            if v > today:
                raise ValueError("La date de naissance ne peut pas être dans le futur")
            if (today - v).days > 130 * 365:
                raise ValueError("L'âge du patient ne peut pas dépasser 130 ans")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if v is not None:
            return _validate_name(v)
        return v

    @field_validator("social_security_number")
    @classmethod
    def validate_ssn(cls, v):
        if v is not None and v != "" and not _SSN_REGEX.match(v):
            raise ValueError("Le numéro de sécurité sociale doit contenir exactement 15 chiffres")
        return v or None

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
    password: str = Field(..., min_length=12)
    role: str
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        return _validate_password(v)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    password: Optional[str] = Field(None, min_length=12)
    role: Optional[str] = None
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            return _validate_password(v)
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    role: str


#Consultation
class ConsultationCreate(BaseModel):
    consultation_date: Optional[datetime] = None
    anamnesis: Optional[str] = None
    diagnosis: Optional[str] = None
    medical_acts: Optional[str] = None
    prescription: Optional[str] = None


class ConsultationResponse(BaseModel):
    id: int
    consultation_date: datetime
    anamnesis: Optional[str] = None
    diagnosis: Optional[str] = None
    medical_acts: Optional[str] = None
    prescription: Optional[str] = None
    doctor: str
    patient_id: int

    class Config:
        from_attributes = True
