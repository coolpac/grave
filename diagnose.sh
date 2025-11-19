#!/bin/bash

# Diagnostic script for server deployment
# Run this on the server: ssh root@94.241.141.194 "bash -s" < diagnose.sh

echo "=== Docker Containers Status ==="
docker ps -a

echo ""
echo "=== Docker Compose Status ==="
cd /opt/ritual-app 2>/dev/null || echo "Directory /opt/ritual-app not found"
docker-compose -f docker-compose.production.yml ps 2>/dev/null || echo "docker-compose not found or file missing"

echo ""
echo "=== Ports 80 and 443 ==="
netstat -tlnp 2>/dev/null | grep -E ':(80|443)' || ss -tlnp 2>/dev/null | grep -E ':(80|443)' || echo "No process listening on 80/443"

echo ""
echo "=== Nginx Status ==="
systemctl status nginx 2>/dev/null || echo "Nginx not installed or not running as systemd service"

echo ""
echo "=== Docker Network ==="
docker network ls
docker network inspect ritual-app_ritual_network 2>/dev/null || echo "Network not found"

echo ""
echo "=== Container Logs (last 20 lines) ==="
echo "--- Web Container ---"
docker logs --tail 20 ritual_web 2>/dev/null || echo "Web container not found"
echo ""
echo "--- API Container ---"
docker logs --tail 20 ritual_api 2>/dev/null || echo "API container not found"

echo ""
echo "=== Firewall Status ==="
ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -20 || echo "Cannot check firewall"

echo ""
echo "=== DNS Check ==="
echo "optmramor.ru should point to 94.241.141.194"
nslookup optmramor.ru 2>/dev/null || dig optmramor.ru +short 2>/dev/null || echo "DNS tools not available"

