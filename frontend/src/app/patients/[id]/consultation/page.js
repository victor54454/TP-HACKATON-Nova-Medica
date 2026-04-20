'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { use } from 'react';

export default function NouvelleConsultation({ params }) {
    const { id: patientId } = use(params);
    const router = useRouter();
    const [formData, setFormData] = useState({
        anamnesis: '', diagnosis: '', medical_acts: '', prescription: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        alert("Données prêtes à être envoyées au backend pour chiffrement AES-256.");
        router.push(`/patients/${patientId}`);
    };

    return (
        <ProtectedRoute allowedRoles={['praticien', 'admin']}>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Saisie de Consultation - Dossier N°{patientId}</h1>
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border">
                    <div><label className="block text-sm font-medium mb-2">Anamnèse</label><textarea rows="3" className="w-full p-3 border rounded" onChange={e => setFormData({ ...formData, anamnesis: e.target.value })} required></textarea></div>
                    <div><label className="block text-sm font-medium mb-2 text-red-600">Diagnostic</label><textarea rows="2" className="w-full p-3 border border-red-300 rounded focus:ring-red-500" onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} required></textarea></div>
                    <div><label className="block text-sm font-medium mb-2">Prescription</label><textarea rows="3" className="w-full p-3 border rounded" onChange={e => setFormData({ ...formData, prescription: e.target.value })}></textarea></div>
                    <div className="flex justify-end gap-4"><button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded text-slate-600 hover:bg-slate-50">Annuler</button><button type="submit" className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">Enregistrer</button></div>
                </form>
            </div>
        </ProtectedRoute>
    );
}