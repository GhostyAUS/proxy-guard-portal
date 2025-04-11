
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
- Create and enable a systemd service for the application
- Install and configure Nginx as a proxy server
- Generate self-signed SSL certificates for development

3. **Access the application**

After installation, you can access the ProxyGuard UI at:

```
http://your-server-ip:3000
```

The HTTP proxy will be running on port 8080.

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

## Configuration Files

- Nginx configuration: `/etc/nginx/nginx.conf`
- SSL certificates: `/etc/nginx/certs/`
- Application service: `/etc/systemd/system/proxyguard.service`

## Updating the Application

To update the application:

```bash
git pull
npm install
npm run build
sudo systemctl restart proxyguard
```

## Troubleshooting

- Check the application logs: `journalctl -u proxyguard -f`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Validate Nginx configuration: `sudo nginx -t`
- Restart Nginx: `sudo systemctl restart nginx`
