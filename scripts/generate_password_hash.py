"""
Génère un hash Argon2 à coller dans database/init.sql ou directement en DB.

Usage local :
    python3 scripts/generate_password_hash.py MonMotDePasse

Usage via Docker (si dépendances pas installées localement) :
    docker cp scripts/generate_password_hash.py hsecure-backend:/tmp/generate_password_hash.py
    docker exec hsecure-backend python3 /tmp/generate_password_hash.py MonMotDePasse
"""

import sys
import subprocess

try:
    from passlib.context import CryptContext
except ImportError:
    print("Installation des dépendances manquantes...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "passlib[argon2]", "argon2-cffi", "-q"])
    from passlib.context import CryptContext

ctx = CryptContext(schemes=["argon2"], deprecated="auto")

password = sys.argv[1] if len(sys.argv) > 1 else input("Mot de passe : ")
hashed = ctx.hash(password)

print(hashed)
