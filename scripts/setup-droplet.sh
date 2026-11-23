#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Full RSP Web Server Setup on Ubuntu 24.04 Droplet"
echo "=========================================================="

# 1. Setup 4 GB Swap Memory (critical for small droplets)
if [ ! -f /swapfile ]; then
    echo "--> [1/6] Allocating and activating 4GB Swap space..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    sysctl -p
    echo "Swap space configured successfully:"
    free -h
else
    echo "--> Swapfile already exists. Skipping swap allocation."
fi

# 2. System update and essential tools
echo "--> [2/6] Updating Ubuntu packages and installing build utilities..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git ufw build-essential libssl-dev pkg-config nginx certbot python3-certbot-nginx

# 3. Install Node.js 22 LTS, pnpm, and PM2
echo "--> [3/6] Installing Node.js 22 LTS, pnpm, and PM2 process manager..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
fi
npm install -g pnpm pm2
pm2 startup systemd -u root --hp /root || true

echo "Node version: $(node -v)"
echo "pnpm version: $(pnpm -v)"
echo "PM2 version: $(pm2 -v)"

# 4. Install and configure PostgreSQL 16
echo "--> [4/6] Installing and configuring PostgreSQL..."
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" || true
sudo -u postgres psql -c "CREATE DATABASE rsp_db;" || true

# 5. Setup Project Directory & Clone
echo "--> [5/6] Setting up project directory at /var/www/rsp-web..."
mkdir -p /var/www/rsp-web
cd /var/www/rsp-web

if [ ! -d ".git" ]; then
    echo "Cloning repository from GitHub..."
    git clone https://github.com/smvd-rns/rsp-website.git .
else
    echo "Pulling latest code from GitHub..."
    git fetch origin main
    git reset --hard origin/main
fi

# Run site_visits migration
if [ -f "migrations/001_create_site_visits.sql" ]; then
    echo "Running site_visits database migration..."
    sudo -u postgres psql -d rsp_db -f migrations/001_create_site_visits.sql || true
fi

# 6. Configure Nginx Reverse Proxy
echo "--> [6/6] Configuring Nginx reverse proxy..."
cat << 'EOF' > /etc/nginx/sites-available/rsp-web
server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 120M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/rsp-web /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configure Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=========================================================="
echo " Droplet Base Setup Completed Successfully!"
echo " Swap (4GB), Node.js 22, pnpm, PM2, Postgres, and Nginx are active."
echo "=========================================================="
