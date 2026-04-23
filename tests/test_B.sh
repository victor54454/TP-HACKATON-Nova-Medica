#!/usr/bin/env bash
#  TEST B — Robustesse de l'API (JWT + RBAC)
#  Objectif : Prouver que les routes sensibles sont inaccessibles
#             sans token JWT valide, et que le RBAC est respecté
#             (rôle patient isolé de l'espace médical)
#
#  Prérequis : setup_test_db.py doit avoir été exécuté

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
echo "  TEST B — Robustesse JWT & RBAC"
echo "=========================================="
echo ""

# ── B1-B4 : Accès sans / mauvais token ─────────────────────────
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

echo -e "${BLUE}[B4]${NC} GET /api/patients avec token forgé..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer token.faux.invalide" \
  "$API_URL/api/patients")
check "GET /api/patients avec token forgé" "401" "$CODE"

# ── B5 : Mauvais mot de passe ───────────────────────────────────
echo -e "${BLUE}[B5]${NC} POST /api/auth/login avec mauvais mot de passe..."
CODE=$(curl -sk -o /dev/null -w "%{http_code}" -X POST \
  -F "username=admin" -F "password=MAUVAIS_MDP" \
  "$API_URL/api/auth/login")
check "Login mauvais mot de passe" "401" "$CODE"

# ── B6-B7 : Token praticien valide ──────────────────────────────
echo ""
echo -e "${BLUE}[B6]${NC} POST /api/auth/login avec identifiants valides (doctor)..."
RESPONSE=$(curl -sk -X POST \
  -F "username=doctor" -F "password=doctor123" \
  "$API_URL/api/auth/login")
TOKEN_DOC=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN_DOC" ]; then
  echo -e "${GREEN}[OK]${NC} Token JWT praticien obtenu ✅"
  PASS=$((PASS + 1))

  echo -e "${BLUE}[B7]${NC} GET /api/patients avec token praticien valide..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_DOC" \
    "$API_URL/api/patients")
  check "GET /api/patients avec token praticien" "200" "$CODE"
else
  echo -e "${RED}[KO]${NC} Impossible d'obtenir un token JWT praticien"
  FAIL=$((FAIL + 1))
fi

# ── B8-B12 : RBAC rôle patient ──────────────────────────────────
echo ""
echo -e "${YELLOW}[INFO]${NC} Tests RBAC rôle patient (jean.test / Patient@Test123!)"

RESPONSE_PAT=$(curl -sk -X POST \
  -F "username=jean.test" -F "password=Patient@Test123!" \
  "$API_URL/api/auth/login")
TOKEN_PAT=$(echo "$RESPONSE_PAT" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
MUST_CHANGE=$(echo "$RESPONSE_PAT" | grep -o '"must_change_password":[a-z]*' | cut -d':' -f2)

if [ -n "$TOKEN_PAT" ]; then
  echo -e "${GREEN}[OK]${NC} Token JWT patient obtenu ✅"
  PASS=$((PASS + 1))
  echo -e "${YELLOW}[INFO]${NC} must_change_password = $MUST_CHANGE"

  echo -e "${BLUE}[B9]${NC} Patient → GET /api/patient/me (son propre dossier)..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_PAT" \
    "$API_URL/api/patient/me")
  check "GET /api/patient/me avec token patient" "200" "$CODE"

  echo -e "${BLUE}[B10]${NC} Patient → GET /api/patients (liste globale — interdit)..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_PAT" \
    "$API_URL/api/patients")
  check "GET /api/patients avec token patient (doit être 403)" "403" "$CODE"

  echo -e "${BLUE}[B11]${NC} Patient → GET /api/patients/1 (dossier tiers — interdit)..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_PAT" \
    "$API_URL/api/patients/1")
  check "GET /api/patients/1 avec token patient (doit être 403)" "403" "$CODE"

  echo -e "${BLUE}[B12]${NC} Patient → GET /api/admin/users (admin — interdit)..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_PAT" \
    "$API_URL/api/admin/users")
  check "GET /api/admin/users avec token patient (doit être 403)" "403" "$CODE"

  echo -e "${BLUE}[B13]${NC} Patient → GET /api/patient/me/consultations..."
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_PAT" \
    "$API_URL/api/patient/me/consultations")
  check "GET /api/patient/me/consultations avec token patient" "200" "$CODE"

else
  echo -e "${RED}[KO]${NC} Impossible d'obtenir un token JWT patient (jean.test)"
  echo -e "${YELLOW}[INFO]${NC} Vérifiez que setup_test_db.py a été exécuté."
  FAIL=$((FAIL + 5))
fi

echo ""
echo "=========================================="
echo -e "  Résultat : ${GREEN}$PASS OK${NC} / ${RED}$FAIL KO${NC}"
echo "=========================================="
echo ""
