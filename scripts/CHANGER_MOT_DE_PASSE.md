# Changer le mot de passe admin

## Étape 1 — Générer le hash

**Option A — En local (recommandé) :**
```bash
./scripts/generate_password_hash.sh TonNouveauMotDePasse
```
Le script crée automatiquement un environnement Python isolé dans `/tmp` la première fois.

**Option B — Via le container Docker :**
```bash
docker cp scripts/generate_password_hash.py hsecure-backend:/tmp/generate_password_hash.py
docker exec hsecure-backend python3 /tmp/generate_password_hash.py TonNouveauMotDePasse
```

Tu obtiens une ligne qui ressemble à ça (elle sera différente à chaque fois, c'est normal) :

```
$argon2id$v=19$m=65536,t=3,p=4$XXXX...
```

Copie ce hash.

---

## Cas 1 — La DB est en marche (containers Docker actifs)

Lance cette commande en remplaçant `COLLE_LE_HASH_ICI` par le hash généré ci-dessus :

```bash
docker exec hsecure-database psql -U hsecure_user -d hsecure_db \
  -c "UPDATE users SET password='COLLE_LE_HASH_ICI' WHERE username='admin';"
```

Le changement est immédiat, pas besoin de redémarrer.

---

## Cas 2 — La DB n'existe pas encore (premier démarrage)

Ouvre le fichier `database/init.sql` et remplace la ligne suivante :

```sql
VALUES ('admin', '$argon2id$...ancien hash...', 'admin')
```

par :

```sql
VALUES ('admin', '$argon2id$...nouveau hash...', 'admin')
```

Puis lance les containers :

```bash
docker compose up -d
```

---

## Cas 3 — Remettre la DB à zéro (repart de zéro)

```bash
# Arrête et supprime le volume de la DB
docker compose down -v

# Recrée tout (init.sql sera rejoué)
docker compose up -d
```

> Le mot de passe sera celui défini dans `database/init.sql`.
