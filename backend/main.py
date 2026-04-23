# backend/main.py
import os
import re
import secrets
import string
from contextlib import asynccontextmanager
from datetime import date, datetime

from fastapi import FastAPI, Depends, HTTPException, Request, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import asyncpg
from passlib.context import CryptContext

from config import settings
from security import create_access_token, verify_token, verify_reception_or_praticien
from schemas import (
    PatientCreate, PatientResponse, PatientWithAccountResponse, TokenResponse, PatientUpdate,
    ConsultationCreate, ConsultationResponse, LoginRequest, PasswordChangeRequest,
    RegisterRequest, ProfileUpdateRequest, UserResponse
)
from crypto import encrypt, decrypt
from logger import setup_logger, log_info, log_warn, log_error
import routers.admin as admin
import routers.reception as reception
import routers.patient as patient_router


limiter = Limiter(key_func=get_remote_address)
pwd_context_main = CryptContext(schemes=["argon2"], deprecated="auto")


def _normalize_for_username(text: str) -> str:
    replacements = {
        'é':'e','è':'e','ê':'e','ë':'e','à':'a','â':'a','ä':'a',
        'ù':'u','û':'u','ü':'u','ô':'o','ö':'o','î':'i','ï':'i',
        'ç':'c','ñ':'n','œ':'oe','æ':'ae'
    }
    text = text.lower()
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    text = re.sub(r"[^a-z0-9]", ".", text)
    return text.strip(".")


def _generate_temp_password() -> str:
    charset = string.ascii_letters + string.digits + "@$!%*?&"
    while True:
        pwd = "".join(secrets.choice(charset) for _ in range(14))
        if (
            any(c.isupper() for c in pwd)
            and any(c.islower() for c in pwd)
            and any(c.isdigit() for c in pwd)
            and any(c in "@$!%*?&" for c in pwd)
        ):
            return pwd


async def _get_unique_username(conn, base: str) -> str:
    row = await conn.fetchrow("SELECT id FROM users WHERE username = $1", base)
    if not row:
        return base
    for i in range(2, 200):
        candidate = f"{base}{i}"
        row = await conn.fetchrow("SELECT id FROM users WHERE username = $1", candidate)
        if not row:
            return candidate
    return f"{base}.{secrets.token_hex(3)}"

# ── Init logger ────────────────────────────────────────────────
os.makedirs("/app/logs", exist_ok=True)
setup_logger()

# Hashage des mots de passe
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")



# Pool de connexions DB
db_pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    app.state.db_pool = db_pool
    log_info("STARTUP", "Connexion PostgreSQL établie")
    yield
    await db_pool.close()
    log_info("SHUTDOWN", "Pool PostgreSQL fermé")


# Application
app = FastAPI(
    title="H-Secure API — Nova-Médica",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# Helpers
def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def write_access_log(user_id, action: str, ip: str, log_status: str, detail: str = None):
    try:
        async with db_pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO access_logs (user_id, action, ip_address, status, detail) VALUES ($1, $2, $3, $4, $5)",
                user_id, action, ip, log_status, detail,
            )
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════

