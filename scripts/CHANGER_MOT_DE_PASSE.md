# Changer le mot de passe admin

## Étape 1 — Générer le hash et l'injecter en DB

**Option A — En local (recommandé) :**

```bash
HASH=$(python3 scripts/generate_password_hash.py TonNouveauMotDePasse)
docker exec hsecure-database psql -U hsecure_user -d hsecure_db \
  -c "UPDATE users SET password='$HASH' WHERE username='admin';"
```

**Option B — Via le container Docker :**

```bash
docker cp scripts/generate_password_hash.py hsecure-backend:/tmp/gen.py
HASH=$(docker exec hsecure-backend python3 /tmp/gen.py TonNouveauMotDePasse)
docker exec hsecure-database psql -U hsecure_user -d hsecure_db \
  -c "UPDATE users SET password='$HASH' WHERE username='admin';"
```

> ⚠️ Ne copie-colle jamais le hash directement dans une commande shell.  
> Les `$` qu'il contient seraient interprétés par bash et le hash serait mutilé.  
> La variable `$HASH` évite ça — bash fait le transfert lui-même.

Le changement est immédiat, pas besoin de redémarrer.

---

## Cas 2 — La DB n'existe pas encore (premier démarrage)

Génère le hash et affiche-le :

```bash
python3 scripts/generate_password_hash.py TonNouveauMotDePasse
```

Copie la sortie et remplace dans `database/init.sql` :

```sql
-- Avant
VALUES ('admin', '$argon2id$...ancien hash...', 'admin')

-- Après
VALUES ('admin', '$argon2id$...nouveau hash...', 'admin')
```

> ✅ Dans `init.sql`, le copier-coller est OK — c'est du SQL brut, pas du bash.  
> Les `$` ne sont pas interprétés.

Puis lance les containers :

```bash
docker compose up -d
```

---

## Cas 3 — Remettre la DB à zéro

```bash
# Arrête et supprime le volume de la DB
docker compose down -v
# Recrée tout (init.sql sera rejoué)
docker compose up -d
```

> Le mot de passe sera celui défini dans `database/init.sql`.