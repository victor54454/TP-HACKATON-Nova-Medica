'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPatientById, updatePatient } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { User, Shield, Info, ArrowLeft, Save } from 'lucide-react';

export default function EditPatient({ params }) {
    const router = useRouter();
    const { id: patientId } = use(params);
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        birth_date: '',
        social_security_number: '',
        address: '',
        phone: '',
        email: '',
        pathology: ''
    });

    useEffect(() => {
        getPatientById(patientId)
            .then(data => {
                setFormData({
                    first_name: data.first_name,
                    last_name: data.last_name,
                    birth_date: data.birth_date,
                    social_security_number: data.social_security_number || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    pathology: data.pathology || ''
                });
                setIsLoading(false);
            })
            .catch(err => {
                setError("Erreur lors du chargement des données.");
                setIsLoading(false);
            });
    }, [patientId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Update pathology
            const payload = { ...formData };
            if (user?.role !== 'praticien') {
                delete payload.pathology;
            }

            await updatePatient(patientId, payload);
            router.push(`/patients/${patientId}`);
        } catch (err) {
            setError(err.message);
        }
    };

    if (isLoading) return <div className="flex justify-center p-20">Chargement...</div>;

    return (
        <ProtectedRoute allowedRoles={['accueil', 'praticien', 'admin']}>
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Retour
                </button>

                <h1 className="text-3xl font-bold mb-8 text-slate-900">Modifier le dossier <span className="text-blue-600">N°{patientId}</span></h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-center gap-3">
                        <Shield className="w-5 h-5" /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* INFOS PERSONNELLES */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                            <User className="w-5 h-5 text-blue-500" /> Informations personnelles
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Prénom</label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Nom</label>
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Date de naissance</label>
                                <input
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">N° Sécurité Sociale</label>
                                <input
                                    type="text"
                                    value={formData.social_security_number}
                                    onChange={e => setFormData({ ...formData, social_security_number: e.target.value })}
                                    placeholder="891234567890123"
                                    className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* COORDONNÉES */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                            <Info className="w-5 h-5 text-emerald-500" /> Coordonnées
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Adresse postale</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">Téléphone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DONNÉES DE SANTÉ*/}
                    {user?.role === 'praticien' && (
                        <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-800">
                                <Shield className="w-5 h-5 text-red-600" /> Données de santé
                            </h2>
                            <div>
                                <label className="block text-sm font-bold text-red-900 mb-2">Pathologie</label>
                                <textarea
                                    rows="4"
                                    value={formData.pathology}
                                    onChange={e => setFormData({ ...formData, pathology: e.target.value })}
                                    className="w-full p-4 border border-red-200 rounded-xl bg-white focus:ring-4 focus:ring-red-100 outline-none transition-all"
                                ></textarea>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-8 py-4 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-12 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </ProtectedRoute>
    );
}
