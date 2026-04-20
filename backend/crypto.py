from cryptography.fernet import Fernet
from config import settings


# Initialisation de la clé Fernet (AES-256 sous le capot)
_fernet = Fernet(settings.encryption_key.encode())


def encrypt(plain_text: str) -> str:
    """Chiffre une chaîne — ce qui est stocké en DB est illisible (Test C ✅)"""
    if not plain_text:
        return plain_text
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt(cipher_text: str) -> str:
    """Déchiffre une chaîne récupérée depuis la DB"""
    if not cipher_text:
        return cipher_text
    try:
        return _fernet.decrypt(cipher_text.encode()).decode()
    except Exception:
        # Ne jamais exposer les détails d'une erreur de déchiffrement
        return "[ERREUR DÉCHIFFREMENT]"