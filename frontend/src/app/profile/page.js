'use client';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { User, Shield, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <ProtectedRoute>
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                {/* En-tête de profil */}
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
                            <h2 className="text-xl font-bold text-slate-900">{user.username}</h2>
                            <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <Shield className="w-3 h-3" /> {user.role}
                            </div>
                        </div>
                    </div>

                    {/* Paramètres de sécurité */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-6">
                                <Lock className="w-5 h-5 text-emerald-600" /> Sécurité du compte
                            </h3>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    Conformément aux directives de la clinique et aux normes RGPD,
                                    nous vous recommandons de changer régulièrement votre mot de passe professionnel.
                                </p>
                            </div>

                            <Link
                                href="/change-password"
                                className="group flex items-center justify-between w-full bg-slate-900 hover:bg-black text-white p-6 rounded-2xl transition-all shadow-lg active:scale-[0.99]"
                            >
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

                        {/* Note d'information */}
                        <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">Informations de connexion</h4>
                            <p className="text-xs text-blue-600 leading-relaxed font-medium">
                                Votre compte est rattaché au pôle **Clinique Nova Médica**.
                                Toute action effectuée sur la plateforme est enregistrée dans le journal d'accès (logs)
                                conformément à notre politique de sécurité interne.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
