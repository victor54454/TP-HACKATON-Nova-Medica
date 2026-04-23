from fastapi import APIRouter, Depends, Request, HTTPException, status
from passlib.context import CryptContext
from schemas import UserCreate, UserUpdate, UserResponse
from security import verify_admin
from logger import log_info, log_warn

router = APIRouter(prefix="/api/admin", tags=["Administration"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

@router.post("/users", status_code=201)
async def create_user(
    user: UserCreate,
    request: Request,
    payload: dict = Depends(verify_admin)
):
    if user.role not in ["accueil", "praticien"]:
        raise HTTPException(status_code=400, detail="Rôle non reconnu — seuls 'accueil' et 'praticien' peuvent être créés")

    hashed_pwd = pwd_context.hash(user.password)
    pool = request.app.state.db_pool

    async with pool.acquire() as conn:
        try:
            await conn.execute(
                """
                INSERT INTO users (username, password, role, first_name, last_name, phone, email, must_change_password)
                VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
                """,
                user.username, hashed_pwd, user.role,
                user.first_name, user.last_name, user.phone, str(user.email) if user.email else None
            )
            log_info("ADMIN", f"Utilisateur {user.username} créé avec le rôle {user.role} par {payload['sub']}")
            return {"message": f"Utilisateur {user.username} créé avec succès."}
        except Exception as e:
            log_warn("ADMIN", f"Échec création utilisateur {user.username}: {str(e)}")
            raise HTTPException(status_code=400, detail="Erreur lors de la création de l'utilisateur.")

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    request: Request,
    search: str = None,
    payload: dict = Depends(verify_admin)
):
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        if search:
            search_pattern = f"%{search}%"
            rows = await conn.fetch(
                """
                SELECT id, username, role, first_name, last_name 
                FROM users 
                WHERE username ILIKE $1 
                   OR first_name ILIKE $1 
                   OR last_name ILIKE $1 
                ORDER BY role, username
                """,
                search_pattern
            )
        else:
            rows = await conn.fetch(
                "SELECT id, username, role, first_name, last_name, phone, email FROM users ORDER BY role, username"
            )
    return [UserResponse(**r) for r in rows]

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    request: Request,
    payload: dict = Depends(verify_admin)
):
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        update_data = user_update.model_dump(exclude_unset=True)

        # Pour les comptes patients, seul le mot de passe peut être modifié
        if existing["role"] == "patient":
            allowed_patient_fields = {"password", "first_name", "last_name", "phone", "email"}
            forbidden = set(update_data.keys()) - allowed_patient_fields
            if "role" in forbidden or "username" in forbidden:
                raise HTTPException(
                    status_code=403,
                    detail="Pour un compte patient, seuls le mot de passe et les informations de profil sont modifiables"
                )
            update_data = {k: v for k, v in update_data.items() if k in allowed_patient_fields}

        # Empêcher le changement de rôle vers admin
        if update_data.get("role") == "admin":
            raise HTTPException(
                status_code=403,
                detail="Impossible de promouvoir un utilisateur au rôle admin"
            )

        if "password" in update_data:
            update_data["password"] = pwd_context.hash(update_data["password"])
            update_data["must_change_password"] = True

        if "email" in update_data and update_data["email"]:
            update_data["email"] = str(update_data["email"])

        if not update_data:
            return UserResponse(**{k: existing[k] for k in ["id", "username", "role", "first_name", "last_name", "phone", "email"]})

        cols = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(update_data.keys())])
        vals = list(update_data.values())

        query = f"UPDATE users SET {cols} WHERE id = $1 RETURNING id, username, role, first_name, last_name, phone, email"
        try:
            row = await conn.fetchrow(query, user_id, *vals)
            log_info("ADMIN", f"Utilisateur {user_id} mis à jour par {payload['sub']}")
            return UserResponse(**row)
        except Exception as e:
            log_warn("ADMIN", f"Échec mise à jour utilisateur {user_id}: {str(e)}")
            raise HTTPException(status_code=400, detail="Erreur lors de la mise à jour")

@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    request: Request,
    payload: dict = Depends(verify_admin)
):
    if user_id == payload["user_id"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT role, username FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        async with conn.transaction():
            # Nettoyer les logs d'accès
            await conn.execute("DELETE FROM access_logs WHERE user_id = $1", user_id)

            if existing["role"] == "patient":
                # Supprimer les données patients 
                await conn.execute("DELETE FROM patients WHERE user_account_id = $1", user_id)
            else:
                # Anonymiser les références créées par le staff pour préserver l'historique médical
                await conn.execute("UPDATE patients SET created_by = NULL WHERE created_by = $1", user_id)
                await conn.execute("UPDATE consultations SET doctor_id = NULL WHERE doctor_id = $1", user_id)

            # Supprimer le compte utilisateur
            result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    log_info("ADMIN", f"Compte {existing['role']} {existing['username']} (id={user_id}) supprimé par {payload['sub']}")
    return None
