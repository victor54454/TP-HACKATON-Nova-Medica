'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Activity, Stethoscope } from 'lucide-react';
import { useState, useEffect, use } from 'react';
import { getPatientById, getConsultations, deletePatient } from '@/services/api';


export default function PatientProfile({ params }) {
    // Unwrapping des paramètres de l'URL
    const { id: patientId } = use(params);
    const { user } = useAuth();

    const [patient, setPatient] = useState(null);
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [patientData, consultationsData] = await Promise.all([
                    getPatientById(patientId),
                    getConsultations(patientId)
                ]);
                setPatient(patientData);
                setConsultations(consultationsData);
            } catch (error) {
                console.error("Erreur lors du chargement des données du patient:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [patientId]);

    if (loading) return <div className="p-10 text-center font-bold">Chargement du dossier...</div>;
    if (!patient) return <div className="p-10 text-center font-bold text-red-500">Patient introuvable.</div>;

    return (
        <ProtectedRoute>
            {/* Profile patient avec bouton pour nouvelle consultation*/}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{patient.last_name.toUpperCase()} {patient.first_name} </h1>
                    <p className="text-slate-500 font-mono mt-1">
                        Adresse : {patient.address}
                        <br /> Email : {patient.email}
                        <br /> Téléphone : {patient.phone}
                        <br /> N° Sécurité Sociale : {patient.social_security_number}
                        <br /> Né(e) le : {patient.birth_date}
                    </p>

                </div>
                <div className="flex gap-2">
                    {(user?.role === 'accueil' || user?.role === 'praticien' || user?.role === 'admin') && (
                        <Link href={`/patients/${patientId}/edit`} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition font-bold">
                            Modifier le dossier
                        </Link>
                    )}
                    {(user?.role === 'praticien') && (
                        <button
                            onClick={async () => {
                                if (confirm("Voulez-vous vraiment supprimer ce patient ?")) {
                                    await deletePatient(patientId);
                                    router.push('/dashboard');
                                }
                            }}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg transition font-bold"
                        >
                            Supprimer
                        </button>
                    )}
                    {(user?.role === 'praticien') && (
                        <Link href={`/patients/${patientId}/consultation`} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-bold shadow-sm">
                            <Stethoscope className="w-4 h-4" /> Nouvelle consultation
                        </Link>
                    )}
                </div>
            </div>

            {/*Historique Médical */}
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-red-500" /> Historique médical</h2>
            <div className="space-y-4">
                {consultations.map(consult => (
                    <div key={consult.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
                        <div className="flex justify-between text-sm text-slate-500 mb-2">
                            <span>Date : {consult.date}</span>
                            <span>Praticien : {consult.doctor}</span>
                        </div>
                        <p className="font-medium text-slate-800 mt-2">Diagnostic :</p>
                        <p className="text-slate-600 bg-slate-50 p-3 rounded mt-1">{consult.diagnosis}</p>
                    </div>
                ))}
                {/* Message si historique vide */}
                {consultations.length === 0 && <p className="text-slate-500 italic">Aucune consultation enregistrée.</p>}
            </div>
        </ProtectedRoute>
    );
}