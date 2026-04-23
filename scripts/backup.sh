#!/usr/bin/env bash
# Dump PostgreSQL → chiffrement GPG asymétrique → backups/
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hsecure_db_${TIMESTAMP}.sql.gpg"
CONTAINER="hsecure-database"
DB_USER="hsecure_user"
DB_NAME="hsecure_db"
GPG_RECIPIENT="backup_hsecure"

# Vérifications

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[ERREUR] Le container '${CONTAINER}' n'est pas en cours d'exécution." >&2
  exit 1
fi

if ! gpg --list-keys "${GPG_RECIPIENT}" > /dev/null 2>&1; then
  echo "[ERREUR] Clé publique GPG introuvable pour '${GPG_RECIPIENT}'." >&2
  echo "         Importe-la avec : gpg --import cle_publique.asc" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# Dump + chiffrement

echo "[INFO] Dump de ${DB_NAME} en cours..."

docker exec "${CONTAINER}" \
  pg_dump -U "${DB_USER}" --format=custom "${DB_NAME}" \
  | gpg --batch --yes \
        --trust-model always \
        --encrypt \
        --recipient "${GPG_RECIPIENT}" \
        --output "${BACKUP_FILE}"

echo "[OK] Backup chiffré : ${BACKUP_FILE}"

# Rotation : supprime les dumps de plus de 30 jours

find "$BACKUP_DIR" -name "hsecure_db_*.sql.gpg" -mtime +30 -delete
