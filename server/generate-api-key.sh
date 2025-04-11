
#!/bin/bash

# Generate a random API key for secure communication between frontend and API server
API_KEY_FILE="/etc/proxyguard/api_key"
API_KEY_LENGTH=32

# Exit on error
set -e

echo "Generating API key for ProxyGuard communication..."

# Create proxyguard directory if not exists
if [ ! -d "/etc/proxyguard" ]; then
  sudo mkdir -p /etc/proxyguard
fi

# Generate a random API key
API_KEY=$(openssl rand -base64 ${API_KEY_LENGTH} | tr -dc 'a-zA-Z0-9' | head -c ${API_KEY_LENGTH})

# Save the API key to a file
echo ${API_KEY} | sudo tee ${API_KEY_FILE} > /dev/null
sudo chmod 640 ${API_KEY_FILE}
sudo chown root:proxyguard ${API_KEY_FILE}

echo "API key generated and stored in ${API_KEY_FILE}"
echo "Make sure both frontend and API services have access to this file"
