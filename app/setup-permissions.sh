
#!/bin/sh

echo "Setting up file permissions for direct nginx access..."

# Create required directories if they don't exist
mkdir -p /etc/nginx /var/log/nginx /etc/nginx/certs

# Ensure nginx directories are accessible by the non-root user
chown -R node:node /etc/nginx
chown -R node:node /var/log/nginx
chmod -R 775 /etc/nginx
chmod -R 775 /var/log/nginx

# Ensure config files are accessible and writable
touch /etc/nginx/nginx.conf
chmod 664 /etc/nginx/nginx.conf

# Check if template exists, if not create it from default
if [ ! -f "/etc/nginx/nginx.conf.template" ]; then
  cp /app/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
  chmod 664 /etc/nginx/nginx.conf.template
fi

# Generate SSL certificates if they don't exist
if [ ! -f "/etc/nginx/certs/server.key" ] || [ ! -f "/etc/nginx/certs/server.crt" ]; then
  echo "Generating SSL certificates..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key \
    -out /etc/nginx/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
  chmod 644 /etc/nginx/certs/server.key /etc/nginx/certs/server.crt
fi

# Create .htpasswd file if it doesn't exist
touch /etc/nginx/.htpasswd
chmod 644 /etc/nginx/.htpasswd

echo "File permissions setup completed"
