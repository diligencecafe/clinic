# ── Stage 1: build the React frontend ──────────────────────────────
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build          # outputs to /app/backend/static via vite config

# ── Stage 2: Python backend ────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
# bring in the built frontend from stage 1
COPY --from=frontend /app/backend/static ./static

ENV PYTHONUNBUFFERED=1
EXPOSE 5000

# Seed the database on first boot, then start the server
CMD ["sh", "-c", "python -c 'from app import app, seed; ctx=app.app_context(); ctx.push(); seed()' && gunicorn -b 0.0.0.0:${PORT:-5000} app:app"]
