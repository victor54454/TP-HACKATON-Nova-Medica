# TP-HACKATON-Nova-Medica

## Contexte
Ce projet a été réalisé dans le cadre d’un projet de développement d’une application web sécurisée de gestion médicale.

L’objectif est de concevoir une application permettant à un établissement médical de gérer :

Les patients
Les consultations médicales
Les utilisateurs (médecins, agents d’accueil, administrateurs)
L’authentification sécurisée via JWT

L’application repose sur une architecture Frontend / Backend avec communication via API REST sécurisée.

Le projet met en œuvre :

La gestion des rôles et autorisations (RBAC)
La sécurisation des accès par token JWT
La gestion des données sensibles médicales
Une base de données relationnelle


## Objectifs

Implémenter une authentification sécurisée
Mettre en place un système de rôles (ADMIN, MEDECIN, AGENT_ACCUEIL)
Permettre la gestion complète des patients
Permettre la création et le suivi des consultations
Implémenter une API REST sécurisée
Connecter le frontend au backend



## Installation 

git clone <repo_url>
cd TP-HACKATHON-Nova-Medica
cp .env.example .env
Générationd des clefs JWT : 

# Configuration
```
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(32))"
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

# Lancement

docker-compose up --build

# Acces

API : http://localhost:8000

https://github.com/victor54454/Gr8-HACKATON-2026.git



## Gestion des consultations

Date de consultation
Anamnèse (symptômes et antécédents)
Diagnostic
Ordonnance     
 <chaque consultation est liée a un patient et un médecin>




## Authentification et securite
POST /auth/login                  
<Sert à connecter un utilisateur>


## Patient
Patients
GET/patients
POST/patients
PUT/patients/{id}    
 <Récupère la liste des patients>

## Consultations

post/consultations
get/patients/{id}/consultations
<pour Modifier un patient spécifique>

## ADMIN

GET /users
POST /users
PUT /users/{id}


## Sécurité

Mots de passe hashés
JWT avec expiration
Routes protégées par middleware
Vérification des rôles pour les actions sensibles