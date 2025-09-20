FROM python:3.13-slim

# Accept build-time arguments
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG SUPABASE_SERVICE_KEY
ARG GEMINI_API_KEY

# Set environment variables for runtime access
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

WORKDIR /app

# Copy app files
COPY . /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create .env file with values
RUN echo "SUPABASE_URL=${SUPABASE_URL}" >> /app/.env && \
    echo "SUPABASE_KEY=${SUPABASE_KEY}" >> /app/.env && \
    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> /app/.env && \
    echo "SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}" >> /app/.env

# Install additional dependencies
RUN apt-get update && apt-get install -y make

EXPOSE 8001

# Run Flask app
CMD ["python", "-m", "flask", "--app", "app", "run", "--debug", "--port", "8001", "--host", "0.0.0.0"]
