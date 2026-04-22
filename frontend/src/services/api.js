// Toutes les requêtes vers le backend FastAPI
const API_URL = '';

// Headers d'authentification
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};


// Authentification
export const loginUser = async (username, password) => {
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });
    if (!response.ok) throw new Error('Identifiants invalides');
    return response.json();
};

export const changePassword = async (newPassword) => {
    const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_password: newPassword })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du changement de mot de passe');
    }
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

// Création d'un nouveau patient
export const createPatient = async (patientData) => {
    const response = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData)
    });
    if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = Array.isArray(errorData.detail)
            ? errorData.detail.map(d => d.msg).join(', ')
            : (errorData.detail || 'Erreur lors de la création du patient');
        throw new Error(errorMsg);
    }
    return response.json();
};

// Mise à jour d'un patient
export const updatePatient = async (id, patientData) => {
    const response = await fetch(`${API_URL}/api/patients/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData)
    });
    if (!response.ok) throw new Error('Erreur lors de la mise à jour du patient');
    return response.json();
};

// Suppression d'un patient
export const deletePatient = async (id) => {
    const response = await fetch(`${API_URL}/api/patients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Erreur lors de la suppression du patient');
    return true;
};

// Historique des consultations du patient
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


// Admin
export async function getUsers() {
    const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Échec du chargement des utilisateurs');
    return await response.json();
}

export async function createUser(userData) {
    const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Échec de la création de l\'utilisateur');
    }
    return await response.json();
}

export async function updateUser(userId, userData) {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Échec de la mise à jour');
    return await response.json();
}

export async function deleteUser(userId) {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Échec de la suppression');
    return true;
}