
# ProxyGuard Deployment Guide

This document provides comprehensive instructions for deploying the ProxyGuard proxy management system on a production server.

## System Requirements

- Ubuntu 20.04 LTS or newer server
- Minimum 2GB RAM, 2 CPU cores
- At least 10GB available disk space
- Root or sudo access to the server
- Public IP address (recommended for remote access)
- Domain name (optional, for production use)

## Deployment Methods

There are three ways to deploy ProxyGuard:

1. **Automated Setup Script** (Recommended for single-server deployments)
2. **Docker Container Deployment** (Recommended for containerized environments)
3. **Manual Installation** (For customized deployments)

## Method 1: Automated Setup Script

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/proxyguard.git
cd proxyguard
```

### Step 2: Run the Setup Script
```bash
chmod +x setup.sh
sudo ./setup.sh
```

The script will automatically:
- Install Node.js and npm
- Install and configure Nginx
- Set up required directories and permissions
- Install application dependencies
- Build the application
- Create and enable systemd services
- Generate self-signed SSL certificates

### Step 3: Access the Application
Once installation is complete, you can access:
- Management Interface: `http://your-server-ip:3000`
- HTTP/HTTPS Proxy: Port 8080

## Method 2: Docker Container Deployment

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/proxyguard.git
cd proxyguard
```

### Step 2: Build and Run with Docker Compose
```bash
docker-compose up -d
```

This will start:
- The ProxyGuard application container on port 3000
- The Nginx proxy container on port 8080

### Step 3: Access the Application
- Management Interface: `http://your-server-ip:3000`
- HTTP/HTTPS Proxy: Port 8080

## Method 3: Manual Installation

### Step 1: Install Dependencies
```bash
# Update package lists
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install -y nginx openssl
```

### Step 2: Set Up Directory Structure
```bash
# Create application directory
sudo mkdir -p /opt/proxyguard
sudo chown $USER:$USER /opt/proxyguard

# Create configuration directories
sudo mkdir -p /etc/nginx/certs
sudo mkdir -p /etc/proxyguard
sudo chmod 755 /etc/proxyguard
```

### Step 3: Generate SSL Certificates
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/server.key \
  -out /etc/nginx/certs/server.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

### Step 4: Create Configuration Files
Create initial configuration files:
```bash
# Create whitelist config
echo '[]' | sudo tee /etc/proxyguard/whitelist.json > /dev/null

# Create settings config
echo '{"nginxConfigPath":"/etc/nginx/nginx.conf","isReadOnly":false,"proxyPort":"8080","authType":"none"}' \
  | sudo tee /etc/proxyguard/settings.json > /dev/null
```

### Step 5: Deploy Application Files
```bash
# Clone repository
git clone https://github.com/yourusername/proxyguard.git /tmp/proxyguard

# Copy application files
cp -r /tmp/proxyguard/* /opt/proxyguard/

# Install dependencies and build
cd /opt/proxyguard
npm install
npm run build
```

### Step 6: Configure Nginx
```bash
# Copy the Nginx configuration template
sudo cp /opt/proxyguard/nginx/nginx.conf.template /etc/nginx/nginx.conf

# Set appropriate permissions
sudo chmod 644 /etc/nginx/nginx.conf
```

### Step 7: Configure Service
Create a systemd service file:
```bash
cat > /tmp/proxyguard.service << EOL
[Unit]
Description=ProxyGuard Proxy Management Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/proxyguard
ExecStart=$(which npm) run start
Restart=on-failure
Environment=NODE_ENV=production PORT=3000 VITE_WHITELIST_CONFIG_PATH=/etc/proxyguard/whitelist.json VITE_PROXY_SETTINGS_PATH=/etc/proxyguard/settings.json VITE_NGINX_CONFIG_PATH=/etc/nginx/nginx.conf

[Install]
WantedBy=multi-user.target
EOL

sudo mv /tmp/proxyguard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable proxyguard.service
sudo systemctl start proxyguard.service
```

### Step 8: Set Up Permissions
```bash
# Create group and add users
sudo groupadd -f proxyguard
sudo usermod -aG proxyguard $USER
sudo usermod -aG proxyguard www-data

# Configure file permissions
sudo chown :proxyguard /etc/nginx/nginx.conf
sudo chown :proxyguard /etc/proxyguard/whitelist.json
sudo chown :proxyguard /etc/proxyguard/settings.json

sudo chmod g+w /etc/nginx/nginx.conf
sudo chmod g+w /etc/proxyguard/whitelist.json
sudo chmod g+w /etc/proxyguard/settings.json

# Configure sudo permissions for Nginx management
echo "%proxyguard ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx, /bin/systemctl reload nginx, /bin/systemctl status nginx" | sudo EDITOR='tee -a' visudo
```

### Step 9: Start Services
```bash
sudo systemctl restart nginx
sudo systemctl start proxyguard
```

## Configuration

### Environment Variables
The application uses the following environment variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| PORT | Application port | 3000 |
| NODE_ENV | Node.js environment | production |
| VITE_WHITELIST_CONFIG_PATH | Path to whitelist configuration | /etc/proxyguard/whitelist.json |
| VITE_PROXY_SETTINGS_PATH | Path to proxy settings | /etc/proxyguard/settings.json |
| VITE_NGINX_CONFIG_PATH | Path to Nginx configuration | /etc/nginx/nginx.conf |

### Nginx Configuration
The default Nginx configuration:
- Listens on port 8080
- Enforces SSL for all connections
- Uses self-signed certificates (should be replaced in production)
- Implements client IP and destination-based whitelisting

## Production Hardening

For production environments, we recommend the following additional steps:

### 1. Replace Self-Signed Certificates
For production use, replace the self-signed certificates with proper certificates:
```bash
# Example with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d proxy.yourdomain.com
```

### 2. Enable Authentication
Update the authentication settings to require user authentication:
```bash
# For Basic Authentication
sudo apt-get install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

Then update the authentication type in the ProxyGuard settings panel.

### 3. Firewall Configuration
Configure a firewall to restrict access:
```bash
sudo apt-get install ufw
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

### 4. Reverse Proxy for Management Interface
For additional security, place the management interface behind a reverse proxy with proper domain and SSL:
```bash
server {
    listen 443 ssl;
    server_name proxyguard.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/proxyguard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/proxyguard.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Checking Services Status
```bash
# Check application status
sudo systemctl status proxyguard

# Check Nginx status
sudo systemctl status nginx

# View application logs
journalctl -u proxyguard -f

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Common Issues

1. **Application not accessible**
   - Check that the service is running: `sudo systemctl status proxyguard`
   - Verify port 3000 is open: `curl -v http://localhost:3000`
   - Check firewall settings: `sudo ufw status`

2. **Proxy not working**
   - Verify Nginx is running: `sudo systemctl status nginx`
   - Check Nginx configuration: `sudo nginx -t`
   - Examine whitelist configurations in the interface

3. **Permission issues**
   - Verify user is in proxyguard group: `groups $USER`
   - Check file ownership: `ls -la /etc/proxyguard/`
   - May require logout/login to apply group permissions

## Backup and Restore

### Create Backup
```bash
# Backup configuration files
sudo tar -czvf proxyguard-config-backup.tar.gz /etc/proxyguard/ /etc/nginx/nginx.conf
```

### Restore from Backup
```bash
# Restore configuration files
sudo tar -xzvf proxyguard-config-backup.tar.gz -C /
sudo systemctl restart nginx
sudo systemctl restart proxyguard
```

## Updating the Application

```bash
cd /opt/proxyguard
git pull
npm install
npm run build
sudo systemctl restart proxyguard
```
