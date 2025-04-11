
# ProxyGuard Local Script Execution

ProxyGuard is designed to run as a standalone appliance and uses a local script execution approach for performing privileged operations.

## How It Works

Instead of relying on a separate API server with authentication, ProxyGuard uses a dedicated script (`proxyguard-exec`) that is installed with sudo privileges. This approach:

1. Simplifies deployment (no separate API server needed)
2. Improves security (limited set of pre-defined commands)
3. Works well in appliance/VM environments

## Security Considerations

The security model is based on:

1. A dedicated script (`/usr/local/bin/proxyguard-exec`) that only accepts specific predefined commands
2. Sudo configuration that allows running only this script without a password
3. Limited command set to only the operations needed for ProxyGuard

## Available Commands

The script supports the following commands:

- `reload_nginx`: Reload the Nginx configuration
- `restart_nginx`: Restart the Nginx service
- `test_config`: Test the Nginx configuration
- `check_status`: Check the status of the Nginx service
- `check_writable [path]`: Check if a file is writable

## Installation

The setup script automatically:

1. Installs the execution script at `/usr/local/bin/proxyguard-exec`
2. Sets proper permissions (755)
3. Creates a sudoers entry to allow passwordless execution
4. Creates a system group for access control

## Troubleshooting

If you encounter issues with command execution:

1. Check if the script exists and is executable:
   ```bash
   ls -la /usr/local/bin/proxyguard-exec
   ```

2. Verify the sudoers configuration:
   ```bash
   sudo cat /etc/sudoers.d/proxyguard
   ```

3. Check if your user is in the proxyguard group:
   ```bash
   groups $USER
   ```

4. Test the script directly:
   ```bash
   /usr/local/bin/proxyguard-exec check_status
   ```

## Customization

If you need to add additional commands:

1. Edit the `proxyguard-exec.sh` script to add new command cases
2. Install the updated script
3. Update the application code to use the new commands

## Log Messages

All commands executed by the script are logged to the system log and can be viewed with:

```bash
sudo grep proxyguard-exec /var/log/auth.log
```
