# ---- Backend container ----
# A slim Python base keeps the image small. We install system deps needed by
# some ML wheels, then Python deps, then copy the app.

FROM python:3.11-slim

# Avoid interactive prompts and .pyc clutter; make logs flush immediately.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.hf_cache

WORKDIR /app

# Minimal system libraries some packages (pypdf, chromadb) expect.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first so Docker can cache this layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code.
COPY app ./app

# Pre-create the storage folder for Chroma + uploads.
RUN mkdir -p storage/chroma storage/uploads

EXPOSE 8000

# Start the API. 0.0.0.0 makes it reachable from outside the container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
