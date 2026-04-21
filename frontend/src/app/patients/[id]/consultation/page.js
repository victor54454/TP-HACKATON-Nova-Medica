'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createConsultation } from '@/services/api';
import { useAuth } from '@/context/AuthContext';


export default function NouvelleConsultation({ params }) {
    const router = useRouter();
    // Unwrapping de l'ID du patient depuis l'URL
    const { id: patientId } = use(params);

    // État local du formulaire de consultation
    const [formData, setFormData] = useState({
        anamnesis: '', diagnosis: '', medical_acts: '', prescription: ''
    });


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Appel API pour créer la consultation
            await createConsultation(patientId, formData);
            router.push(`/patients/${patientId}`);
        } catch (error) {
            console.error(error);
            alert(error.message || "Erreur lors de l'enregistrement de la consultation.");
        }
    };

    return (
        <ProtectedRoute allowedRoles={['praticien', 'admin']}>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-slate-900 leading-tight">Saisie de consultation <br /><span className="text-blue-600">Dossier patient N°{patientId}</span></h1>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                    {/* Champs de saisie avec labels clairs */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Anamnèse</label>
                        <textarea
                            rows="3"
                            className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, anamnesis: e.target.value })}
                            required
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-red-600 mb-2">Diagnostic</label>
                        <textarea
                            rows="2"
                            className="w-full p-4 border border-red-200 rounded-xl bg-red-50/30 focus:bg-white focus:ring-4 focus:ring-red-100 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                            required
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ordonnance</label>
                        <textarea
                            rows="3"
                            className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            onChange={e => setFormData({ ...formData, prescription: e.target.value })}
                        ></textarea>
                    </div>

                    {/* Actions du formulaire */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-8 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </ProtectedRoute>
    );
}