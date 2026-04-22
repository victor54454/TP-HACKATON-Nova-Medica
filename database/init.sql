-- ================================================================
--  H-SECURE — Initialisation PostgreSQL (V2)
--  Clinique Nova-Médica
-- ================================================================


CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,  
    role        VARCHAR(50)  NOT NULL DEFAULT 'praticien',
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS patients (
    id          SERIAL PRIMARY KEY,  
    first_name  TEXT NOT NULL,           
    last_name   TEXT NOT NULL,           
    social_security_number TEXT NOT NULL,         
    birth_date  DATE,
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    pathology   TEXT,                  
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS consultations (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   INTEGER REFERENCES users(id),
    consultation_date TIMESTAMP NOT NULL DEFAULT NOW(),
    anamnesis    TEXT,  
    diagnosis    TEXT,  
    medical_acts TEXT,  
    prescription TEXT,  
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS access_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,   
    ip_address  VARCHAR(45),
    status      VARCHAR(20)  NOT NULL,   
    detail      TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (username, password, role)
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=4$YmU4OWI5MThkNDEyZGYyNA$w9hW3tKq6U/7n/F0/m9jZg', 'admin')
ON CONFLICT (username) DO NOTHING;