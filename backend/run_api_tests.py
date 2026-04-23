"""
Tests d'intégration API — H-Secure
Prérequis : setup_test_db.py doit avoir été exécuté avant.
Usage     : python run_api_tests.py
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

GREEN = "\033[92m"
RED   = "\033[91m"
BLUE  = "\033[94m"
YELLOW = "\033[93m"
NC    = "\033[0m"

PASS = 0
FAIL = 0


def check(label: str, expected, actual, show=True):
    global PASS, FAIL
    ok = actual == expected
    mark = f"{GREEN}[OK]{NC}" if ok else f"{RED}[KO]{NC}"
    if show or not ok:
        print(f"  {mark} {label} — attendu: {expected}, obtenu: {actual}")
    if ok:
        PASS += 1
    else:
        FAIL += 1
    return ok


def section(title: str):
    print(f"\n{BLUE}{'='*50}{NC}")
    print(f"{BLUE}  {title}{NC}")
    print(f"{BLUE}{'='*50}{NC}")


# ── 1. Authentification ───────────────────────────────────────────
section("1. Authentification")
tokens = {}
credentials = {
    "admin":   "admin123",
    "accueil": "accueil123",
    "doctor":  "doctor123",
}
for username, password in credentials.items():
    resp = requests.post(f"{BASE_URL}/api/auth/login",
                         data={"username": username, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        tokens[username] = data["access_token"]
        print(f"  {GREEN}[OK]{NC} Login {username} — must_change_password={data.get('must_change_password')}")
    else:
        print(f"  {RED}[KO]{NC} Login {username} échoué : {resp.text}")
        sys.exit(1)

# Login patient (must_change_password=True car setup crée avec ce flag)
resp = requests.post(f"{BASE_URL}/api/auth/login",
                     data={"username": "jean.test", "password": "Patient@Test123!"})
check("Login jean.test (patient)", 200, resp.status_code)
if resp.status_code == 200:
    pat_data = resp.json()
    tokens["patient"] = pat_data["access_token"]
    check("must_change_password=True pour patient", True, pat_data.get("must_change_password"))

# ── 2. Profil utilisateur ─────────────────────────────────────────
section("2. Profil utilisateur (GET & PATCH /api/auth/profile)")

# Admin peut voir son profil
resp = requests.get(f"{BASE_URL}/api/auth/profile",
                    headers={"Authorization": f"Bearer {tokens['admin']}"})
check("Admin GET /api/auth/profile", 200, resp.status_code)
if resp.status_code == 200:
    prof = resp.json()
    check("Profil a un champ first_name", True, "first_name" in prof)
    check("Profil a un champ last_name",  True, "last_name"  in prof)
    check("Profil a un champ email",      True, "email"      in prof)

# Patient PEUT voir son profil (GET autorisé)
resp = requests.get(f"{BASE_URL}/api/auth/profile",
                    headers={"Authorization": f"Bearer {tokens['patient']}"})
check("Patient GET /api/auth/profile", 200, resp.status_code)

# Patient NE PEUT PAS mettre à jour son profil
resp = requests.patch(f"{BASE_URL}/api/auth/profile",
                      headers={"Authorization": f"Bearer {tokens['patient']}"},
                      json={"first_name": "HackTest"})
check("Patient PATCH /api/auth/profile (interdit)", 403, resp.status_code)

# Accueil met à jour son profil
resp = requests.patch(f"{BASE_URL}/api/auth/profile",
                      headers={"Authorization": f"Bearer {tokens['accueil']}"},
                      json={"first_name": "Alice", "last_name": "Accueil", "phone": "0612345678"})
check("Accueil PATCH /api/auth/profile", 200, resp.status_code)

# ── 3. RBAC patient — isolation de l'espace médical ──────────────
section("3. RBAC patient — isolation")

# Patient ne peut pas accéder à la liste globale des patients
resp = requests.get(f"{BASE_URL}/api/patients",
                    headers={"Authorization": f"Bearer {tokens['patient']}"})
check("Patient → GET /api/patients (interdit)", 403, resp.status_code)

# Patient ne peut pas accéder au dossier d'un autre patient
resp = requests.get(f"{BASE_URL}/api/patients/1",
                    headers={"Authorization": f"Bearer {tokens['patient']}"})
check("Patient → GET /api/patients/1 (interdit)", 403, resp.status_code)

# Patient ne peut pas créer de patient
resp = requests.post(f"{BASE_URL}/api/patients",
                     headers={"Authorization": f"Bearer {tokens['patient']}"},
                     json={"first_name": "Hack", "last_name": "Test"})
check("Patient → POST /api/patients (interdit)", 403, resp.status_code)

# Patient ne peut pas accéder à l'admin
resp = requests.get(f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {tokens['patient']}"})
check("Patient → GET /api/admin/users (interdit)", 403, resp.status_code)

# ── 4. Espace patient — lecture de ses propres données ────────────
section("4. Espace patient — /api/patient/me")

resp = requests.get(f"{BASE_URL}/api/patient/me",
                    headers={"Authorization": f"Bearer {tokens['patient']}"})
check("Patient GET /api/patient/me", 200, resp.status_code)
if resp.status_code == 200:
    data = resp.json()
    check("Dossier retourné a un id",         True, "id"         in data)
    check("Dossier retourné a un first_name", True, "first_name" in data)
    check("Dossier retourné a un last_name",  True, "last_name"  in data)
    print(f"  {YELLOW}[INFO]{NC} Patient : {data.get('first_name')} {data.get('last_name')}")

resp = requests.get(f"{BASE_URL}/api/patient/me/consultations",
                    headers={"Authorization": f"Bearer {tokens['patient']}"})
check("Patient GET /api/patient/me/consultations", 200, resp.status_code)
if resp.status_code == 200:
    print(f"  {YELLOW}[INFO]{NC} {len(resp.json())} consultation(s) trouvée(s)")

# ── 5. Création de patient (réception) ───────────────────────────
section("5. Création patient (accueil) — compte auto-créé")

patient_data = {
    "first_name": "Charlotte",
    "last_name":  "Bertrand",
    "birth_date": "1985-07-22",
    "social_security_number": "285072212345699",
    "address": "3 avenue des Tests, Lyon",
    "phone": "0698765432",
    "email": "charlotte.bertrand@example.com"
}
resp = requests.post(f"{BASE_URL}/api/patients",
                     headers={"Authorization": f"Bearer {tokens['accueil']}"},
                     json=patient_data)
check("Accueil POST /api/patients", 201, resp.status_code)
created_patient_username = None
created_temp_password    = None
if resp.status_code == 201:
    data = resp.json()
    check("Réponse contient patient_username", True, "patient_username" in data)
    check("Réponse contient temp_password",    True, "temp_password"    in data)
    created_patient_username = data.get("patient_username")
    created_temp_password    = data.get("temp_password")
    print(f"  {YELLOW}[INFO]{NC} Identifiant patient : {created_patient_username}")
    print(f"  {YELLOW}[INFO]{NC} Mot de passe temp  : {created_temp_password}")

# Le compte patient créé peut se connecter
if created_patient_username and created_temp_password:
    resp = requests.post(f"{BASE_URL}/api/auth/login",
                         data={"username": created_patient_username,
                               "password": created_temp_password})
    check("Nouveau patient peut se connecter", 200, resp.status_code)
    if resp.status_code == 200:
        check("must_change_password=True", True, resp.json().get("must_change_password"))

# ── 6. Création patient avec pathologie (praticien) ──────────────
section("6. Création patient avec pathologie (praticien)")

doc_patient = {
    "first_name": "Henri",
    "last_name":  "Curie",
    "birth_date": "1970-03-15",
    "social_security_number": "170032212345688",
    "pathology": "Exposition aux radiations"
}
resp = requests.post(f"{BASE_URL}/api/patients",
                     headers={"Authorization": f"Bearer {tokens['doctor']}"},
                     json=doc_patient)
check("Praticien POST /api/patients (avec pathologie)", 201, resp.status_code)
if resp.status_code == 201:
    data = resp.json()
    check("Réponse contient patient_username", True, "patient_username" in data)

# Accueil NE PEUT PAS créer avec pathologie
resp = requests.post(f"{BASE_URL}/api/patients",
                     headers={"Authorization": f"Bearer {tokens['accueil']}"},
                     json={**patient_data, "last_name": "PathoBlocTest",
                           "social_security_number": "285072212345700",
                           "pathology": "Test interdit"})
check("Accueil POST avec pathologie (interdit)", 403, resp.status_code)

# ── 7. RBAC accueil — pas de pathologie visible ───────────────────
section("7. RBAC accueil — pathologie masquée")

resp = requests.get(f"{BASE_URL}/api/reception/patients/",
                    headers={"Authorization": f"Bearer {tokens['accueil']}"})
check("Accueil GET /api/reception/patients/", 200, resp.status_code)
if resp.status_code == 200:
    found_pathology = any(p.get("pathology") for p in resp.json())
    check("Aucune pathologie visible pour l'accueil", False, found_pathology)

# ── 8. Admin — gestion des utilisateurs ──────────────────────────
section("8. Admin — gestion des utilisateurs")

resp = requests.get(f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {tokens['admin']}"})
check("Admin GET /api/admin/users", 200, resp.status_code)
if resp.status_code == 200:
    users = resp.json()
    patient_users = [u for u in users if u.get("role") == "patient"]
    staff_users   = [u for u in users if u.get("role") != "patient"]
    print(f"  {YELLOW}[INFO]{NC} Total : {len(users)} utilisateurs")
    print(f"  {YELLOW}[INFO]{NC} Staff : {len(staff_users)} | Patients : {len(patient_users)}")
    check("Au moins 1 compte patient visible par admin", True, len(patient_users) > 0)
    # Vérifie que first_name/last_name sont présents dans les réponses
    if patient_users:
        pu = patient_users[0]
        check("Compte patient a first_name", True, pu.get("first_name") is not None)
        check("Compte patient a last_name",  True, pu.get("last_name")  is not None)

# Admin crée un compte staff
new_staff = {
    "username": "temp_staff_test",
    "password": "TempPass2026!",
    "role": "accueil",
    "first_name": "Temp",
    "last_name": "Staff"
}
resp = requests.post(f"{BASE_URL}/api/admin/users",
                     headers={"Authorization": f"Bearer {tokens['admin']}"},
                     json=new_staff)
check("Admin POST /api/admin/users (staff)", 201, resp.status_code)

# Admin NE PEUT PAS supprimer un compte staff
resp_list = requests.get(f"{BASE_URL}/api/admin/users",
                         headers={"Authorization": f"Bearer {tokens['admin']}"})
if resp_list.status_code == 200:
    staff_id = next((u["id"] for u in resp_list.json()
                     if u["username"] == "temp_staff_test"), None)
    if staff_id:
        resp = requests.delete(f"{BASE_URL}/api/admin/users/{staff_id}",
                               headers={"Authorization": f"Bearer {tokens['admin']}"})
        check("Admin DELETE compte staff (interdit)", 403, resp.status_code)

# Admin PEUT supprimer un compte patient
if created_patient_username:
    resp_list = requests.get(f"{BASE_URL}/api/admin/users",
                             headers={"Authorization": f"Bearer {tokens['admin']}"})
    if resp_list.status_code == 200:
        pat_id = next((u["id"] for u in resp_list.json()
                       if u.get("username") == created_patient_username), None)
        if pat_id:
            resp = requests.delete(f"{BASE_URL}/api/admin/users/{pat_id}",
                                   headers={"Authorization": f"Bearer {tokens['admin']}"})
            check("Admin DELETE compte patient (autorisé)", 204, resp.status_code)

# ── 9. Récapitulatif ─────────────────────────────────────────────
section("Récapitulatif")
total = PASS + FAIL
print(f"\n  {GREEN}{PASS} OK{NC} / {RED}{FAIL} KO{NC} sur {total} tests")
if FAIL == 0:
    print(f"  {GREEN}Tous les tests sont passés ✅{NC}")
else:
    print(f"  {RED}{FAIL} test(s) en échec ❌{NC}")
print()
sys.exit(0 if FAIL == 0 else 1)
