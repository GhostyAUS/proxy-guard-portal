
# ProxyGuard Installation Guide

This guide provides instructions for installing ProxyGuard on a dedicated Ubuntu server.

## System Requirements

- Ubuntu 20.04 LTS or newer
- Sudo access on the server
- Node.js 16 or newer
- Nginx

## Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/proxyguard.git
cd proxyguard
```

2. **Run the setup script**

```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Install Node.js and npm if not already installed
- Install project dependencies
- Build the application
- Generate a secure API key for frontend-backend communication
- Create and enable systemd services for the API and frontend applications
- Install and configure Nginx as a proxy server
- Generate self-signed SSL certificates for development

3. **Access the application**

After installation, you can access the ProxyGuard UI at:

```
http://your-server-ip:3000
```

The HTTP proxy will be running on port 8080.
The API server runs on port 3001.

## Security Notes

- The setup creates a secure API key for communication between the frontend and backend
- The API key is stored in `/etc/proxyguard/api_key`
- All API requests are authenticated using this key
- For production environments, consider enabling HTTPS and setting up proper firewalls

## Manual Configuration

If you prefer to install the components manually:

1. **Install Node.js and build the application**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install
npm run build
```

2. **Set up Nginx**

```bash
cd nginx
chmod +x install.sh
./install.sh
```

3. **Generate API key**

```bash
cd server
chmod +x generate-api-key.sh
./generate-api-key.sh
```

4. **Set up the API and frontend services**

```bash
cd server
chmod +x setup-api-server.sh
./setup-api-server.sh

cd ../opt/proxyguard
chmod +x setup-frontend-service.sh
./setup-frontend-service.sh
```

## Configuration Files

- Nginx configuration: `/etc/nginx/nginx.conf`
- SSL certificates: `/etc/nginx/certs/`
- API service: `/etc/systemd/system/proxyguard-api.service`
- Frontend service: `/etc/systemd/system/proxyguard-frontend.service`
- API key: `/etc/proxyguard/api_key`
- Whitelist configuration: `/etc/proxyguard/whitelist.json`
- Settings configuration: `/etc/proxyguard/settings.json`

## Updating the Application

To update the application:

```bash
git pull
npm install
npm run build
sudo systemctl restart proxyguard-frontend
sudo systemctl restart proxyguard-api
```

## Troubleshooting

- Check the API service logs: `sudo journalctl -u proxyguard-api -f`
- Check the frontend service logs: `sudo journalctl -u proxyguard-frontend -f`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Validate Nginx configuration: `sudo nginx -t`
- Restart Nginx: `sudo systemctl restart nginx`
- Verify API key configuration: `ls -la /etc/proxyguard/api_key`
