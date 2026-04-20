# TP-HACKATON-Nova-Medica

Générationd des clefs JWT : 

```
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(32))"
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```
