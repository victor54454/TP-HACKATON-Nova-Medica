# backend/main.py
import os
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI, Depends, HTTPException, Request, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg
from passlib.context import CryptContext

from config import settings
from security import create_access_token, verify_token, verify_reception_or_praticien
from schemas import (
    PatientCreate, PatientResponse, TokenResponse, PatientUpdate, 
    ConsultationCreate, ConsultationResponse, LoginRequest, PasswordChangeRequest
)
from crypto import encrypt, decrypt
from logger import setup_logger, log_info, log_warn, log_error
import routers.admin as admin
import routers.reception as reception


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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helpers
def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# AUTH
@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(login_data: LoginRequest = Body(...)):
    global db_pool

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, password, role, must_change_password FROM users WHERE username = $1",
            login_data.username,
        )

    if not user or not pwd_context.verify(login_data.password, user["password"]):
        log_warn("AUTH", f"Failed login attempt — user: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants de connexion incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user["username"], "user_id": user["id"], "role": user["role"]})
    log_info("AUTH", f"Access granted for user {user['username']}")
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


@app.post("/api/patients", response_model=PatientResponse, status_code=201, tags=["Patients"])
async def create_patient(patient: PatientCreate, payload: dict = Depends(verify_reception_or_praticien)):
    if payload.get("role") == "accueil" and patient.pathology:
        raise HTTPException(status_code=403, detail="L'accueil ne peut pas enregistrer de données de santé")
        
    log_info("PATIENTS", f"Create patient — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
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

    return PatientResponse(
        id=row["id"],
        first_name=patient.first_name,
        last_name=patient.last_name,
        birth_date=row["birth_date"],
        social_security_number=patient.social_security_number,
        email=row["email"],
        phone=row["phone"],
        address=row["address"],
        pathology=patient.pathology if payload.get("role") == "praticien" else None
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
            SELECT c.*, u.username as doctor_name 
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
            date=r["consultation_date"].date(),
            anamnesis=r["anamnesis"] if is_praticien else None,
            diagnosis=r["diagnosis"] if is_praticien else "Accès réservé au praticien",
            prescription=r["prescription"] if is_praticien else None,
            doctor=r["doctor_name"],
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
            INSERT INTO consultations (patient_id, doctor_id, anamnesis, diagnosis, prescription, consultation_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            patient_id,
            payload["user_id"],
            consultation.anamnesis,
            consultation.diagnosis,
            consultation.prescription,
            consultation.date or date.today()
        )
        
    return ConsultationResponse(
        id=row["id"],
        date=row["consultation_date"].date(),
        diagnosis=row["diagnosis"],
        doctor=payload["sub"], 
        patient_id=row["patient_id"]
    )


@app.get("/api/health", tags=["Ops"])
async def health():
    return {"status": "ok", "service": "H-Secure API"}


app.include_router(admin.router)    
app.include_router(reception.router)
