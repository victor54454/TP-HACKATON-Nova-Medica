import asyncio
import asyncpg
import random
import re
import secrets
import string
from datetime import date, datetime, timedelta
from passlib.hash import argon2
from crypto import encrypt
from config import settings


def _normalize_for_username(text: str) -> str:
    replacements = {
        'é':'e','è':'e','ê':'e','ë':'e','à':'a','â':'a','ä':'a',
        'ù':'u','û':'u','ü':'u','ô':'o','ö':'o','î':'i','ï':'i',
        'ç':'c','ñ':'n','œ':'oe','æ':'ae','É':'e','È':'e','À':'a','Œ':'oe'
    }
    text = text.lower()
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    text = re.sub(r"[^a-z0-9]", ".", text)
    return text.strip(".")


async def _get_unique_username(conn, base: str, used: set) -> str:
    if base not in used:
        row = await conn.fetchrow("SELECT id FROM users WHERE username = $1", base)
        if not row:
            used.add(base)
            return base
    for i in range(2, 500):
        candidate = f"{base}{i}"
        if candidate not in used:
            row = await conn.fetchrow("SELECT id FROM users WHERE username = $1", candidate)
            if not row:
                used.add(candidate)
                return candidate
    fallback = f"{base}.{secrets.token_hex(3)}"
    used.add(fallback)
    return fallback


