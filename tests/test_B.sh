#!/usr/bin/env bash
# ============================================================
#  TEST B — Robustesse de l'API (JWT)
#  Objectif : Prouver que les routes sensibles sont inaccessibles
#             sans token JWT valide (401 Unauthorized)
# ============================================================

API_URL="http://localhost:8000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}[OK]${NC} $label → HTTP $actual"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[KO]${NC} $label → attendu HTTP $expected, obtenu HTTP $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=========================================="
echo "  TEST B — Robustesse JWT de l'API"
echo "=========================================="
echo ""

# ── B1 : Accès sans token ─────────────────────────────────
echo -e "${BLUE}[B1]${NC} GET /api/patients sans token..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$API_URL/api/patients")
check "GET /api/patients sans Authorization" "401" "$CODE"

echo -e "${BLUE}[B2]${NC} GET /api/patients/1 sans token..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$API_URL/api/patients/1")
check "GET /api/patients/1 sans Authorization" "401" "$CODE"

echo -e "${BLUE}[B3]${NC} POST /api/patients sans token..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"Hack"}' \
  "$API_URL/api/patients")
check "POST /api/patients sans Authorization" "401" "$CODE"

# ── B4 : Token invalide ───────────────────────────────────
echo -e "${BLUE}[B4]${NC} GET /api/patients avec token forgé..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer token.faux.invalide" \
  "$API_URL/api/patients")
check "GET /api/patients avec token forgé" "401" "$CODE"

# ── B5 : Connexion avec mauvais mot de passe ──────────────
echo -e "${BLUE}[B5]${NC} POST /api/auth/login avec mauvais mot de passe..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" -X POST \
  -F "username=admin" -F "password=MAUVAIS_MDP" \
  "$API_URL/api/auth/login")
check "Login mauvais mot de passe" "401" "$CODE"

# ── B6 : Login valide → token obtenu ─────────────────────
echo ""
echo -e "${BLUE}[B6]${NC} POST /api/auth/login avec identifiants valides..."
RESPONSE=$(curl -sk -X POST \
  -F "username=admin" -F "password=admin" \
  "$API_URL/api/auth/login")
TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}[OK]${NC} Token JWT obtenu ✅"
  PASS=$((PASS + 1))

  # B7 : Accès avec token valide
  echo -e "${BLUE}[B7]${NC} GET /api/patients avec token valide..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/patients")
  check "GET /api/patients avec token valide" "200" "$CODE"
else
  echo -e "${RED}[KO]${NC} Impossible d'obtenir un token JWT"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=========================================="
echo -e "  Résultat : ${GREEN}$PASS OK${NC} / ${RED}$FAIL KO${NC}"
echo "=========================================="
echo ""
