
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

# Default command
CMD ["nginx", "-g", "daemon off;"]
