# --- Étape 1 : Builder ---
FROM dhi.io/node:20-alpine3.22-dev AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Étape 2 : Runner ---
FROM dhi.io/node:20-alpine3.22-dev AS runner

WORKDIR /app

# On copie uniquement le nécessaire pour l'exécution
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Le port par défaut de Next.js
EXPOSE 3000

ENV NODE_ENV=production

# Lancement du serveur Next.js en mode production
CMD ["npm", "start"]