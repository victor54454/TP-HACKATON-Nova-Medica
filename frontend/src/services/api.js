const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Port par défaut de FastAPI

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// --- AUTHENTIFICATION ---
export const loginUser = async (username, password) => {
  // Adaptation possible selon comment le back Python gère le login (json vs form data)
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) throw new Error('Identifiants invalides');
  return response.json();
};

// --- PATIENTS ---
export const getPatients = async () => {
  const response = await fetch(`${API_URL}/patients`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Erreur récupération patients');
  return response.json();
};

export const getPatientById = async (id) => {
  const response = await fetch(`${API_URL}/patients/${id}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Erreur récupération du patient');
  return response.json();
};

export const createPatient = async (patientData) => {
  const response = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(patientData)
  });
  if (!response.ok) throw new Error('Erreur création patient');
  return response.json();
};

// --- CONSULTATIONS ---
export const createConsultation = async (patientId, consultationData) => {
  const response = await fetch(`${API_URL}/patients/${patientId}/consultations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(consultationData)
  });
  if (!response.ok) throw new Error('Erreur création consultation');
  return response.json();
};