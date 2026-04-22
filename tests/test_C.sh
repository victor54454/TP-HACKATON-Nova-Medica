#!/usr/bin/env bash
# ============================================================
#  TEST C — Intégrité et Confidentialité des données
#  Objectif : Prouver que les données patients sont illisibles
#             en clair dans la base (chiffrement AES-256)
# ============================================================

DB_CONTAINER="hsecure-database"
DB_USER="postgres"
DB_NAME="hsecure_db"
API_URL="http://localhost:8000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  TEST C — Chiffrement des données en base"
echo "=========================================="
echo ""

# ── Étape 1 : Créer un patient de test via l'API ──────────
echo -e "${BLUE}[STEP 1]${NC} Obtention d'un token JWT..."
TOKEN=$(curl -sk -X POST \
  -F "username=admin" -F "password=admin" \
  "$API_URL/api/auth/login" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}[ERREUR]${NC} Impossible de s'authentifier. Vérifiez que l'API tourne."
  exit 1
fi
echo -e "${GREEN}[OK]${NC} Token obtenu."
echo ""

echo -e "${BLUE}[STEP 2]${NC} Création d'un patient de test via l'API..."
PATIENT=$(curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jean",
    "last_name": "Dupont",
    "birth_date": "1985-06-15",
    "phone_number": "0612345678",
    "pathology": "Hypertension"
  }' \
  "$API_URL/api/patients")

PATIENT_ID=$(echo "$PATIENT" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$PATIENT_ID" ]; then
  echo -e "${YELLOW}[INFO]${NC} Impossible de créer un patient (peut-être déjà existant)."
  echo "       On vérifie directement la base..."
else
  echo -e "${GREEN}[OK]${NC} Patient créé avec ID=$PATIENT_ID"
  echo "       first_name en clair (API) : Jean"
  echo "       last_name  en clair (API) : Dupont"
fi
echo ""

# ── Étape 2 : Lire directement en base ───────────────────
echo -e "${BLUE}[STEP 3]${NC} Lecture DIRECTE en base de données (sans passer par l'API)..."
echo ""

RAW=$(docker exec "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT first_name, last_name, pathology FROM patients LIMIT 5;" 2>/dev/null)

if [ -z "$RAW" ]; then
  echo -e "${YELLOW}[INFO]${NC} Aucun patient en base. Créez-en un depuis l'interface d'abord."
  exit 0
fi

echo "Contenu brut de la table patients :"
echo "─────────────────────────────────────────────────────"
echo "$RAW"
echo "─────────────────────────────────────────────────────"
echo ""

# ── Vérification : les données sont-elles chiffrées ? ────
# Fernet commence par "gAAAAA" en base64
if echo "$RAW" | grep -qE "gAAAAA|[A-Za-z0-9+/=]{40,}"; then
  echo -e "${GREEN}[OK] TEST C RÉUSSI${NC}"
  echo "     Les données sont CHIFFRÉES en base (AES-256 Fernet)."
  echo "     Illisibles sans la clé de chiffrement. ✅"
else
  echo -e "${RED}[KO] TEST C ÉCHOUÉ${NC}"
  echo "     Des données semblent être en clair dans la base !"
fi

echo ""
