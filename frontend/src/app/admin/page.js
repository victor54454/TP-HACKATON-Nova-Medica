'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getUsers, createUser, deleteUser, updateUser } from '@/services/api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State pour le formulaire de création
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('accueil');
  const [addError, setAddError] = useState(null);

  // State pour l'édition d'un utilisateur
  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
  e.preventDefault();
  setAddError(null);

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

  if (!passwordRegex.test(newPassword)) {
    setAddError(
      "Minimum 12 caractères (0-9, A-Z, @§$!...)"
    );
    return;
  }

  try {
    await createUser({ username: newUsername, password: newPassword, role: newRole });
    setNewUsername('');
    setNewPassword('');
    setIsAdding(false);
    fetchUsers();
  } catch (err) {
    setAddError(err.message);
  }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const data = {};
      if (editPassword) data.password = editPassword;
      if (editRole) data.role = editRole;

      await updateUser(editingUser.id, data);
      setEditingUser(null);
      setEditPassword('');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPassword('');
    setIsAdding(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      await deleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Administration</h1>
          <p className="text-slate-500 mt-1">Gestion des comptes utilisateurs.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {isAdding ? 'Annuler' : '+ Nouvel Utilisateur'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Créer un compte</h2>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-ghmedium text-slate-700 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="ex: dr.smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="accueil">Accueil</option>
                <option value="praticien">Praticien</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirmer la création
              </button>
            </div>
          </form>
          {addError && <p className="text-red-500 text-sm mt-3">{addError}</p>}
        </div>
      )}

      {editingUser && (
        <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Modifier : {editingUser.username}</h2>
          <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe (optionnel)</label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Laisser vide pour ne pas changer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="accueil">Accueil</option>
                <option value="praticien">Praticien</option>
                
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sauvegarder les modifications
              </button>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Utilisateur</th>
                <th className="px-6 py-4 font-semibold">Rôle</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'praticien' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button
                      onClick={() => startEdit(user)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center p-12 text-slate-400 italic">
              Aucun utilisateur trouvé.
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}