@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authentification — retourne un JWT valide 30 min.
    Log [INFO] si succès, [WARN] si échec (Test D ✅)
    Limité à 10 tentatives/minute par IP.
    """
    ip = get_client_ip(request)

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, password, role, must_change_password FROM users WHERE username = $1",
            form_data.username,
        )

    if not user or not pwd_context.verify(form_data.password, user["password"]):
        log_warn("AUTH", f"Failed login attempt from IP {ip} — user: {form_data.username}")
        await write_access_log(
            user["id"] if user else None, "LOGIN", ip, "FAILURE",
            f"Bad credentials for username: {form_data.username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants de connexion incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user["username"], "user_id": user["id"], "role": user["role"]})
    log_info("AUTH", f"Access granted for user {user['username']} from IP {ip}")
    await write_access_log(user["id"], "LOGIN", ip, "SUCCESS", f"User {user['username']} authenticated")

    return {
        "access_token": token, 
        "token_type": "bearer", 
        "must_change_password": user["must_change_password"]
    }

@app.post("/api/auth/change-password", tags=["Auth"])
async def change_password(
    data: PasswordChangeRequest,
    payload: dict = Depends(verify_token)
):
    user_id = payload.get("user_id")
    hashed_pwd = pwd_context.hash(data.new_password)

    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET password = $1, must_change_password = FALSE WHERE id = $2",
            hashed_pwd, user_id
        )

    log_info("AUTH", f"Password changed for user {payload['sub']}")
    return {"message": "Mot de passe mis à jour avec succès"}


@app.get("/api/auth/profile", response_model=UserResponse, tags=["Auth"])
async def get_profile(payload: dict = Depends(verify_token)):
    user_id = payload["user_id"]
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, username, role, first_name, last_name, phone, email FROM users WHERE id = $1",
            user_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return UserResponse(**row)


@app.patch("/api/auth/profile", response_model=UserResponse, tags=["Auth"])
async def update_profile(data: ProfileUpdateRequest, payload: dict = Depends(verify_token)):
    if payload.get("role") == "patient":
        raise HTTPException(status_code=403, detail="Les patients ne peuvent pas modifier leur profil directement")

    user_id = payload["user_id"]
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    if "email" in update_data and update_data["email"]:
        update_data["email"] = str(update_data["email"])

    cols = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(update_data.keys())])
    vals = list(update_data.values())

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE users SET {cols} WHERE id = $1 RETURNING id, username, role, first_name, last_name, phone, email",
            user_id, *vals
        )

    log_info("AUTH", f"Profile updated for user {payload['sub']}")
    return UserResponse(**row)


# PATIENTS 
@app.get("/api/patients", response_model=list[PatientResponse], tags=["Patients"])
async def list_patients(payload: dict = Depends(verify_reception_or_praticien)):
    is_praticien = payload.get("role") == "praticien"
    log_info("PATIENTS", f"List patients (is_praticien={is_praticien}) — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM patients ORDER BY id ")
        
    log_info("PATIENTS", f"[DEBUG] {len(rows)} patients trouvés dans la base pour l'utilisateur {payload['sub']}")

    return [
        PatientResponse(
            id=r["id"],
            first_name=decrypt(r["first_name"]),
            last_name=decrypt(r["last_name"]),
            birth_date=r["birth_date"],
            social_security_number=decrypt(r["social_security_number"]),
            email=r["email"],
            phone=r["phone"],
            address=r["address"],
            pathology=decrypt(r["pathology"]) if (is_praticien and r["pathology"]) else None,
        )
        for r in rows
    ]


@app.get("/api/patients/{patient_id}", response_model=PatientResponse, tags=["Patients"])
async def get_patient(patient_id: int, payload: dict = Depends(verify_reception_or_praticien)):
    is_praticien = payload.get("role") == "praticien"
    log_info("PATIENTS", f"Get patient {patient_id} (is_praticien={is_praticien}) — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM patients WHERE id = $1", patient_id)

    if not row:
        raise HTTPException(
            status_code=404, 
            detail="Patient introuvable"
            )
    

    return PatientResponse(
        id=row["id"],
        first_name=decrypt(row["first_name"]),
        last_name=decrypt(row["last_name"]),
        birth_date=row["birth_date"],
        social_security_number=decrypt(row["social_security_number"]),
        email=row["email"],
        phone=row["phone"],
        address=row["address"],
        pathology=decrypt(row["pathology"]) if (is_praticien and row["pathology"]) else None,
    )


@app.post("/api/patients", response_model=PatientWithAccountResponse, status_code=201, tags=["Patients"])
async def create_patient(patient: PatientCreate, payload: dict = Depends(verify_reception_or_praticien)):
    if payload.get("role") == "accueil" and patient.pathology:
        raise HTTPException(status_code=403, detail="L'accueil ne peut pas enregistrer de données de santé")

    log_info("PATIENTS", f"Create patient — user: {payload['sub']}")

    base_username = (
        _normalize_for_username(patient.first_name)
        + "."
        + _normalize_for_username(patient.last_name)
    )
    temp_password = _generate_temp_password()

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                INSERT INTO patients (
                    first_name, last_name, social_security_number, birth_date, email, phone, address, pathology, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
                """,
                encrypt(patient.first_name),
                encrypt(patient.last_name),
                encrypt(patient.social_security_number),
                patient.birth_date,
                patient.email,
                patient.phone,
                patient.address,
                encrypt(patient.pathology) if patient.pathology else None,
                payload["user_id"],
            )

            username = await _get_unique_username(conn, base_username)
            hashed_pwd = pwd_context.hash(temp_password)

            user_row = await conn.fetchrow(
                """
                INSERT INTO users (username, password, role, first_name, last_name, email, phone, must_change_password)
                VALUES ($1, $2, 'patient', $3, $4, $5, $6, TRUE)
                RETURNING id
                """,
                username, hashed_pwd,
                patient.first_name, patient.last_name,
                patient.email, patient.phone,
            )

            await conn.execute(
                "UPDATE patients SET user_account_id = $1 WHERE id = $2",
                user_row["id"], row["id"]
            )

    await write_access_log(payload["user_id"], "CREATE_PATIENT", "internal", "SUCCESS", f"Patient id={row['id']} — compte: {username}")
    return PatientWithAccountResponse(
        id=row["id"],
        first_name=patient.first_name,
        last_name=patient.last_name,
        birth_date=row["birth_date"],
        email=row["email"],
        phone=row["phone"],
        address=row["address"],
        patient_username=username,
        temp_password=temp_password,
    )

