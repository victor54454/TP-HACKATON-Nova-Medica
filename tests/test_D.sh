#!/usr/bin/env bash
# ============================================================
#  TEST D — Traçabilité des accès (Audit Logs)
#  Objectif : Prouver que chaque action sensible est loggée
#             ([INFO] connexion réussie, [WARN] échec)
# ============================================================

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

# ── Étape 1 : Générer une connexion RÉUSSIE ───────────────
echo -e "${BLUE}[STEP 1]${NC} Connexion réussie (admin / admin)..."
curl -sk -X POST -F "username=admin" -F "password=victor1234" \
  "$API_URL/api/auth/login" > /dev/null
echo -e "${GREEN}[OK]${NC} Requête envoyée."
echo ""

# ── Étape 2 : Générer une connexion ÉCHOUÉE ───────────────
echo -e "${BLUE}[STEP 2]${NC} Connexion échouée (admin / mauvais_mdp)..."
curl -sk -X POST -F "username=admin" -F "password=mauvais_mdp" \
  "$API_URL/api/auth/login" > /dev/null
echo -e "${GREEN}[OK]${NC} Requête envoyée."
echo ""

# ── Étape 3 : Lecture des logs Docker ─────────────────────
echo -e "${BLUE}[STEP 3]${NC} Lecture des logs du backend (30 dernières lignes)..."
echo ""
echo "─────────────────────────────────────────────────────"
docker logs --tail=30 "$BACKEND_CONTAINER" 2>&1
echo "─────────────────────────────────────────────────────"
echo ""

# ── Vérification : présence des marqueurs attendus ────────
LOGS=$(docker logs --tail=50 "$BACKEND_CONTAINER" 2>&1)

echo -e "${BLUE}[CHECK 1]${NC} Présence de [INFO] Access granted..."
if echo "$LOGS" | grep -q "Access granted"; then
  echo -e "${GREEN}[OK]${NC} Log de connexion réussie détecté ✅"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[KO]${NC} Aucun log [INFO] Access granted trouvé"
  FAIL=$((FAIL + 1))
fi

echo -e "${BLUE}[CHECK 2]${NC} Présence de [WARN] Failed login attempt..."
if echo "$LOGS" | grep -q "Failed login attempt"; then
  echo -e "${GREEN}[OK]${NC} Log de tentative échouée détecté ✅"
  PASS=$((PASS + 1))
else
  echo -e "${RED}[KO]${NC} Aucun log [WARN] Failed login attempt trouvé"
  FAIL=$((FAIL + 1))
fi

# ── Étape 4 : Vérification en base (access_logs) ──────────
echo ""
echo -e "${BLUE}[CHECK 3]${NC} Vérification de la table access_logs en base..."
ROWS=$(docker exec hsecure-database \
  psql -U postgres -d hsecure_db -t -c \
  "SELECT action, ip_address, status, detail FROM access_logs ORDER BY created_at DESC LIMIT 5;" 2>/dev/null)

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
