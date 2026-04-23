'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { User, Shield, Lock, ChevronRight, Phone, Mail, Save } from 'lucide-react';
import Link from 'next/link';
import { getProfile, updateProfile } from '@/services/api';

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;
        getProfile()
            .then(data => {
                setProfile(data);
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                });
            })
            .catch(err => console.error("Erreur chargement profil:", err));
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const payload = {};
            if (formData.first_name) payload.first_name = formData.first_name;
            if (formData.last_name) payload.last_name = formData.last_name;
            if (formData.phone) payload.phone = formData.phone;
            if (formData.email) payload.email = formData.email;
            const updated = await updateProfile(payload);
            setProfile(updated);
            setEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!user || !profile) return null;

    return (
        <ProtectedRoute allowedRoles={['admin', 'praticien', 'accueil']}>
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mon Profil</h1>
                    <p className="text-slate-500 font-medium tracking-wide">Gestion de mon compte professionnel</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Carte d'identité */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-center p-8">
                            <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-inner">
                                <User className="w-12 h-12 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {profile.first_name && profile.last_name
                                    ? `${profile.first_name} ${profile.last_name}`
                                    : profile.username}
                            </h2>
                            {profile.first_name && <p className="text-slate-500 text-sm mt-1">@{profile.username}</p>}
                            <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <Shield className="w-3 h-3" /> {profile.role}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {/* Informations personnelles */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                    <User className="w-5 h-5 text-blue-600" /> Informations personnelles
                                </h3>
                                {!editing && (
                                    <button onClick={() => setEditing(true)}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
                                        Modifier
                                    </button>
                                )}
                            </div>

                            {success && (
                                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl mb-4 text-sm font-bold border border-emerald-200">
                                    Profil mis à jour avec succès !
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm font-bold border border-red-200">
                                    {error}
                                </div>
                            )}

                            {editing ? (
                                <form onSubmit={handleSave} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Prénom</label>
                                            <input type="text" value={formData.first_name}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Nom</label>
                                            <input type="text" value={formData.last_name}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone</label>
                                        <input type="tel" value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email professionnel</label>
                                        <input type="email" value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" disabled={saving}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50">
                                            <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                                        </button>
                                        <button type="button" onClick={() => setEditing(false)}
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-all">
                                            Annuler
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prénom</p>
                                            <p className="text-slate-800 font-semibold">{profile.first_name || <span className="text-slate-400 italic">Non renseigné</span>}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nom</p>
                                            <p className="text-slate-800 font-semibold">{profile.last_name || <span className="text-slate-400 italic">Non renseigné</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone</p>
                                        <p className="text-slate-800 font-semibold">{profile.phone || <span className="text-slate-400 italic">Non renseigné</span>}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                                        <p className="text-slate-800 font-semibold">{profile.email || <span className="text-slate-400 italic">Non renseigné</span>}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sécurité */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-6">
                                <Lock className="w-5 h-5 text-emerald-600" /> Sécurité du compte
                            </h3>
                            <Link href="/change-password"
                                className="group flex items-center justify-between w-full bg-slate-900 hover:bg-black text-white p-6 rounded-2xl transition-all shadow-lg active:scale-[0.99]">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-800 p-3 rounded-xl group-hover:bg-slate-700 transition-colors">
                                        <Lock className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold">Modifier mon mot de passe</div>
                                        <div className="text-slate-400 text-xs mt-0.5">Renforcer la sécurité de mon accès</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">Informations de connexion</h4>
                            <p className="text-xs text-blue-600 leading-relaxed font-medium">
                                Votre compte est rattaché au pôle Clinique Nova Médica.
                                Toute action effectuée sur la plateforme est enregistrée dans le journal d'accès
                                conformément à notre politique de sécurité interne.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
