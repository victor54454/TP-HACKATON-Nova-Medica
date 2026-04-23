import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("--- 1. Testing Authentication ---")
    tokens = {}
    for role, creds in [("admin", "admin123"), ("accueil", "accueil123"), ("doctor", "doctor123")]:
        resp = requests.post(f"{BASE_URL}/api/auth/login", data={"username": role, "password": creds})
        if resp.status_code == 200:
            tokens[role] = resp.json()["access_token"]
            print(f"Logged in as {role}")
        else:
            print(f"Failed to login as {role}: {resp.text}")
            return

    # 2. Admin: List Users
    print("\n--- 2. Testing Admin: List Users ---")
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
    print(f"Admin User List: {resp.status_code}")
    print(json.dumps(resp.json()[:2], indent=2))

    # 3. Reception: Create Patient
    print("\n--- 3. Testing Reception: Create Patient ---")
    headers = {"Authorization": f"Bearer {tokens['accueil']}"}
    patient_data = {
        "first_name": "Jean",
        "last_name": "Dupont",
        "birth_date": "1980-01-01",
        "social_security_number": "180010112345600",
        "address": "123 Rue de Paris",
        "phone": "0123456789",
        "email": "jean.dupont@example.com"
    }
    resp = requests.post(f"{BASE_URL}/api/reception/patients/", json=patient_data, headers=headers)
    print(f"Reception Create (No pathology): {resp.status_code}")
    patient_id = resp.json().get("id")

    # 4. Reception: List Patients (Check RBAC)
    print("\n--- 4. Testing Reception: List Patients (verify no pathology) ---")
    resp = requests.get(f"{BASE_URL}/api/reception/patients/", headers=headers)
    found_pathology = any(p.get("pathology") for p in resp.json())
    print(f"Reception list contains pathology? {found_pathology}")

    # 5. Doctor: Get Patient (Check for pathology)
    print("\n--- 5. Testing Doctor: List Patients (verify pathology access) ---")
    headers_doc = {"Authorization": f"Bearer {tokens['doctor']}"}
    # Create patient with pathology
    doc_patient = patient_data.copy()
    doc_patient["last_name"] = "Curie"
    doc_patient["pathology"] = "Exposition aux radiations"
    resp = requests.post(f"{BASE_URL}/api/patients", json=doc_patient, headers=headers_doc)
    print(f"Doctor Create Patient: {resp.status_code}")
    
    # List as doctor
    resp = requests.get(f"{BASE_URL}/api/patients", headers=headers_doc)
    pathologies = [p.get("pathology") for p in resp.json() if p.get("last_name") == "Curie"]
    print(f"Doctor sees pathology? {pathologies}")

    # 6. Reception tries to see pathology
    print("\n--- 6. Testing Reception: View Doctor-created Patient ---")
    resp = requests.get(f"{BASE_URL}/api/reception/patients/", headers=headers)
    pathologies_rec = [p.get("pathology") for p in resp.json() if p.get("last_name") == "Curie"]
    print(f"Reception sees pathology? {pathologies_rec}")

    # 7. Admin: User CRUD
    print("\n--- 7. Testing Admin: Create/Delete User ---")
    headers_adm = {"Authorization": f"Bearer {tokens['admin']}"}
    new_user = {"username": "temp_user", "password": "Temp@Password1!", "role": "accueil"}
    resp = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=headers_adm)
    print(f"Admin Create User: {resp.status_code}")
    
    # Delete test
    # (Need to get id first)
    resp = requests.get(f"{BASE_URL}/api/admin/users", headers=headers_adm)
    uid = next(u["id"] for u in resp.json() if u["username"] == "temp_user")
    resp = requests.delete(f"{BASE_URL}/api/admin/users/{uid}", headers=headers_adm)
    print(f"Admin Delete User: {resp.status_code}")

if __name__ == "__main__":
    test_api()
