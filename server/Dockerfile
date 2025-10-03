FROM python:3.13-slim AS base

# Python runtime env hygiene
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies only if needed
RUN apt-get update && apt-get install -y --no-install-recommends make \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Now copy application source
COPY . .

# Expose application port
EXPOSE 8001

# Document runtime env vars (DO NOT bake secrets at build time)
# Provide at 'docker run' or via compose:
#   -e SUPABASE_URL=... -e SUPABASE_KEY=... -e GEMINI_API_KEY=...
# If a service (role) key is ever needed, inject only at runtime (never ARG/ENV in image).

# Flask run defaults (avoid --debug in container by default; set FLASK_DEBUG=1 locally when needed)
ENV FLASK_RUN_PORT=8001 \
    FLASK_RUN_HOST=0.0.0.0

CMD ["python", "-m", "flask", "--app", "app", "run"]
