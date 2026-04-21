import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg
from passlib.context import CryptContext

from config import settings
from security import create_access_token, verify_token
from schemas import PatientCreate, PatientResponse, TokenResponse, RegisterRequest, ConsultationCreate, ConsultationResponse
from crypto import encrypt, decrypt
from logger import setup_logger, log_info, log_warn, log_error

# ── Init logger ────────────────────────────────────────────────
os.makedirs("/app/logs", exist_ok=True)
setup_logger()

# ── Hachage des mots de passe (Argon2) ────────────────────────
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# ── Pool de connexions DB ──────────────────────────────────────
db_pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    log_info("STARTUP", "Connexion PostgreSQL établie")
    yield
    await db_pool.close()
    log_info("SHUTDOWN", "Pool PostgreSQL fermé")


# ── Application ────────────────────────────────────────────────
app = FastAPI(
    title="H-Secure API — Nova-Médica",
    version="1.0.0",
    lifespan=lifespan,
    # Désactiver les docs en prod (activer pour la démo J3 !)
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


# ── Helpers ────────────────────────────────────────────────────
def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ══════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════

@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authentification — retourne un JWT valide 30 min.
    Log [INFO] si succès, [WARN] si échec (Test D ✅)
    """
    ip = get_client_ip(request)

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, password FROM users WHERE username = $1",
            form_data.username,
        )

    # Utilisateur inexistant ou mauvais mot de passe
    if not user or not pwd_context.verify(form_data.password, user["password"]):
        log_warn("AUTH", f"Failed login attempt from IP {ip} — user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user["username"], "user_id": user["id"]})
    log_info("AUTH", f"Access granted for user {user['username']} from IP {ip}")
    return {"access_token": token, "token_type": "bearer"}


# ══════════════════════════════════════════════════════════════
#  PATIENTS — Routes protégées par JWT (Test B ✅)
# ══════════════════════════════════════════════════════════════

@app.get("/api/patients", response_model=list[PatientResponse], tags=["Patients"])
async def list_patients(payload: dict = Depends(verify_token)):
    """Liste tous les patients — JWT requis (401 sinon)"""
    log_info("PATIENTS", f"List patients — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM patients WHERE created_by =$1 ORDER BY id ",
            payload["user_id"])

    # Déchiffrement à la volée (les données brutes en DB sont illisibles → Test C ✅)
    return [
        PatientResponse(
            id=r["id"],
            first_name=decrypt(r["first_name"]),
            last_name=decrypt(r["last_name"]),
            birth_date=r["birth_date"],
            phone_number=decrypt(r["phone_number"]) if r["phone_number"] else None,
            email_address=decrypt(r["email_address"]) if r["email_address"] else None,
            mail_address=decrypt(r["mail_address"]) if r["mail_address"] else None,
            social_security_number=decrypt(r["social_security_number"]) if r["social_security_number"] else None,
            pathology=decrypt(r["pathology"]) if r["pathology"] else None,
        )
        for r in rows
    ]


@app.get("/api/patients/{patient_id}", response_model=PatientResponse, tags=["Patients"])
async def get_patient(patient_id: int, payload: dict = Depends(verify_token)):
    """Récupère un patient par ID — JWT requis"""
    log_info("PATIENTS", f"Get patient {patient_id} — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patients WHERE id = $1", patient_id
        )

    if not row:
        raise HTTPException(
            status_code=404, 
            detail="Patient introuvable"
            )
    if row["created_by"] != payload["user_id"]:
        raise HTTPException(
            status_code=403, 
            detail="Accès refusé au patient demandé/Access denied — this patient does not belong to you"
            )    

    return PatientResponse(
        id=row["id"],
        first_name=decrypt(row["first_name"]),
        last_name=decrypt(row["last_name"]),
        birth_date=row["birth_date"],
        phone_number=decrypt(row["phone_number"]) if row["phone_number"] else None,
        email_address=decrypt(row["email_address"]) if row["email_address"] else None,
        mail_address=decrypt(row["mail_address"]) if row["mail_address"] else None,
        social_security_number=decrypt(row["social_security_number"]) if row["social_security_number"] else None,
        pathology=decrypt(row["pathology"]) if row["pathology"] else None,
    )


@app.post("/api/patients", response_model=PatientResponse, status_code=201, tags=["Patients"])
async def create_patient(patient: PatientCreate, payload: dict = Depends(verify_token)):
    """
    Crée un patient — JWT requis.
    Les données sensibles sont chiffrées AVANT insertion en DB (Test C ✅)
    La validation Pydantic bloque les injections SQL/XSS en amont.
    """
    log_info("PATIENTS", f"Create patient — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO patients (
                first_name, last_name, birth_date,
                phone_number, email_address, mail_address,
                social_security_number, pathology, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            """,
            encrypt(patient.first_name),
            encrypt(patient.last_name),
            patient.birth_date,
            encrypt(patient.phone_number)           if patient.phone_number           else None,
            encrypt(patient.email_address)          if patient.email_address          else None,
            encrypt(patient.mail_address)           if patient.mail_address           else None,
            encrypt(patient.social_security_number) if patient.social_security_number else None,
            encrypt(patient.pathology)              if patient.pathology              else None,
            payload["user_id"],
        )

    return PatientResponse(
        id=row["id"],
        first_name=patient.first_name,
        last_name=patient.last_name,
        birth_date=row["birth_date"],
        phone_number=patient.phone_number,
        email_address=patient.email_address,
        mail_address=patient.mail_address,
        social_security_number=patient.social_security_number,
        pathology=patient.pathology,
    )


