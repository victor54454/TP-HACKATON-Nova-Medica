'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyPatientData, getMyConsultations } from '@/services/api';
import { User, Activity, FileText, Printer, Shield, Phone, Mail, MapPin, Calendar } from 'lucide-react';

export default function PatientDashboard() {
    const { user } = useAuth();
    const [patient, setPatient] = useState(null);
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPrescription, setSelectedPrescription] = useState(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const [patientData, consultationsData] = await Promise.all([
                    getMyPatientData(),
                    getMyConsultations(),
                ]);
                setPatient(patientData);
                setConsultations(consultationsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

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

    if (loading) return (
        <ProtectedRoute allowedRoles={['patient']}>
            <div className="p-10 text-center font-bold text-slate-500">Chargement de votre espace patient...</div>
        </ProtectedRoute>
    );

    if (error) return (
        <ProtectedRoute allowedRoles={['patient']}>
            <div className="p-10 text-center text-red-500 font-bold">{error}</div>
        </ProtectedRoute>
    );

    return (
        <ProtectedRoute allowedRoles={['patient']}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* En-tête */}
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mon Espace Santé</h1>
                    <p className="text-slate-500 font-medium">Votre dossier médical</p>
                </div>

                {/* Profil patient */}
                {patient && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
                            <User className="w-6 h-6 text-blue-600" /> Mes informations personnelles
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Identité</p>
                                <p className="text-2xl font-black text-slate-900">{patient.last_name?.toUpperCase()} {patient.first_name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date de naissance</p>
                                <p className="text-slate-700 font-semibold">{patient.birth_date}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> N° Sécurité Sociale</p>
                                <p className="text-slate-700 font-mono">{patient.social_security_number || '—'}</p>
                            </div>
                            {patient.email && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                                    <p className="text-slate-700">{patient.email}</p>
                                </div>
                            )}
                            {patient.phone && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone</p>
                                    <p className="text-slate-700">{patient.phone}</p>
                                </div>
                            )}
                            {patient.address && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Adresse</p>
                                    <p className="text-slate-700">{patient.address}</p>
                                </div>
                            )}
                        </div>

                        {patient.pathology && (
                            <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-5">
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Pathologie</p>
                                <p className="text-red-900 font-semibold">{patient.pathology}</p>
                            </div>
                        )}

                        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <p className="text-xs text-blue-700 font-medium">
                                Ces informations sont en lecture seule. Pour toute modification, veuillez contacter le service d'accueil.
                            </p>
                        </div>
                    </div>
                )}

                {/* Historique des consultations */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
                        <Activity className="w-6 h-6 text-emerald-600" /> Historique des consultations
                    </h2>

                    {consultations.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">Aucune consultation enregistrée.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {consultations.map((consult) => (
                                <div key={consult.id} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-200 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-black text-slate-900">
                                                {new Date(consult.consultation_date).toLocaleDateString('fr-FR', {
                                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                                })}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-0.5">Médecin : {consult.doctor}</p>
                                        </div>
                                        {consult.prescription && (
                                            <button
                                                onClick={() => handlePrint(consult)}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-bold transition-colors"
                                            >
                                                <Printer className="w-4 h-4" /> Ordonnance
                                            </button>
                                        )}
                                    </div>

                                    {consult.diagnosis && (
                                        <div className="mb-3">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnostic</p>
                                            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{consult.diagnosis}</p>
                                        </div>
                                    )}

                                    {consult.prescription && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <FileText className="w-3 h-3" /> Prescription
                                            </p>
                                            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{consult.prescription}</p>
                                        </div>
                                    )}

                                    {!consult.diagnosis && !consult.prescription && (
                                        <p className="text-slate-400 italic text-sm">Aucun détail disponible pour cette consultation.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
