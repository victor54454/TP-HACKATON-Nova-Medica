import asyncio
import asyncpg
from passlib.context import CryptContext
from crypto import encrypt
import os

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def setup():
    db_url = os.getenv("DATABASE_URL", "postgresql://hsecure_user:postgres@database:5432/hsecure_db")
    conn = await asyncpg.connect(db_url)

    # Nettoyage (ordre FK)
    await conn.execute("DELETE FROM consultations")
    await conn.execute("DELETE FROM access_logs")
    await conn.execute("UPDATE patients SET user_account_id = NULL")
    await conn.execute("DELETE FROM patients")
    await conn.execute("DELETE FROM users")

    # Utilisateurs staff de test
    staff = [
        ("admin",   pwd_context.hash("admin123"),   "admin",     "Admin",  "Test",    None,             None),
        ("accueil", pwd_context.hash("accueil123"), "accueil",   "Alice",  "Accueil", "0600000001",     "accueil@test.local"),
        ("doctor",  pwd_context.hash("doctor123"),  "praticien", "Dr Bob", "Médecin", "0600000002",     "doctor@test.local"),
    ]
    for username, pwd, role, fn, ln, phone, email in staff:
        await conn.execute(
            """
            INSERT INTO users (username, password, role, first_name, last_name, phone, email, must_change_password)
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
            """,
            username, pwd, role, fn, ln, phone, email
        )

    admin_row = await conn.fetchrow("SELECT id FROM users WHERE username = 'admin'")
    admin_id  = admin_row["id"]

    # Patient de test (avec compte utilisateur lié)
    from datetime import date
    patient_row = await conn.fetchrow(
        """
        INSERT INTO patients (
            first_name, last_name, social_security_number, birth_date,
            email, phone, address, pathology, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        """,
        encrypt("Jean"), encrypt("Test"),
        encrypt("199010112345600"),
        date(1990, 1, 1),
        "jean.test@example.com", "0600000099",
        "1 rue du Test, Paris",
        encrypt("Hypertension test"),
        admin_id
    )
    patient_id = patient_row["id"]

    patient_user_row = await conn.fetchrow(
        """
        INSERT INTO users (username, password, role, first_name, last_name, email, phone, must_change_password)
        VALUES ($1, $2, 'patient', $3, $4, $5, $6, TRUE)
        RETURNING id
        """,
        "jean.test",
        pwd_context.hash("Patient@Test123!"),
        "Jean", "Test",
        "jean.test@example.com", "0600000099"
    )
    await conn.execute(
        "UPDATE patients SET user_account_id = $1 WHERE id = $2",
        patient_user_row["id"], patient_id
    )

    await conn.close()
    print("Test users created:")
    print("  admin   / admin123      (admin)")
    print("  accueil / accueil123    (accueil)")
    print("  doctor  / doctor123     (praticien)")
    print("  jean.test / Patient@Test123!  (patient — must_change_password=TRUE)")

if __name__ == "__main__":
    asyncio.run(setup())