async def seed():
    print("Starting database seeding...")
    conn = await asyncpg.connect(settings.database_url)

    used_usernames = set()

    # ── Praticiens ───────────────────────────────────────────────
    print("Creating 10 practitioners...")
    praticien_profiles = [
        ("Sophie",   "Marchand",  "Dr"),
        ("Thomas",   "Renaud",    "Dr"),
        ("Claire",   "Fontaine",  "Dr"),
        ("Nicolas",  "Petit",     "Dr"),
        ("Isabelle", "Lambert",   "Dr"),
        ("Julien",   "Morel",     "Dr"),
        ("Emma",     "Garnier",   "Dr"),
        ("François", "Roux",      "Dr"),
        ("Nathalie", "Girard",    "Dr"),
        ("Antoine",  "Lefebvre",  "Dr"),
    ]
    for i in range(1, 11):
        username  = f"praticien{i}"
        password  = f"Practitioner2026_{i}!"
        fn, ln, _ = praticien_profiles[i - 1]
        hashed_pw = argon2.hash(password)
        phone     = f"06{random.randint(10000000,99999999)}"
        email     = f"{_normalize_for_username(fn)}.{_normalize_for_username(ln)}@nova-medica.fr"
        await conn.execute(
            """
            INSERT INTO users (username, password, role, first_name, last_name, phone, email, must_change_password)
            VALUES ($1, $2, 'praticien', $3, $4, $5, $6, TRUE)
            ON CONFLICT (username) DO UPDATE SET first_name=$3, last_name=$4, phone=$5, email=$6
            """,
            username, hashed_pw, fn, ln, phone, email
        )
        print(f"  ✓ praticien{i} ({fn} {ln})")

    # ── Agents d'accueil ─────────────────────────────────────────
    print("Creating 5 reception agents...")
    accueil_profiles = [
        ("Lucie",   "Duval"),
        ("Marc",    "Simon"),
        ("Amandine","Chevalier"),
        ("Romain",  "Blanc"),
        ("Céline",  "Dupuis"),
    ]
    for i in range(1, 6):
        username  = f"accueil{i}"
        password  = f"Reception2026_{i}!"
        fn, ln    = accueil_profiles[i - 1]
        hashed_pw = argon2.hash(password)
        phone     = f"04{random.randint(10000000,99999999)}"
        email     = f"{_normalize_for_username(fn)}.{_normalize_for_username(ln)}@nova-medica.fr"
        await conn.execute(
            """
            INSERT INTO users (username, password, role, first_name, last_name, phone, email, must_change_password)
            VALUES ($1, $2, 'accueil', $3, $4, $5, $6, TRUE)
            ON CONFLICT (username) DO UPDATE SET first_name=$3, last_name=$4, phone=$5, email=$6
            """,
            username, hashed_pw, fn, ln, phone, email
        )
        print(f"  ✓ accueil{i} ({fn} {ln})")

    # ── Mise à jour du compte admin ───────────────────────────────
    admin = await conn.fetchrow("SELECT id FROM users WHERE username = 'admin'")
    admin_id = admin['id']
    await conn.execute(
        "UPDATE users SET first_name='Admin', last_name='Système', email='admin@nova-medica.fr' WHERE id=$1",
        admin_id
    )

    # ── Patients ──────────────────────────────────────────────────
    print("Creating 100 patients with linked user accounts...")

    # 2 patients de démo aux identifiants prédictibles
    demo_patients = [
        ("Pierre",  "Dupont",   "pierre.dupont@example.com",  "0611111111", "Patient2026_demo1!"),
        ("Marie",   "Leclerc",  "marie.leclerc@example.com",  "0622222222", "Patient2026_demo2!"),
    ]
    demo_ids = []
    for fn, ln, email, phone, pwd in demo_patients:
        ssn  = "".join([str(random.randint(0, 9)) for _ in range(15)])
        bd   = date(1980 + len(demo_ids) * 5, 3 + len(demo_ids), 15)
        addr = f"{random.randint(1,99)} rue de la Paix, Paris"

        patient_row = await conn.fetchrow(
            """
            INSERT INTO patients (first_name, last_name, social_security_number, birth_date, email, phone, address, pathology, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
            """,
            encrypt(fn), encrypt(ln), encrypt(ssn), bd, email, phone, addr,
            encrypt("Hypertension artérielle"), admin_id
        )
        patient_id = patient_row["id"]
        demo_ids.append(patient_id)

        username  = await _get_unique_username(conn, f"{_normalize_for_username(fn)}.{_normalize_for_username(ln)}", used_usernames)
        hashed_pw = argon2.hash(pwd)
        user_row  = await conn.fetchrow(
            """
            INSERT INTO users (username, password, role, first_name, last_name, email, phone, must_change_password)
            VALUES ($1, $2, 'patient', $3, $4, $5, $6, TRUE)
            RETURNING id
            """,
            username, hashed_pw, fn, ln, email, phone
        )
        await conn.execute(
            "UPDATE patients SET user_account_id = $1 WHERE id = $2",
            user_row["id"], patient_id
        )
        print(f"  ✓ Demo patient: {username} ({fn} {ln}) — pwd: {pwd}")

    # 98 patients aléatoires
    first_names = ["Jean", "Marie", "Pierre", "Sophie", "Luc", "Emma", "Thomas",
                   "Julie", "Nicolas", "Léa", "Marc", "Claire", "Antoine", "Camille"]
    last_names  = ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard",
                   "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel"]
    pathologies = ["Diabète type 2", "Hypertension", "Asthme", "Migraine chronique",
                   "Lumbago", "Allergie pollen", "Anémie", "Gériatrie générale",
                   "Arthrose", "Insuffisance veineuse"]
    addresses   = ["12 rue de la Paix, Paris", "5 avenue des Champs, Lyon",
                   "22 boulevard Hugo, Marseille", "7 rue du Port, Bordeaux",
                   "45 quai Vert, Nantes"]

    for i in range(1, 99):
        fn    = random.choice(first_names)
        ln    = random.choice(last_names)
        ssn   = "".join([str(random.randint(0, 9)) for _ in range(15)])
        bd    = date(1950 + random.randint(0, 50), random.randint(1, 12), random.randint(1, 28))
        email = f"{_normalize_for_username(fn)}.{_normalize_for_username(ln)}.{i}@example.com"
        phone = f"06{random.randint(10000000, 99999999)}"
        addr  = f"{random.randint(1, 150)} {random.choice(addresses)}"
        patho = random.choice(pathologies)

        patient_row = await conn.fetchrow(
            """
            INSERT INTO patients (first_name, last_name, social_security_number, birth_date, email, phone, address, pathology, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
            """,
            encrypt(fn), encrypt(ln), encrypt(ssn), bd, email, phone, addr, encrypt(patho), admin_id
        )
        patient_id = patient_row["id"]

        base_username = f"{_normalize_for_username(fn)}.{_normalize_for_username(ln)}"
        username      = await _get_unique_username(conn, base_username, used_usernames)
        pwd           = f"Patient2026_{i+2}!"  # N+2 pour éviter les collisions avec les démos
        hashed_pw     = argon2.hash(pwd)

        user_row = await conn.fetchrow(
            """
            INSERT INTO users (username, password, role, first_name, last_name, email, phone, must_change_password)
            VALUES ($1, $2, 'patient', $3, $4, $5, $6, TRUE)
            RETURNING id
            """,
            username, hashed_pw, fn, ln, email, phone
        )
        await conn.execute(
            "UPDATE patients SET user_account_id = $1 WHERE id = $2",
            user_row["id"], patient_id
        )
        if i % 20 == 0:
            print(f"  Created {i + 2}/100 patients...")

    await conn.close()
    print("\nSeeding completed successfully!")
    print("Demo patient accounts:")
    print("  pierre.dupont   →  Patient2026_demo1!")
    print("  marie.leclerc   →  Patient2026_demo2!")


if __name__ == "__main__":
    asyncio.run(seed())
