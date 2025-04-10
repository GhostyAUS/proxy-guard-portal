
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

# Make nginx config writable
RUN chmod 777 /etc/nginx/
RUN chmod 666 /etc/nginx/nginx.conf.template

# Set proper write permissions on generated config
CMD ["sh", "-c", "envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && chmod 666 /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
