#!/bin/sh
# CrÃ©e l'utilisateur applicatif hsecure_user avec droits restreints.
# Tourne avant init.sql (ordre alphabÃ©tique : 00 < 01).
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
     -v "db_password=$DB_PASSWORD" \
     <<-'EOSQL'
    CREATE USER hsecure_user WITH PASSWORD :'db_password';
    GRANT CONNECT ON DATABASE hsecure_db TO hsecure_user;
    GRANT USAGE ON SCHEMA public TO hsecure_user;
EOSQL
