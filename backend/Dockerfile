FROM python:3.11-alpine

WORKDIR /app

# Dépendances système minimales (Alpine → apk)
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libpq-dev \
    linux-headers

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code source
COPY . .

# Pas de root → Hardening ✅
RUN adduser -D -u 1000 hsecure && chown -R hsecure:hsecure /app
USER hsecure

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]