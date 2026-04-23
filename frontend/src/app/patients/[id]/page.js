'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity, Stethoscope, Shield } from 'lucide-react';
import { useState, useEffect, use } from 'react';
import { getPatientById, getConsultations, deletePatient } from '@/services/api';


export default function PatientProfile({ params }) {
    const { id: patientId } = use(params);
    const { user } = useAuth();
    const router = useRouter();

    const [patient, setPatient] = useState(null);
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user === null) return;
        const fetchData = async () => {
            try {
                const patientData = await getPatientById(patientId);
                setPatient(patientData);
                if (user?.role === 'praticien') {
                    const consultationsData = await getConsultations(patientId);
                    setConsultations(consultationsData);
                }
            } catch (error) {
                console.error("Erreur lors du chargement des données du patient:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [patientId, user]);

    if (loading) return <div className="p-10 text-center font-bold">Chargement du dossier...</div>;
    if (!patient) return <div className="p-10 text-center font-bold text-red-500">Patient introuvable.</div>;

    return (
        <ProtectedRoute allowedRoles={['accueil', 'praticien', 'admin']}>
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
                    {(user?.role === 'praticien' || user?.role === 'accueil') && (
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

                    {/* Print button — praticien only / Bouton impression — praticien uniquement */}
{user?.role === 'praticien' && (
    <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-bold shadow-sm"
    >
        🖨️ Imprimer / Print
    </button>
)}

                    
                </div>
            </div>

            {/* Données de santé — réservé au praticien */}
            {user?.role === 'praticien' && patient.pathology && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-600" /> Pathologie
                    </h2>
                    <p className="text-red-900">{patient.pathology}</p>
                </div>
            )}

            {/*Historique Médical — réservé aux praticiens */}
            {user?.role === 'praticien' && (
                <>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-red-500" /> Historique médical</h2>
                    <div className="space-y-4">
                        {consultations.map(consult => (
                            <div key={consult.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500 space-y-3">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Date : {new Date(consult.consultation_date).toLocaleDateString('fr-FR')}</span>
                                    <span>Praticien : {consult.doctor}</span>
                                </div>
                                {consult.anamnesis && (
                                    <div>
                                        <p className="font-medium text-slate-800">Anamnèse :</p>
                                        <p className="text-slate-600 bg-slate-50 p-3 rounded mt-1">{consult.anamnesis}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-slate-800">Diagnostic :</p>
                                    <p className="text-slate-600 bg-slate-50 p-3 rounded mt-1">{consult.diagnosis}</p>
                                </div>
                                {consult.prescription && (
                                    <div>
                                        <p className="font-medium text-slate-800">Ordonnance :</p>
                                        <p className="text-slate-600 bg-slate-50 p-3 rounded mt-1">{consult.prescription}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {consultations.length === 0 && <p className="text-slate-500 italic">Aucune consultation enregistrée.</p>}
                    </div>
                </>
            )}
        </ProtectedRoute>
    );
}
