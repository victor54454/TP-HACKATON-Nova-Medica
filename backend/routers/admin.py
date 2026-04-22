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
    # Vérification du rôle
    if user.role not in ["admin", "accueil", "praticien"]:
        raise HTTPException(status_code=400, detail="Rôle non reconnu")

    hashed_pwd = pwd_context.hash(user.password)
    pool = request.app.state.db_pool 

    async with pool.acquire() as conn:
        try:
            await conn.execute(
                "INSERT INTO users (username, password, role, must_change_password) VALUES ($1, $2, $3, TRUE)",
                user.username, hashed_pwd, user.role
            )
            log_info("ADMIN", f"Utilisateur {user.username} créé avec le rôle {user.role} par {payload['sub']}")
            return {"message": f"Utilisateur {user.username} créé avec succès."}
        except Exception as e:
            log_warn("ADMIN", f"Échec création utilisateur {user.username}: {str(e)}")
            raise HTTPException(status_code=400, detail="Erreur lors de la création de l'utilisateur.")

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    request: Request, 
    payload: dict = Depends(verify_admin)
):
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, username, role FROM users ORDER BY username")
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
        if "password" in update_data:
            update_data["password"] = pwd_context.hash(update_data["password"])
            
        if not update_data:
            return UserResponse(**existing)
        
        cols = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(update_data.keys())])
        vals = list(update_data.values())
        
        query = f"UPDATE users SET {cols} WHERE id = $1 RETURNING id, username, role"
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
        result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
            
    log_info("ADMIN", f"Utilisateur {user_id} supprimé par {payload['sub']}")
    return None