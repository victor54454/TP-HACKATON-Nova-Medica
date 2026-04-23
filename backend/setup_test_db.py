import asyncio
import asyncpg
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def setup():
    db_url = os.getenv("DATABASE_URL", "postgresql://hsecure_user:postgres@database:5432/hsecure_db")
    conn = await asyncpg.connect(db_url)
    
    # Clean users
    await conn.execute("DELETE FROM users")
    
    # Create test users
    users = [
        ("admin", pwd_context.hash("admin123"), "admin"),
        ("accueil", pwd_context.hash("accueil123"), "accueil"),
        ("doctor", pwd_context.hash("doctor123"), "praticien"),
    ]
    
    for u, p, r in users:
        await conn.execute("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", u, p, r)
    
    await conn.close()
    print("Test users created: admin/admin123, accueil/accueil123, doctor/doctor123")

if __name__ == "__main__":
    asyncio.run(setup())