@app.patch("/api/patients/{patient_id}", response_model=PatientResponse, tags=["Patients"])
async def update_patient(patient_id: int, patient_update: PatientUpdate, payload: dict = Depends(verify_reception_or_praticien)):
    is_praticien = payload.get("role") == "praticien"
    update_data = patient_update.model_dump(exclude_unset=True)
    
    if not is_praticien and "pathology" in update_data:
        raise HTTPException(status_code=403, detail="L'accueil ne peut pas modifier les données de santé")

    log_info("PATIENTS", f"Update patient {patient_id} — user: {payload['sub']}")
    
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM patients WHERE id = $1", patient_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Patient introuvable")
            
        for field in ["first_name", "last_name", "social_security_number", "pathology"]:
            if field in update_data and update_data[field]:
                update_data[field] = encrypt(update_data[field])
        
        if not update_data:
            return await get_patient(patient_id, payload)
            
        cols = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(update_data.keys())])
        vals = list(update_data.values())
        
        query = f"UPDATE patients SET {cols}, updated_at = NOW() WHERE id = $1 RETURNING *"
        row = await conn.fetchrow(query, patient_id, *vals)
        
    return PatientResponse(
        id=row["id"],
        first_name=decrypt(row["first_name"]),
        last_name=decrypt(row["last_name"]),
        birth_date=row["birth_date"],
        social_security_number=decrypt(row["social_security_number"]),
        email=row["email"],
        phone=row["phone"],
        address=row["address"],
        pathology=decrypt(row["pathology"]) if (is_praticien and row["pathology"]) else None
    )


