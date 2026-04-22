#!/usr/bin/env bash
# Crée l'utilisateur applicatif hsecure_user avec droits restreints.
# Tourne avant init.sql (ordre alphabétique : 00 < 01).
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    CREATE USER hsecure_user WITH PASSWORD '${DB_PASSWORD}';
    GRANT CONNECT ON DATABASE hsecure_db TO hsecure_user;
    GRANT USAGE ON SCHEMA public TO hsecure_user;
EOSQL
