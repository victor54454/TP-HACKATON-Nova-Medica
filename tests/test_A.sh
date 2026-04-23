#!/usr/bin/env bash
#  TEST A — Étanchéité de la Base de Données (Infra)
#  Objectif : Prouver que le frontend NE PEUT PAS atteindre
#             la base de données (segmentation réseau Zero-Trust)

set -euo pipefail

FRONTEND_CONTAINER="hsecure-frontend-app"
DB_CONTAINER="hsecure-database"
DB_PORT=5432

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  TEST A — Isolation réseau Zero-Trust"
echo "=========================================="
echo ""

# Récupère l'IP du conteneur database
DB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$DB_CONTAINER" 2>/dev/null | head -1)

if [ -z "$DB_IP" ]; then
  echo -e "${RED}[ERREUR]${NC} Container '$DB_CONTAINER' introuvable ou non démarré."
  exit 1
fi

echo -e "${YELLOW}[INFO]${NC}  Container frontend : $FRONTEND_CONTAINER"
echo -e "${YELLOW}[INFO]${NC}  IP de la base      : $DB_IP"
echo -e "${YELLOW}[INFO]${NC}  Port testé         : $DB_PORT (PostgreSQL)"
echo ""
echo "Tentative de connexion depuis le frontend vers la DB..."
echo ""

# Tente nc depuis le conteneur frontend (timeout 3s)
RESULT=$(docker exec "$FRONTEND_CONTAINER" \
  sh -c "nc -zv -w 3 $DB_IP $DB_PORT 2>&1" || true)

echo "Réponse : $RESULT"
echo ""

if echo "$RESULT" | grep -qiE "timed out|unreachable|refused|cannot|no route|Connection refused"; then
  echo -e "${GREEN}[OK] TEST A RÉUSSI${NC}"
  echo "     La base de données est INACCESSIBLE depuis le frontend."
  echo "     Segmentation réseau Zero-Trust opérationnelle. ✅"
else
  echo -e "${RED}[KO] TEST A ÉCHOUÉ${NC}"
  echo "     Le frontend peut atteindre la base — faille de segmentation !"
fi

echo ""
