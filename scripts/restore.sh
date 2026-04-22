#!/usr/bin/env bash
# Déchiffre un dump GPG et le restaure dans PostgreSQL
set -euo pipefail

CONTAINER="hsecure-database"
DB_USER="hsecure_user"
DB_NAME="hsecure_db"

if [ -z "${1:-}" ]; then
  echo "Usage : ./scripts/restore.sh <fichier.sql.gpg>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERREUR] Fichier introuvable : ${BACKUP_FILE}" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[ERREUR] Le container '${CONTAINER}' n'est pas en cours d'exécution." >&2
  exit 1
fi

echo "[AVERTISSEMENT] Cette opération va écraser la base '${DB_NAME}'. Continuer ? [y/N]"
read -r CONFIRM
[ "${CONFIRM}" = "y" ] || { echo "Annulé."; exit 0; }

echo "[INFO] Déchiffrement et restauration en cours..."

gpg --batch --decrypt "${BACKUP_FILE}" \
  | docker exec -i "${CONTAINER}" \
      pg_restore -U "${DB_USER}" --clean --if-exists -d "${DB_NAME}"

echo "[OK] Restauration terminée."
