# backend/routers/reception.py
from fastapi import APIRouter, Depends, Request, HTTPException
from schemas import PatientReceptionCreate, PatientResponse, PatientUpdate
from security import verify_reception_or_praticien
from crypto import encrypt, decrypt
from logger import log_info, log_warn

router = APIRouter(prefix="/api/reception/patients", tags=["Accueil"])

@router.post("/", response_model=PatientResponse, status_code=201)
async def create_patient_reception(
    patient: PatientReceptionCreate, 
    request: Request, 
    payload: dict = Depends(verify_reception_or_praticien)
):
    pool = request.app.state.db_pool
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO patients (
                first_name, last_name, social_security_number, birth_date, email, phone, address, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, birth_date, email, phone
            """,
            encrypt(patient.first_name),
            encrypt(patient.last_name),
            encrypt(patient.social_security_number),
            patient.birth_date,
            patient.email,
            patient.phone,
            patient.address,
            payload["user_id"]
        )
        
    log_info("ACCUEIL", f"Patient {patient.last_name} créé par {payload['sub']}")
    
    return PatientResponse(
        id=row["id"],
        first_name=patient.first_name,
        last_name=patient.last_name,
        email=row["email"],
        phone=row["phone"],
        birth_date=row["birth_date"]
    )

@router.get("/", response_model=list[PatientResponse])
async def list_patients_reception(
    request: Request, 
    payload: dict = Depends(verify_reception_or_praticien)
):
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, first_name, last_name, email, phone, birth_date FROM patients ORDER BY last_name")
        
    return [
        PatientResponse(
            id=r["id"],
            first_name=decrypt(r["first_name"]),
            last_name=decrypt(r["last_name"]),
            email=r["email"],
            phone=r["phone"],
            birth_date=r["birth_date"]
        )
        for r in rows
    ]

@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient_reception(
    patient_id: int,
    patient_update: PatientUpdate,
    request: Request,
    payload: dict = Depends(verify_reception_or_praticien)
):
    # Reception cannot update health data (pathology)
    update_data = patient_update.model_dump(exclude_unset=True)
    if "pathology" in update_data:
        raise HTTPException(status_code=403, detail="L'accueil ne peut pas modifier les données de santé")
    
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM patients WHERE id = $1", patient_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Patient introuvable")
        
        # Encrypt sensitive fields if present
        for field in ["first_name", "last_name", "social_security_number"]:
            if field in update_data and update_data[field]:
                update_data[field] = encrypt(update_data[field])
        
        if not update_data:
            return PatientResponse(
                id=existing["id"],
                first_name=decrypt(existing["first_name"]),
                last_name=decrypt(existing["last_name"]),
                email=existing["email"],
                phone=existing["phone"],
                birth_date=existing["birth_date"]
            )
            
        cols = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(update_data.keys())])
        vals = list(update_data.values())
        
        query = f"UPDATE patients SET {cols}, updated_at = NOW() WHERE id = $1 RETURNING id, first_name, last_name, email, phone, birth_date"
        try:
            row = await conn.fetchrow(query, patient_id, *vals)
            log_info("ACCUEIL", f"Patient {patient_id} mis à jour par {payload['sub']}")
            return PatientResponse(
                id=row["id"],
                first_name=decrypt(row["first_name"]),
                last_name=decrypt(row["last_name"]),
                email=row["email"],
                phone=row["phone"],
                birth_date=row["birth_date"]
            )
        except Exception as e:
            log_warn("ACCUEIL", f"Échec mise à jour patient {patient_id}: {str(e)}")
            raise HTTPException(status_code=400, detail="Erreur lors de la mise à jour")