
FROM nginx:stable-alpine

# Install required packages
RUN apk add --no-cache openssl

# Create directory for SSL certificates
RUN mkdir -p /etc/nginx/certs

# Set up logging directories
RUN mkdir -p /var/log/nginx
RUN touch /var/log/nginx/access.log /var/log/nginx/error.log
RUN chmod 666 /var/log/nginx/access.log /var/log/nginx/error.log

# Copy configuration template
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Generate self-signed certificates during container startup to avoid issues
RUN echo '#!/bin/sh' > /docker-entrypoint.d/10-generate-certs.sh && \
    echo 'if [ ! -f "/etc/nginx/certs/server.key" ] || [ ! -f "/etc/nginx/certs/server.crt" ]; then' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '  echo "Generating self-signed certificates..."' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '  mkdir -p /etc/nginx/certs' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '    -keyout /etc/nginx/certs/server.key \' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '    -out /etc/nginx/certs/server.crt \' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '  chmod 644 /etc/nginx/certs/server.key /etc/nginx/certs/server.crt' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '  echo "Certificates generated successfully"' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo 'else' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo '  echo "Certificates already exist, skipping generation"' >> /docker-entrypoint.d/10-generate-certs.sh && \
    echo 'fi' >> /docker-entrypoint.d/10-generate-certs.sh && \
    chmod +x /docker-entrypoint.d/10-generate-certs.sh

# Also generate certificates during build as a fallback
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key \
    -out /etc/nginx/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" && \
    chmod 644 /etc/nginx/certs/server.key /etc/nginx/certs/server.crt

# Create .htpasswd file for basic auth
RUN touch /etc/nginx/.htpasswd

# Make nginx config writable
RUN chmod 777 /etc/nginx/
RUN chmod 666 /etc/nginx/nginx.conf.template

# Copy nginx.conf.template to nginx.conf on startup
CMD ["sh", "-c", "cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf && chmod 666 /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
