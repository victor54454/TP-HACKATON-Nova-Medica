# backend/routers/patient.py
from fastapi import APIRouter, Depends, Request, HTTPException
from schemas import PatientResponse, ConsultationResponse
from security import verify_patient
from crypto import decrypt
from logger import log_info

router = APIRouter(prefix="/api/patient", tags=["Patient"])


@router.get("/me", response_model=PatientResponse)
async def get_my_patient_data(request: Request, payload: dict = Depends(verify_patient)):
    pool = request.app.state.db_pool
    user_id = payload["user_id"]

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patients WHERE user_account_id = $1",
            user_id
        )

    if not row:
        raise HTTPException(status_code=404, detail="Dossier patient introuvable")

    log_info("PATIENT", f"Patient {payload['sub']} a consulté son dossier")

    return PatientResponse(
        id=row["id"],
        first_name=decrypt(row["first_name"]),
        last_name=decrypt(row["last_name"]),
        birth_date=row["birth_date"],
        social_security_number=decrypt(row["social_security_number"]),
        email=row["email"],
        phone=row["phone"],
        address=row["address"],
        pathology=decrypt(row["pathology"]) if row["pathology"] else None,
    )


@router.get("/me/consultations", response_model=list[ConsultationResponse])
async def get_my_consultations(request: Request, payload: dict = Depends(verify_patient)):
    pool = request.app.state.db_pool
    user_id = payload["user_id"]

    async with pool.acquire() as conn:
        patient = await conn.fetchrow(
            "SELECT id FROM patients WHERE user_account_id = $1",
            user_id
        )

        if not patient:
            raise HTTPException(status_code=404, detail="Dossier patient introuvable")

        rows = await conn.fetch(
            """
            SELECT c.*, u.first_name, u.last_name
            FROM consultations c
            JOIN users u ON c.doctor_id = u.id
            WHERE c.patient_id = $1
            ORDER BY c.consultation_date DESC
            """,
            patient["id"]
        )

    log_info("PATIENT", f"Patient {payload['sub']} a consulté son historique ({len(rows)} consultations)")

    return [
        ConsultationResponse(
            id=r["id"],
            consultation_date=r["consultation_date"],
            anamnesis=None,
            diagnosis=r["diagnosis"],
            medical_acts=None,
            prescription=r["prescription"],
            doctor=f"{r['first_name']} {r['last_name']}".strip() if r.get('first_name') else payload["sub"],
            patient_id=r["patient_id"]
        )
        for r in rows
    ]
