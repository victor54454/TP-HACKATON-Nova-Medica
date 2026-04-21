// Toutes les requêtes vers le backend FastAPI (via proxy nginx)
const API_URL = '';

// Génération des headers d'authentification
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Authentification

export const loginUser = async (username, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Identifiants invalides');
    return response.json();
};

// Patients
export const getPatients = async () => {
    const response = await fetch(`${API_URL}/api/patients`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération des patients');
    return response.json();
};

// Récupération d'un patient par son ID
export const getPatientById = async (id) => {
    const response = await fetch(`${API_URL}/api/patients/${id}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération du patient');
    return response.json();
};

// Créeation d'un nouveau patient
export const createPatient = async (patientData) => {
    const response = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData)
    });
    if (!response.ok) throw new Error('Erreur lors de la création du patient');
    return response.json();
};

// Récupération de l'historique des consultations d'un patient
export const getConsultations = async (patientId) => {
    const response = await fetch(`${API_URL}/api/patients/${patientId}/consultations`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération des consultations');
    return response.json();
};

// Création d'une nouvelle consultation
export const createConsultation = async (patientId, consultationData) => {
    const response = await fetch(`${API_URL}/api/patients/${patientId}/consultations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(consultationData)
    });
    if (!response.ok) throw new Error('Erreur lors de la création de la consultation');
    return response.json();
};