'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// Contexte d'authentification 
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Stockage des infos de l'utilisateur 
    const [user, setUser] = useState(null);
    const router = useRouter();

    // Vérification du token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Decodage du token JWT pour récupérer le nom et le rôle de l'utilisateur
                const decoded = jwtDecode(token);
                setUser({ username: decoded.sub || decoded.username, role: decoded.role });
            } catch (error) {
                // Suppression d'un token non valide
                console.error("Token invalide ou expiré", error);
                localStorage.removeItem('token');
            }
        }
    }, []);

    // Connexion
    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setUser({ username: decoded.sub || decoded.username, role: decoded.role });

         // Retour à la page d'accueil
        router.push('/dashboard');
    };

    // Déconnexion
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        // Retour à la page de connexion
        router.push('/login'); 
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);