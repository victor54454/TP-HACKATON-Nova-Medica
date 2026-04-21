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

-- Table des consultations médicales
CREATE TABLE IF NOT EXISTS consultations (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    praticien_id   INTEGER NOT NULL REFERENCES users(id),
    -- Champs chiffres AES-256 / AES-256 encrypted fields
    anamnesis TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    medical_acts TEXT,
    prescription TEXT,
    consultation_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
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
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=4$hhAi5Lz3nrM2prQWQiiFEA$qU8GMH4JzhyLHq3+6pa87D1zVSx6qkIFcq8ueyZk2zg', 'admin')
ON CONFLICT (username) DO NOTHING;