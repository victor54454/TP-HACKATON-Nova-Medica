FROM dhi.io/node:20-alpine3.22-dev AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Baked at build time — valeur injectée depuis docker-compose build args
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- Image de production (non-root, minimal) ---
FROM dhi.io/node:20-alpine3.22-dev AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN adduser -D -u 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
