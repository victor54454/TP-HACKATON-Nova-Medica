'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity, Stethoscope, Shield, Printer, FileText } from 'lucide-react';
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

    const handlePrint = (consultation) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html><head><title>Ordonnance - ${new Date(consultation.consultation_date).toLocaleDateString('fr-FR')}</title>
            <style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto}
            h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:10px}
            .info{margin:20px 0}.label{font-weight:bold;color:#555}
            .content{background:#f9f9f9;padding:15px;border-radius:4px;white-space:pre-wrap}
            .footer{margin-top:40px;border-top:1px solid #ccc;padding-top:20px;font-size:12px;color:#666}
            </style></head><body>
            <h1>Ordonnance Médicale — Clinique Nova Médica</h1>
            <div class="info"><span class="label">Patient :</span> ${patient?.last_name?.toUpperCase()} ${patient?.first_name}</div>
            <div class="info"><span class="label">Né(e) le :</span> ${patient?.birth_date}</div>
            <div class="info"><span class="label">N° Sécurité Sociale :</span> ${patient?.social_security_number || '—'}</div>
            <div class="info"><span class="label">Adresse :</span> ${patient?.address || '—'}</div>
            <div class="info"><span class="label">Téléphone :</span> ${patient?.phone || '—'}</div>
            <div class="info"><span class="label">Date de consultation :</span> ${new Date(consultation.consultation_date).toLocaleDateString('fr-FR')}</div>
            <div class="info"><span class="label">Médecin :</span> ${consultation.doctor}</div>
            ${consultation.prescription ? `<div class="info"><span class="label">Prescription :</span><div class="content">${consultation.prescription}</div></div>` : '<div class="info"><em>Aucune prescription</em></div>'}
            <div class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Clinique Nova Médica</div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

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
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-sm text-slate-500">
                                        <p className="font-bold text-slate-900">{new Date(consult.consultation_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p>Praticien : {consult.doctor}</p>
                                    </div>
                                    {consult.prescription && (
                                        <button
                                            onClick={() => handlePrint(consult)}
                                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                                        >
                                            <Printer className="w-3.5 h-3.5" /> Ordonnance
                                        </button>
                                    )}
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
                                        <p className="font-medium text-slate-800 flex items-center gap-1">
                                            <FileText className="w-3.5 h-3.5 text-slate-400" /> Ordonnance / Prescription :
                                        </p>
                                        <p className="text-slate-600 bg-slate-50 p-3 rounded mt-1 whitespace-pre-wrap">{consult.prescription}</p>
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
