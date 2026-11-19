# IdentityShield v3 — Live Generator & ngrok Operational Runbook

This runbook guides operators through exposing IdentityShield's Port 8001 Ingestion microservice to remote attack generators (Laptop 2 / external forwarders) via an **ngrok** tunnel.

---

## 1. Architecture Overview

- **Port 8000**: IdentityShield primary FastAPI server (Web UI, SSE streaming, 15-agent fleet, REST API).
- **Port 8001**: Dedicated secure log ingestion microservice (`app/v3/ingest/service.py`).
  - `POST /ingest/v1/events`: HMAC-SHA256 authenticated log stream.
  - `GET /ingest/v1/health`: Telemetry, batch counters, and backpressure check.
- **ngrok Tunnel**: Exposes port **8001** to the public internet with TLS termination.
- **Local Inspection Dashboard**: Accessible at `http://127.0.0.1:4040` (requests, response codes, replay inspector).

---

## 2. Prerequisites & Quota Limits

- **ngrok Free Tier Limits**:
  - Maximum **20,000** requests per month.
  - Rate limit: 40 requests/minute.
- Always monitor the quota indicator in the generator UI to prevent burning through the 20,000 monthly allotment during high-velocity attack simulations.

---

## 3. Starting the Tunnel

1. Verify the IdentityShield server is running with port 8001 listening:
   ```powershell
   Get-NetTCPConnection -LocalPort 8001
   ```

2. Start the ngrok tunnel forwarding traffic to port **8001**:
   ```bash
   ngrok http 8001
   ```

3. Note the public forwarding URL displayed in the ngrok terminal (e.g. `https://<subdomain>.ngrok-free.app`).

4. Open the ngrok Web Interface at **http://127.0.0.1:4040** to inspect live HTTP traffic and inspect headers.

---

## 4. Connecting the Attack Generator

1. Open the generator at `/generator/index.html` or from the secondary machine.
2. Enter the Target URL: `https://<subdomain>.ngrok-free.app/ingest/v1/events`.
3. Set the Key ID and Secret Key matching `INGEST_KEYS` in your `.env` file (e.g. `gen-laptop2` / your 32+ char secret).
4. Select scenario **E1** through **E9** and click **Send Signed Event Stream**.

---

## 5. Troubleshooting

- **HTTP 401 Unauthorized (`Unknown key ID` / `Invalid signature`)**:
  - Verify that `INGEST_KEYS` in `.env` contains the matching `key_id:secret` pair.
  - Check clock synchronization: timestamp skew must not exceed 300 seconds.
- **HTTP 429 Too Many Requests**:
  - The token-bucket rate limiter enforces limits per key ID. Back off simulation pace.
- **HTTP 404 Not Found**:
  - Ensure the ngrok tunnel forwards to port **8001** (not 8000). Check `http://127.0.0.1:4040` to see what endpoint was hit.
- **CORS / Preflight Warning**:
  - Include the `ngrok-skip-browser-warning: 1` header if accessing through standard web browsers on free ngrok domains.
