-- ================================================================
--  H-SECURE â€” Initialisation PostgreSQL (V2)
--  Clinique Nova-MÃ©dica
-- ================================================================


CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'praticien',
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    phone       VARCHAR(20),
    email       VARCHAR(200),
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
    user_account_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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

-- Table des logs d'accÃ¨s (Test D âœ…)
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
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=4$+R9jDCHEmDPGmPMewzintA$Ys0SM9NrbxduKgnDz5jCIAoI2kimUU58h8byBBSaS3o', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, role)
VALUES ('victor', '$argon2id$v=19$m=65536,t=3,p=4$7937f2+tNcbYO4cw5rzXGg$YTKo+wSbNsZSt0lNqKkjs+kcMZk6PIphm4ClxLbtdhs', 'praticien')
ON CONFLICT (username) DO NOTHING;

-- ================================================================
--  Droits applicatifs pour hsecure_user
--  DELETE sur users autorisé uniquement pour la suppression des comptes patients
--  (restriction appliquée au niveau applicatif : role='patient' uniquement)
-- ================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE patients       TO hsecure_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE consultations  TO hsecure_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE access_logs    TO hsecure_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users          TO hsecure_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hsecure_user;
