'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getUsers, createUser, deleteUser, updateUser } from '@/services/api';
import { User, Heart, Activity } from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State création compte staff
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'accueil', first_name: '', last_name: '', phone: '', email: '' });
  const [addError, setAddError] = useState(null);

  // State édition
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});

  // State recherche
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = async (search = '') => {
    try {
      const data = await getUsers(search);
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const staffUsers = users.filter(u => u.role !== 'patient');
  const patientUsers = users.filter(u => u.role === 'patient');

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{12,}$/;

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (!passwordRegex.test(newUser.password)) {
      setAddError("Minimum 12 caractères avec majuscule, chiffre et caractère spécial (@$!%*?&)");
      return;
    }
    try {
      await createUser(newUser);
      setNewUser({ username: '', password: '', role: 'accueil', first_name: '', last_name: '', phone: '', email: '' });
      setIsAdding(false);
      fetchUsers();
    } catch (err) {
      setAddError(err.message);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setEditData({ password: '', role: user.role, first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '', email: user.email || '' });
    setIsAdding(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const data = {};
      if (editData.password) {
        if (!passwordRegex.test(editData.password)) {
          alert("Mot de passe invalide : minimum 12 caractères avec majuscule, chiffre et @$!%*?&");
          return;
        }
        data.password = editData.password;
      }
      if (editingUser.role !== 'patient') {
        if (editData.role) data.role = editData.role;
        if (editData.first_name !== undefined) data.first_name = editData.first_name || null;
        if (editData.last_name !== undefined) data.last_name = editData.last_name || null;
        if (editData.phone !== undefined) data.phone = editData.phone || null;
        if (editData.email !== undefined) data.email = editData.email || null;
      }
      if (Object.keys(data).length === 0) { setEditingUser(null); return; }
      await updateUser(editingUser.id, data);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Supprimer le compte "${username}" ? Cette action est irréversible.`)) return;
    try {
      await deleteUser(userId);
      fetchUsers(searchQuery);
    } catch (err) {
      alert(err.message);
    }
  };

  const roleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      praticien: 'bg-blue-100 text-blue-700',
      accueil: 'bg-green-100 text-green-700',
      patient: 'bg-rose-100 text-rose-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[role] || 'bg-slate-100 text-slate-700'}`}>{role}</span>;
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>

      {/* En-tête */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gradient tracking-tight">Administration</h1>
          <p className="text-slate-400 mt-1 font-medium">Gestion des comptes utilisateurs et patients.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/logs"
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-semibold"
          >
            <Activity className="w-4 h-4" />
            Logs
          </Link>
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingUser(null); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
          >
            {isAdding ? 'Annuler' : '+ Nouvel Utilisateur'}
          </button>
        </div>
      </div>

      {/* Barre de recherche*/}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Rechercher par identifiant, nom ou prénom..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/*Formulaire création*/}
      {
        isAdding && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Créer un compte staff</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'utilisateur *</label>
                  <input type="text" required value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: dr.smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe *</label>
                  <input type="password" required value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="accueil">Accueil</option>
                    <option value="praticien">Praticien</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                  <input type="text" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  <input type="text" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <input type="tel" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Créer le compte
              </button>
            </form>
          </div>
        )
      }

      {/*Formulaire édition*/}
      {
        editingUser && (
          <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200 mb-8">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">
              Modifier : {editingUser.first_name ? `${editingUser.first_name} ${editingUser.last_name}` : editingUser.username}
              {editingUser.role === 'patient' && <span className="ml-2 text-sm text-rose-600 font-normal">(compte patient)</span>}
            </h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nouveau mot de passe {editingUser.role === 'patient' ? '*' : '(optionnel)'}
                  </label>
                  <input type="password" value={editData.password}
                    onChange={e => setEditData({ ...editData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Laisser vide pour ne pas changer"
                    required={editingUser.role === 'patient'} />
                </div>
                {editingUser.role !== 'patient' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                    <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="accueil">Accueil</option>
                      <option value="praticien">Praticien</option>
                    </select>
                  </div>
                )}
                {editingUser.role !== 'patient' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                      <input type="text" value={editData.first_name}
                        onChange={e => setEditData({ ...editData, first_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                      <input type="text" value={editData.last_name}
                        onChange={e => setEditData({ ...editData, last_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input type="email" value={editData.email}
                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                      <input type="tel" value={editData.phone}
                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}
              </div>
              {editingUser.role === 'patient' && (
                <p className="text-sm text-rose-600 font-medium">
                  Le patient devra changer son mot de passe lors de sa prochaine connexion.
                </p>
              )}
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Sauvegarder
                </button>
                <button type="button" onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )
      }

      {
        loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">{error}</div>
        ) : (
          <div className="space-y-8">

            {/* Comptes Staff*/}
            <div>
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-600" /> Comptes staff ({staffUsers.length})
              </h2>
              <div className="premium-card overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Utilisateur</th>
                      <th className="px-6 py-4 font-semibold">Identité</th>
                      <th className="px-6 py-4 font-semibold">Rôle</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : <span className="italic text-slate-400">—</span>}
                        </td>
                        <td className="px-6 py-4">{roleBadge(u.role)}</td>
                        <td className="px-6 py-4 text-right">
                          {u.role !== 'admin' && (
                            <div className="flex justify-end gap-3">
                              <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                Modifier
                              </button>
                              <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {staffUsers.length === 0 && <div className="text-center p-8 text-slate-400 italic">Aucun compte staff.</div>}
              </div>
            </div>

            {/* Comptes Patients*/}
            <div>
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-rose-600" /> Comptes patients ({patientUsers.length})
              </h2>
              <div className="premium-card overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Identifiant</th>
                      <th className="px-6 py-4 font-semibold">Nom / Prénom</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {patientUsers.map(u => (
                      <tr key={u.id} className="hover:bg-rose-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                              {(u.last_name || u.username).substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900 font-mono text-sm">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {u.last_name?.toUpperCase()} {u.first_name}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{u.email || '—'}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-3">
                          <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Modifier
                          </button>
                          <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {patientUsers.length === 0 && <div className="text-center p-8 text-slate-400 italic">Aucun compte patient enregistré.</div>}
              </div>
            </div>

          </div>
        )
      }
    </ProtectedRoute >
  );
}
