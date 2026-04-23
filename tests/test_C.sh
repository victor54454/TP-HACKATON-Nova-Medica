#!/usr/bin/env bash
#  TEST C — Intégrité et Confidentialité des données
#  Objectif : Prouver que les données patients sont illisibles
#             en clair dans la base (chiffrement AES-256 Fernet)
#  Objectif bonus : Vérifier que la réponse de création de patient
#             inclut les identifiants du compte généré automatiquement
#
#  Prérequis : setup_test_db.py doit avoir été exécuté

DB_CONTAINER="hsecure-database"
DB_USER="postgres"
DB_NAME="hsecure_db"
API_URL="http://localhost:8000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}[OK]${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[KO]${NC} $label — attendu: $expected, obtenu: $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=========================================="
echo "  TEST C — Chiffrement des données en base"
echo "=========================================="
echo ""

# ── STEP 1 : Authentification ────────────────────────────────────
echo -e "${BLUE}[STEP 1]${NC} Obtention d'un token JWT (accueil)..."
RESPONSE=$(curl -sk -X POST \
  -F "username=accueil" -F "password=accueil123" \
  "$API_URL/api/auth/login")
TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}[ERREUR]${NC} Impossible de s'authentifier. Vérifiez que l'API tourne et que setup_test_db.py a été exécuté."
  exit 1
fi
echo -e "${GREEN}[OK]${NC} Token obtenu."
echo ""

# ── STEP 2 : Création d'un patient ───────────────────────────────
echo -e "${BLUE}[STEP 2]${NC} Création d'un patient de test via l'API..."
PATIENT=$(curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Alice",
    "last_name":  "Testchiffrement",
    "birth_date": "1992-04-10",
    "social_security_number": "292042112345678",
    "phone": "0698765432",
    "email": "alice.test@example.com",
    "address": "10 rue du Chiffrement, Paris"
  }' \
  "$API_URL/api/patients")

PATIENT_ID=$(echo "$PATIENT" | grep -o '"id":[0-9]*' | cut -d':' -f2)
PATIENT_USERNAME=$(echo "$PATIENT" | grep -o '"patient_username":"[^"]*"' | cut -d'"' -f4)
TEMP_PWD=$(echo "$PATIENT" | grep -o '"temp_password":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PATIENT_ID" ]; then
  echo -e "${RED}[KO]${NC} Impossible de créer le patient — réponse : $PATIENT"
  FAIL=$((FAIL + 1))
else
  echo -e "${GREEN}[OK]${NC} Patient créé — id=$PATIENT_ID"
  check "Réponse contient patient_username" "true" "$([ -n "$PATIENT_USERNAME" ] && echo true || echo false)"
  check "Réponse contient temp_password"    "true" "$([ -n "$TEMP_PWD" ] && echo true || echo false)"
  echo -e "${YELLOW}[INFO]${NC} Identifiant patient : $PATIENT_USERNAME"
  echo -e "${YELLOW}[INFO]${NC} Mot de passe temporaire : $TEMP_PWD"
fi
echo ""

# ── STEP 3 : Lecture directe en base ─────────────────────────────
echo -e "${BLUE}[STEP 3]${NC} Lecture DIRECTE en base de données (sans API)..."
echo ""

RAW=$(docker exec "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT first_name, last_name, social_security_number FROM patients ORDER BY id DESC LIMIT 5;" 2>/dev/null)

if [ -z "$RAW" ]; then
  echo -e "${YELLOW}[INFO]${NC} Aucun patient en base."
  exit 0
fi

echo "Contenu brut de la table patients (colonnes chiffrées) :"
echo "─────────────────────────────────────────────────────"
echo "$RAW"
echo "─────────────────────────────────────────────────────"
echo ""

# Fernet tokens commencent par "gAAAAA"
if echo "$RAW" | grep -qE "gAAAAA|[A-Za-z0-9+/=]{40,}"; then
  echo -e "${GREEN}[C1 OK]${NC} Les données sont CHIFFRÉES en base (AES-256 Fernet) ✅"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[C1 KO]${NC} Des données semblent être en clair !"
  FAIL=$((FAIL + 1))
fi

# Vérification que "Alice" ou "Testchiffrement" n'apparaissent pas en clair
if echo "$RAW" | grep -qiE "Alice|Testchiffrement|292042112345678"; then
  echo -e "${RED}[C2 KO]${NC} Les données personnelles sont visibles en clair !"
  FAIL=$((FAIL + 1))
else
  echo -e "${GREEN}[C2 OK]${NC} Les données personnelles sont masquées en base ✅"
  PASS=$((PASS + 1))
fi

# ── STEP 4 : Vérification que le compte patient est créé en base ─
echo ""
echo -e "${BLUE}[STEP 4]${NC} Vérification du compte utilisateur patient en base..."
if [ -n "$PATIENT_USERNAME" ]; then
  USER_ROW=$(docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT username, role FROM users WHERE username = '$PATIENT_USERNAME';" 2>/dev/null)
  if echo "$USER_ROW" | grep -q "patient"; then
    echo -e "${GREEN}[C3 OK]${NC} Compte patient '$PATIENT_USERNAME' créé avec rôle 'patient' ✅"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[C3 KO]${NC} Compte patient introuvable en base"
    FAIL=$((FAIL + 1))
  fi
else
  echo -e "${YELLOW}[SKIP]${NC} Impossible de vérifier (patient non créé à l'étape 2)"
fi

# ── STEP 5 : Login avec le compte patient créé ───────────────────
if [ -n "$PATIENT_USERNAME" ] && [ -n "$TEMP_PWD" ]; then
  echo ""
  echo -e "${BLUE}[STEP 5]${NC} Connexion avec le compte patient généré..."
  PAT_RESP=$(curl -sk -X POST \
    -F "username=$PATIENT_USERNAME" -F "password=$TEMP_PWD" \
    "$API_URL/api/auth/login")
  PAT_TOKEN=$(echo "$PAT_RESP" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$PAT_TOKEN" ]; then
    echo -e "${GREEN}[C4 OK]${NC} Connexion patient réussie avec le mot de passe temporaire ✅"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[C4 KO]${NC} Connexion patient échouée — $PAT_RESP"
    FAIL=$((FAIL + 1))
  fi
fi

echo ""
echo "=========================================="
echo -e "  Résultat : ${GREEN}$PASS OK${NC} / ${RED}$FAIL KO${NC}"
echo "=========================================="
echo ""
