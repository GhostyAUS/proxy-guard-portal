
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

# Create .htpasswd file for basic auth (if needed)
RUN touch /etc/nginx/.htpasswd

# Generate a self-signed certificate if one doesn't exist
RUN mkdir -p /docker-entrypoint.d/
COPY <<EOF /docker-entrypoint.d/40-generate-certificates.sh
#!/bin/sh
if [ ! -f /etc/nginx/certs/server.key ] || [ ! -f /etc/nginx/certs/server.crt ]; then
  echo "Generating self-signed SSL certificate..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key \
    -out /etc/nginx/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
  chmod 644 /etc/nginx/certs/server.key
  chmod 644 /etc/nginx/certs/server.crt
  echo "SSL certificate generated successfully."
else
  echo "Using existing SSL certificates."
fi

# Copy the template as the real config
cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf
EOF

RUN chmod +x /docker-entrypoint.d/40-generate-certificates.sh

# Default command
CMD ["nginx", "-g", "daemon off;"]
