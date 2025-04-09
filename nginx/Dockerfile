
FROM nginx:stable-alpine

# Install required packages
RUN apk add --no-cache openssl

# Create directory for SSL certificates
RUN mkdir -p /etc/nginx/certs

# Copy configuration template
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Create .htpasswd file for basic auth (if needed)
RUN touch /etc/nginx/.htpasswd

# Default command
CMD ["nginx", "-g", "daemon off;"]
