#!/usr/bin/env bash
#  TEST D — Traçabilité des accès (Audit Logs)
#  Objectif : Prouver que chaque action sensible est loggée :
#             [INFO] connexion réussie, [WARN] échec, création patient
#             + vérification de la table access_logs en base
#
#  Prérequis : setup_test_db.py doit avoir été exécuté

BACKEND_CONTAINER="hsecure-backend"
API_URL="http://localhost:8000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

echo ""
echo "=========================================="
echo "  TEST D — Traçabilité des accès"
echo "=========================================="
echo ""

# ── STEP 1 : Générer une connexion RÉUSSIE (admin) ───────────────
echo -e "${BLUE}[STEP 1]${NC} Connexion réussie (admin / admin123)..."
RESPONSE=$(curl -sk -X POST -F "username=admin" -F "password=admin123" \
  "$API_URL/api/auth/login")
TOKEN_ADM=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}[OK]${NC} Requête envoyée."
echo ""

# ── STEP 2 : Générer une connexion ÉCHOUÉE ───────────────────────
echo -e "${BLUE}[STEP 2]${NC} Connexion échouée (admin / mauvais_mdp)..."
curl -sk -X POST -F "username=admin" -F "password=mauvais_mdp" \
  "$API_URL/api/auth/login" > /dev/null
echo -e "${GREEN}[OK]${NC} Requête envoyée."
echo ""

# ── STEP 3 : Générer une création de patient ─────────────────────
echo -e "${BLUE}[STEP 3]${NC} Création d'un patient pour générer un log CREATE_PATIENT..."
if [ -n "$TOKEN_ADM" ]; then
  TOKEN_ACC=$(curl -sk -X POST -F "username=accueil" -F "password=accueil123" \
    "$API_URL/api/auth/login" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$TOKEN_ACC" ]; then
    curl -sk -X POST \
      -H "Authorization: Bearer $TOKEN_ACC" \
      -H "Content-Type: application/json" \
      -d '{
        "first_name": "Trace",
        "last_name": "Audit",
        "birth_date": "1975-09-20",
        "social_security_number": "175092012345670",
        "phone": "0677777777"
      }' \
      "$API_URL/api/patients" > /dev/null
    echo -e "${GREEN}[OK]${NC} Patient de traçabilité créé."
  else
    echo -e "${YELLOW}[SKIP]${NC} Token accueil indisponible."
  fi
fi
echo ""

# ── STEP 4 : Générer une connexion patient ───────────────────────
echo -e "${BLUE}[STEP 4]${NC} Connexion patient (jean.test)..."
curl -sk -X POST -F "username=jean.test" -F "password=Patient@Test123!" \
  "$API_URL/api/auth/login" > /dev/null
echo -e "${GREEN}[OK]${NC} Requête envoyée."
echo ""

# ── STEP 5 : Lecture des logs Docker ─────────────────────────────
echo -e "${BLUE}[STEP 5]${NC} Lecture des logs du backend (40 dernières lignes)..."
echo ""
echo "─────────────────────────────────────────────────────"
docker logs --tail=40 "$BACKEND_CONTAINER" 2>&1
echo "─────────────────────────────────────────────────────"
echo ""

LOGS=$(docker logs --tail=80 "$BACKEND_CONTAINER" 2>&1)

# ── Checks logs ──────────────────────────────────────────────────
echo -e "${BLUE}[CHECK 1]${NC} Présence de [INFO] Access granted (connexion réussie)..."
if echo "$LOGS" | grep -q "Access granted"; then
  echo -e "${GREEN}[OK]${NC} Log connexion réussie détecté ✅"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[KO]${NC} Aucun log [INFO] Access granted trouvé"
  FAIL=$((FAIL + 1))
fi

echo -e "${BLUE}[CHECK 2]${NC} Présence de [WARN] Failed login attempt (connexion échouée)..."
if echo "$LOGS" | grep -q "Failed login attempt"; then
  echo -e "${GREEN}[OK]${NC} Log tentative échouée détecté ✅"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[KO]${NC} Aucun log [WARN] Failed login attempt trouvé"
  FAIL=$((FAIL + 1))
fi

echo -e "${BLUE}[CHECK 3]${NC} Présence d'un log de création patient (CREATE_PATIENT ou Patient créé)..."
if echo "$LOGS" | grep -qiE "CREATE_PATIENT|Patient.*créé|patient.*créé"; then
  echo -e "${GREEN}[OK]${NC} Log création patient détecté ✅"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[KO]${NC} Aucun log de création patient trouvé"
  FAIL=$((FAIL + 1))
fi

# ── Check table access_logs ──────────────────────────────────────
echo ""
echo -e "${BLUE}[CHECK 4]${NC} Vérification de la table access_logs en base..."
ROWS=$(docker exec hsecure-database \
  psql -U postgres -d hsecure_db -t -c \
  "SELECT action, status, detail FROM access_logs ORDER BY created_at DESC LIMIT 8;" 2>/dev/null)

if [ -n "$ROWS" ]; then
  echo -e "${GREEN}[OK]${NC} Entrées dans access_logs ✅"
  echo ""
  echo "Dernières entrées :"
  echo "─────────────────────────────────────────────────────"
  echo "$ROWS"
  echo "─────────────────────────────────────────────────────"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[KO]${NC} La table access_logs est vide"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=========================================="
echo -e "  Résultat : ${GREEN}$PASS OK${NC} / ${RED}$FAIL KO${NC}"
echo "=========================================="
echo ""
