from cryptography.fernet import Fernet
from config import settings


# Initialisation de la clé Fernet 
_fernet = Fernet(settings.encryption_key.encode())

#Chiffrage des données sensibles bdd
def encrypt(plain_text: str) -> str:
    if not plain_text:
        return plain_text
    return _fernet.encrypt(plain_text.encode()).decode()

#Dechiffrage des données sensibles bdd
def decrypt(cipher_text: str) -> str:
    if not cipher_text:
        return cipher_text
    try:
        return _fernet.decrypt(cipher_text.encode()).decode()
    except Exception:
        return "[Erreur chiffrement]"