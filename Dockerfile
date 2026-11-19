# IdentityShield v3 — Production Dockerfile
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies (curl for container healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements with pip caching layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and static assets
COPY app/ app/
COPY data/ data/
COPY generator/ generator/
COPY scripts/ scripts/
COPY static/ static/
COPY RUNBOOK_NGROK.md .
COPY smoke_test.py .

# Expose both microservice ports:
# 8000: Primary FastAPI server, Web UI, SSE live telemetry stream
# 8001: Ingestion microservice (HMAC log stream from generators/ngrok)
EXPOSE 8000 8001

# Healthcheck targeting primary server
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/health || exit 1

# Start the application server bound to 0.0.0.0, respecting the dynamic $PORT environment variable in cloud deployments
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
