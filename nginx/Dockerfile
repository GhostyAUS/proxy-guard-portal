
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

# Generate self-signed certificates for development
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key \
    -out /etc/nginx/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Create .htpasswd file for basic auth (if needed)
RUN touch /etc/nginx/.htpasswd

# Make nginx config writable
RUN chmod 777 /etc/nginx/
RUN chmod 666 /etc/nginx/nginx.conf.template

# Copy nginx.conf.template to nginx.conf on startup
CMD ["sh", "-c", "cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf && chmod 666 /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
