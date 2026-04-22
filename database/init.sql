-- ================================================================
--  H-SECURE — Initialisation PostgreSQL (V2)
--  Clinique Nova-Médica
-- ================================================================


CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,  
    role        VARCHAR(50)  NOT NULL DEFAULT 'praticien',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS patients (
    id                     SERIAL PRIMARY KEY,
    first_name             TEXT NOT NULL,
    last_name              TEXT NOT NULL,
    social_security_number TEXT,
    birth_date             DATE,
    email_address          TEXT,
    phone_number           TEXT,
    mail_address           TEXT,
    pathology              TEXT,
    created_by             INTEGER REFERENCES users(id),
    created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
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
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=4$33vPGSOk1FrLWcv5H6P0vg$In7r06WI85Kb3EHkM/L+n+ZtP6FP/F/h6m883EVacVQ', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, role)
VALUES ('victor', '$argon2id$v=19$m=65536,t=3,p=4$33vPGSOk1FrLWcv5H6P0vg$In7r06WI85Kb3EHkM/L+n+ZtP6FP/F/h6m883EVacVQ', 'victor')
ON CONFLICT (username) DO NOTHING;

-- ================================================================
--  Principe du moindre privilège — droits restreints pour hsecure_user
--  (l'utilisateur applicatif ne peut PAS supprimer des utilisateurs
--   ni accéder aux séquences internes hors nécessité)
-- ================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE patients       TO hsecure_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE consultations  TO hsecure_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE access_logs    TO hsecure_user;
GRANT SELECT, INSERT, UPDATE          ON TABLE users         TO hsecure_user;
REVOKE DELETE                          ON TABLE users         FROM hsecure_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hsecure_user;