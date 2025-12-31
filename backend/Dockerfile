FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Build context is repo root, so copy from backend/
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project files from backend directory
COPY backend/ .

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port (Railway sets PORT env var dynamically)
EXPOSE 8000

# Run migrations and start server with Gunicorn (production-ready)
# Railway provides PORT environment variable, default to 8000 if not set
# Use shell form to allow variable expansion and command chaining
CMD sh -c "python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile -"