# ══════════════════════════════════════════════════════════════
#  HEALTH CHECK (pas de JWT — pour Docker healthcheck)
# ══════════════════════════════════════════════════════════════

@app.get("/health", tags=["Ops"])
async def health():
    return {"status": "ok", "service": "H-Secure API"}


# ══════════════════════════════════════════════════════════════
#  REGISTER - Create a new user /Creer un nouvel utilisateur
# ══════════════════════════════════════════════════════════════

@app.post("/api/auth/register", status_code=201, tags=["Auth"])
async def register(request: Request,user:RegisterRequest):
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

        # Save new user / Sauvegarder le nouvel utilisateur
        await conn.execute(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
            user.username,
            hashed_password,
            user.role
        )

    log_info("REGISTER", f"New user created: {user.username} role: {user.role} from IP {ip}")
    return {"message": f"Utilisateur {user.username} créé avec succès / User {user.username} created successfully"}

# ══════════════════════════════════════════════════════════════
#  UPDATE PATIENT
# ═══════════════════════════════════════════════════════════════

@app.put("/api/patients/{patient_id}", response_model=PatientResponse, tags=["Patients"])
async def update_patient(patient_id: int, patient: PatientCreate, payload: dict = Depends(verify_token)):
    """
    Modifie un patient existant — JWT requis.
    Update an existing patient — JWT required.
    Seul le praticien qui a créé ce patient peut le modifier (protection IDOR).
    Only the doctor who created this patient can update it (IDOR protection).
    """
    log_info("PATIENTS", f"Update patient {patient_id} — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        
        # Check if patient exists / Vérifier si le patient existe
        existing = await conn.fetchrow(
            "SELECT * FROM patients WHERE id = $1", patient_id
        )

        if not existing:
            raise HTTPException(
                status_code=404, 
                detail="Patient introuvable / Patient not found"
                )
        # Protection IDOR : check ownership / IDOR protection: vérifier la propriété du patient
        if existing["created_by"] != payload["user_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Accès refusé au patient demandé/Access denied — this patient does not belong to you"
                )    
            
        # Update patient / Mettre à jour le patient
        row = await conn.fetchrow(
            """
            UPDATE patients
            SET first_name = $1, last_name = $2, birth_date = $3,
                phone_number = $4, email_address = $5, mail_address = $6,
                social_security_number = $7, pathology = $8,
                updated_at = NOW()
            WHERE id = $9
            RETURNING *
            """,
            encrypt(patient.first_name),
            encrypt(patient.last_name),
            patient.birth_date,
            encrypt(patient.phone_number)           if patient.phone_number           else None,
            encrypt(patient.email_address)          if patient.email_address          else None,
            encrypt(patient.mail_address)           if patient.mail_address           else None,
            encrypt(patient.social_security_number) if patient.social_security_number else None,
            encrypt(patient.pathology)              if patient.pathology              else None,
            patient_id,
        )
    return PatientResponse(
        id=row["id"],
        first_name=patient.first_name,
        last_name=patient.last_name,
        birth_date=row["birth_date"],
        phone_number=patient.phone_number,
        email_address=patient.email_address,
        mail_address=patient.mail_address,
        social_security_number=patient.social_security_number,
        pathology=patient.pathology,
    )
    
# ══════════════════════════════════════════════════════════════
#  DELETE PATIENT
# ══════════════════════════════════════════════════════════════

@app.delete("/api/patients/{patient_id}", tags=["Patients"])
async def delete_patient(patient_id: int, payload: dict = Depends(verify_token)):
    """
    Supprime un patient existant — JWT requis.
    Delete an existing patient — JWT required.
    Seul le praticien qui a créé ce patient peut le supprimer (protection IDOR).
    Only the doctor who created this patient can delete it (IDOR protection).
    """
    log_info("PATIENTS", f"Delete patient {patient_id} — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        
        # Check if patient exists / Vérifier si le patient existe
        existing = await conn.fetchrow(
            "SELECT * FROM patients WHERE id = $1", patient_id
        )

        if not existing:
            raise HTTPException(
                status_code=404, 
                detail="Patient introuvable / Patient not found"
                )
        # Protection IDOR : check ownership / IDOR protection: vérifier la propriété du patient
        if existing["created_by"] != payload["user_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Accès refusé au patient demandé/Access denied — this patient does not belong to you"
                )    
            
        # Delete patient / Supprimer le patient
        await conn.execute(
            "DELETE FROM patients WHERE id = $1",
            patient_id
        )
        
    log_info("PATIENTS", f"Patient {patient_id} deleted by user: {payload['sub']}")
    return {"message": f"Patient supprimé avec succès / Patient deleted successfully"}


# ══════════════════════════════════════════════════════════════
#  CONSULTATIONS - Gestion des consltations medicales/Management of medical consultations
# ══════════════════════════════════════════════════════════════

@app.post("/api/patients/{patient_id}/consultations",
          response_model=ConsultationResponse, status_code=201, tags=["Consultations"] )
async def create_consultation(patient_id: int, consultation: ConsultationCreate, payload: dict = Depends(verify_token)):
    """
    Crée une consultation pour un patient donné — JWT requis.
    Create a consultation for a given patient — JWT required.
    Seul le praticien qui a créé ce patient peut ajouter une consultation (protection IDOR).
    Only the doctor who created this patient can add a consultation (IDOR protection).
    Les données sensibles de la consultation sont chiffrées AVANT insertion en DB (Test C ✅)
    The sensitive data of the consultation are encrypted BEFORE being stored in DB (Test C ✅)
    """
    log_info("CONSULTATIONS", f"Create consultation for patient {patient_id} — user: {payload['sub']}")

    async with db_pool.acquire() as conn:
        
        # Check if patient exists / Vérifier si le patient existe
        patient = await conn.fetchrow(
            "SELECT * FROM patients WHERE id = $1", patient_id
        )

        if not patient:
            raise HTTPException(
                status_code=404, 
                detail="Patient introuvable / Patient not found"
                )
        # Protection IDOR : check ownership / IDOR protection: vérifier la propriété du patient
        if patient["created_by"] != payload["user_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Accès refusé au patient demandé/Access denied — this patient does not belong to you"
                )    
            
        # Insert consultation / Insérer la consultation
        row = await conn.fetchrow(
            """
            INSERT INTO consultations (patient_id, praticien_id, anamnesis, diagnosis, medical_acts, prescription)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            patient_id,
            payload["user_id"],
            encrypt(consultation.anamnesis),   # ← chiffré ici
            encrypt(consultation.diagnosis),   # ← chiffré ici
            encrypt(consultation.medical_acts) if consultation.medical_acts else None,
            encrypt(consultation.prescription) if consultation.prescription else None,
        )   
        
    return ConsultationResponse(
        id=row["id"],
        patient_id=row["patient_id"],
        praticien_id=row["praticien_id"],
        anamnesis=consultation.anamnesis,   # on retourne le clair à l'appelant/ we return the clear 
        diagnosis=consultation.diagnosis,
        medical_acts=consultation.medical_acts,
        prescription=consultation.prescription,
        consultation_date=row["consultation_date"],
     )
   
@app.get("/api/patients/{patient_id}/consultations",
        response_model=list[ConsultationResponse], 
        tags=["Consultations"])    
async def list_consultations(
    patient_id: int,
    payload: dict = Depends(verify_token)):
    
    """
    Liste les consultations d'un patient donné — JWT requis.
    List consultations for a given patient — JWT required.
    """
    log_info("CONSULTATIONS", f"List consultations for patient {patient_id} — user: {payload['sub']}")
    
    async with db_pool.acquire() as conn:
        
        # Check if patient exists / Vérifier si le patient existe
        patient = await conn.fetchrow(
            "SELECT * FROM patients WHERE id = $1", patient_id
        )

        if not patient:
            raise HTTPException(
                status_code=404, 
                detail="Patient introuvable / Patient not found"
                )
        # Protection IDOR : check ownership / IDOR protection: vérifier la propriété du patient
        if patient["created_by"] != payload["user_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Accès refusé au patient demandé/Access denied — this patient does not belong to you"
                )    
            
        rows = await conn.fetch(
            "SELECT * FROM consultations WHERE patient_id = $1 ORDER BY consultation_date DESC",
            patient_id
        )
        
        #Decrypt and return / Déchiffrer et retourner
        return [
            ConsultationResponse(
                id=r["id"],
                patient_id=r["patient_id"],
                praticien_id=r["praticien_id"],
                anamnesis=decrypt(r["anamnesis"]),
                diagnosis=decrypt(r["diagnosis"]),
                medical_acts=decrypt(r["medical_acts"]) if r["medical_acts"] else None,
                prescription=decrypt(r["prescription"]) if r["prescription"] else None,
                consultation_date=r["consultation_date"],
            )
            for r in rows
        ]
    