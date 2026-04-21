FROM dhi.io/python:3.11-alpine3.22-dev

WORKDIR /app

# Dépendances système minimales
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libpq-dev \
    linux-headers

# dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 
RUN adduser -D -u 1000 orktk && chown -R orktk:orktk /app
USER orktk

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]