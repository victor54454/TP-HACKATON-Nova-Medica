-- ================================================================
--  H-SECURE — Initialisation PostgreSQL
--  Clinique Nova-Médica
-- ================================================================

-- Table des utilisateurs (praticiens)
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,    -- Argon2/bcrypt hash
    role        VARCHAR(50)  NOT NULL DEFAULT 'praticien',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Table des patients (données sensibles chiffrées côté applicatif)
CREATE TABLE IF NOT EXISTS patients (
    id          SERIAL PRIMARY KEY,
    -- Champs chiffrés AES-256 (stockés en base sous forme illisible → Test C ✅)
    first_name  TEXT NOT NULL,           -- stocké chiffré
    last_name   TEXT NOT NULL,           -- stocké chiffré
    pathology   TEXT,                    -- stocké chiffré
    birth_date  DATE,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des logs d'accès (Test D ✅)
CREATE TABLE IF NOT EXISTS access_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,   -- ex: LOGIN_SUCCESS, LOGIN_FAILED, GET_PATIENT
    ip_address  VARCHAR(45),
    status      VARCHAR(20)  NOT NULL,   -- INFO | WARN | ERROR
    detail      TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Utilisateur de démo (mot de passe : "demo1234" hashé en bcrypt)
-- À régénérer avec : python -c "import bcrypt; print(bcrypt.hashpw(b'demo1234', bcrypt.gensalt()).decode())"
INSERT INTO users (username, password, role)
VALUES ('admin', '$2b$12$PLACEHOLDER_HASH_TO_REPLACE', 'admin')
ON CONFLICT (username) DO NOTHING;