# Use an official Node.js image to build the app
FROM node:23-slim AS builder

ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG BASE_URL

ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV BASE_URL=${BASE_URL}

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Create .env file with values
RUN echo "VITE_SUPABASE_URL=${SUPABASE_URL}" >> /app/.env && \
    echo "VITE_SUPABASE_ANON_KEY=${SUPABASE_KEY}" >> /app/.env && \
    echo "VITE_API_URL=${BASE_URL}" >> /app/.env
# Copy the rest of the app and build
COPY . .
RUN npm run build

# Use a lightweight web server for the frontend
FROM nginx:alpine

# Copy the built app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for serving the React app
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
