#!/bin/bash
# Génère un hash Argon2 — fonctionne en local et via Docker.
# Usage : ./scripts/generate_password_hash.sh MonMotDePasse

PASSWORD="$1"
if [ -z "$PASSWORD" ]; then
    read -rsp "Mot de passe : " PASSWORD
    echo
fi

VENV_DIR="/tmp/hsecure_hash_venv"

# Crée le venv si inexistant
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install "passlib[argon2]" argon2-cffi -q
fi

"$VENV_DIR/bin/python3" - "$PASSWORD" <<'EOF'
import sys
from passlib.context import CryptContext
ctx = CryptContext(schemes=["argon2"], deprecated="auto")
print(ctx.hash(sys.argv[1]))
EOF