@app.delete("/api/patients/{patient_id}", status_code=204, tags=["Patients"])
async def delete_patient(patient_id: int, payload: dict = Depends(verify_reception_or_praticien)):
    if payload.get("role") not in ("praticien", "accueil"):
        raise HTTPException(status_code=403, detail="Rôle non autorisé")
        
    log_info("PATIENTS", f"Delete patient {patient_id} — user: {payload['sub']}")
    
    async with db_pool.acquire() as conn:
        result = await conn.execute("DELETE FROM patients WHERE id = $1", patient_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Patient introuvable")
            
    return None


# Consultations 
@app.get("/api/patients/{patient_id}/consultations", response_model=list[ConsultationResponse], tags=["Consultations"])
async def list_consultations(patient_id: int, payload: dict = Depends(verify_reception_or_praticien)):
    
    is_praticien = payload.get("role") == "praticien"
    
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT c.*, u.first_name, u.last_name 
            FROM consultations c 
            JOIN users u ON c.doctor_id = u.id 
            WHERE c.patient_id = $1 
            ORDER BY c.consultation_date DESC
            """,
            patient_id
        )

    return [
        ConsultationResponse(
            id=r["id"],
            consultation_date=r["consultation_date"],
            anamnesis=r["anamnesis"] if is_praticien else None,
            diagnosis=r["diagnosis"] if is_praticien else "Accès réservé au praticien",
            medical_acts=r["medical_acts"] if is_praticien else None,
            prescription=r["prescription"] if is_praticien else None,
            doctor=f"{r['first_name']} {r['last_name']}".strip() if r['first_name'] else payload["sub"],
            patient_id=r["patient_id"]
        )
        for r in rows
    ]

@app.post("/api/patients/{patient_id}/consultations", response_model=ConsultationResponse, status_code=201, tags=["Consultations"])
async def create_consultation(patient_id: int, consultation: ConsultationCreate, payload: dict = Depends(verify_reception_or_praticien)):
    if payload.get("role") != "praticien":
        raise HTTPException(status_code=403, detail="Seuls les praticiens peuvent ajouter des consultations")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO consultations (patient_id, doctor_id, anamnesis, diagnosis, medical_acts, prescription, consultation_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            patient_id,
            payload["user_id"],
            consultation.anamnesis,
            consultation.diagnosis,
            consultation.medical_acts,
            consultation.prescription,
            consultation.consultation_date or datetime.now()
        )
        
        # Récupérer le nom complet du praticien pour la réponse
        doctor_data = await conn.fetchrow("SELECT first_name, last_name FROM users WHERE id = $1", payload["user_id"])

    return ConsultationResponse(
        id=row["id"],
        consultation_date=row["consultation_date"],
        anamnesis=row["anamnesis"],
        diagnosis=row["diagnosis"],
        medical_acts=row["medical_acts"],
        prescription=row["prescription"],
        doctor=f"{doctor_data['first_name']} {doctor_data['last_name']}".strip() if doctor_data['first_name'] else payload["sub"],
        patient_id=row["patient_id"]
    )


@app.get("/api/health", tags=["Ops"])
async def health():
    return {"status": "ok", "service": "H-Secure API"}

#ADMIN LOGS

@app.get("/api/admin/logs", tags=["Admin"])
async def get_logs(payload: dict = Depends(verify_token)):
    """
    Retourne les logs d'accès — admin uniquement.
    Returns access logs — admin only.
    """
    if payload.get("role") != "admin":
        log_warn("ADMIN", f"Unauthorized logs access by: {payload['sub']}")
        raise HTTPException(
            status_code=403,
            detail="Accès refusé — rôle admin requis / Access denied — admin role required"
        )
    log_info("ADMIN", f"Logs accessed by admin: {payload['sub']}")

    try:
        with open("/app/logs/hsecure.log", "r") as f:
            lines = f.readlines()
        
        last_100 = lines[-100:] if len(lines) > 100 else lines
        
        parsed_logs = []
        for i, line in enumerate(reversed(last_100)):
            line = line.strip()
            if line:
                parsed_logs.append({
                    "id": i + 1,
                    "message": line,
                    "date": line[:19] if len(line) > 19 else line
                })
        
        return {"logs": parsed_logs}
    except FileNotFoundError:
        return {"logs": []}    
        


app.include_router(admin.router)
app.include_router(reception.router)
app.include_router(patient_router.router)
# ══════════════════════════════════════════════════════════════
#  REGISTER - Create a new user /Creer un nouvel utilisateur
# ══════════════════════════════════════════════════════════════

@app.post("/api/auth/register", status_code=201, tags=["Auth"])
@limiter.limit("5/minute")
async def register(request: Request, user: RegisterRequest):
    """ Crée un nouveau compte praticien ou admin.
    Create a new doctor or admin account.
    Vérifie que le username n'existe pas déjà.
    Checks that username does not already exist."""
    
   
    ip = get_client_ip(request)

    async with db_pool.acquire() as conn:

        # Check if username already exists / Vérifier si le username existe déjà
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1",
            user.username
        )

        if existing:
            log_warn("REGISTER", f"Username already exists: {user.username} from IP {ip}")
            raise HTTPException(
                status_code=400,
                detail="Ce nom d'utilisateur existe déjà / Username already exists"
            )

        # Hash password before saving / Hasher le mot de passe avant sauvegarde
        hashed_password = pwd_context.hash(user.password)

        # Save new user — role forcé à "praticien" (admin créé uniquement via DB)
        new_row = await conn.fetchrow(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id",
            user.username,
            hashed_password,
            "praticien",
        )

    log_info("REGISTER", f"New user created: {user.username} role: {user.role} from IP {ip}")
    await write_access_log(new_row["id"], "REGISTER", ip, "SUCCESS", f"New user: {user.username}")
    return {"message": f"Utilisateur {user.username} créé avec succès / User {user.username} created successfully"}

