#!/usr/bin/env bash
# ==============================================================================
# WEBCLI - Automated Installer Script
# Cloud Development Environment & Terminal
# ==============================================================================

set -e

# Color definitions
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Clear terminal screen & display banner
clear
echo -e "${PURPLE}================================================================${NC}"
echo -e "${BOLD}${PURPLE}             WEBCLI — AUTOMATED PRODUCTION INSTALLER            ${NC}"
echo -e "${CYAN}        Next-Gen Cloud IDE, Monaco Editor & Linux Terminal      ${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo ""

# 1. Root / Sudo Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] Script ini memerlukan hak akses root untuk konfigurasi Nginx dan sistem.${NC}"
  echo -e "Silakan jalankan ulang dengan: ${BOLD}sudo ./install.sh${NC}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 2. Input Domain
echo -e "${BOLD}Langkah 1: Konfigurasi Domain${NC}"
read -rp "$(echo -e "${CYAN}Masukkan nama domain (contoh: cli.example.com): ${NC}")" DOMAIN

# Validasi input domain
if [[ -z "$DOMAIN" ]]; then
  echo -e "${RED}[ERROR] Nama domain tidak boleh kosong!${NC}"
  exit 1
fi

echo -e "${GREEN}✔ Domain diset ke: ${BOLD}${DOMAIN}${NC}\n"

# 3. Pilih Metode Instalasi
echo -e "${BOLD}Langkah 2: Pilih Metode Instalasi${NC}"
echo -e "  ${BOLD}1)${NC} ${GREEN}Install di Docker${NC} (Disarankan: Container terisolasi + Nginx Host)"
echo -e "  ${BOLD}2)${NC} ${CYAN}Install di VPS Langsung${NC} (Bare-metal Host via Node.js/Systemd + Nginx Host)"
echo ""
read -rp "$(echo -e "${CYAN}Pilih opsi [1 atau 2]: ${NC}")" INSTALL_CHOICE

while [[ "$INSTALL_CHOICE" != "1" && "$INSTALL_CHOICE" != "2" ]]; do
  echo -e "${YELLOW}Pilihan tidak valid. Silakan ketik 1 atau 2.${NC}"
  read -rp "$(echo -e "${CYAN}Pilih opsi [1 atau 2]: ${NC}")" INSTALL_CHOICE
done

echo ""

# 4. Generate Random JWT_SECRET & Persiapan .env
RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 48)

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo -e "${CYAN}[*] Menyiapkan file konfigurasi .env...${NC}"
  cat <<EOF > "$SCRIPT_DIR/.env"
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
JWT_SECRET=${RANDOM_SECRET}
JWT_EXPIRES_IN=7d
DATA_DIR=${SCRIPT_DIR}/data
WORKSPACES_ROOT=${SCRIPT_DIR}/workspaces
EOF
  echo -e "${GREEN}✔ File .env berhasil dibuat.${NC}"
fi

# 5. Instalasi Berdasarkan Pilihan
if [ "$INSTALL_CHOICE" == "1" ]; then
  echo -e "${PURPLE}================================================================${NC}"
  echo -e "${BOLD}Memulai Instalasi Menggunakan Docker...${NC}"
  echo -e "${PURPLE}================================================================${NC}"

  # Cek Docker & Docker Compose
  if ! command -v docker &> /dev/null; then
    echo -e "${CYAN}[*] Menginstall Docker...${NC}"
    apt-get update -y
    apt-get install -y docker.io
    systemctl enable --now docker
  fi

  if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${CYAN}[*] Menginstall Docker Compose plugin...${NC}"
    apt-get update -y
    apt-get install -y docker-compose-plugin || apt-get install -y docker-compose
  fi

  echo -e "${CYAN}[*] Membangun dan menjalankan WebCLI Container via Docker Compose...${NC}"
  if docker compose version &> /dev/null; then
    docker compose up -d --build
  else
    docker-compose up -d --build
  fi

  echo -e "${GREEN}✔ Container WebCLI berhasil dijalankan di port 3000!${NC}\n"

elif [ "$INSTALL_CHOICE" == "2" ]; then
  echo -e "${PURPLE}================================================================${NC}"
  echo -e "${BOLD}Memulai Instalasi Langsung di VPS (Bare-Metal)...${NC}"
  echo -e "${PURPLE}================================================================${NC}"

  # Cek & Install paket pembangun native untuk node-pty
  echo -e "${CYAN}[*] Menginstall build dependencies & tools (gcc, g++, make, python3, curl)...${NC}"
  apt-get update -y
  apt-get install -y curl build-essential python3 make g++ gcc

  # Cek Node.js (harus v20+)
  NODE_MAJOR=0
  if command -v node &> /dev/null; then
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
  fi

  if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${CYAN}[*] Menginstall Node.js v20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  echo -e "${GREEN}✔ Node.js $(node -v) terpasang.${NC}"

  # Install Dependencies dan Build
  echo -e "${CYAN}[*] Menginstall dependencies npm root & client...${NC}"
  npm install
  (cd "$SCRIPT_DIR/client" && npm install)

  echo -e "${CYAN}[*] Melakukan build frontend & backend...${NC}"
  npm run build

  # Setup Systemd Service agar auto-start & background
  echo -e "${CYAN}[*] Mendaftarkan systemd service 'webcli'...${NC}"
  REAL_USER="${SUDO_USER:-root}"
  
  cat <<EOF > /etc/systemd/system/webcli.service
[Unit]
Description=WEBCLI Cloud Development Environment
After=network.target

[Service]
Type=simple
User=${REAL_USER}
WorkingDirectory=${SCRIPT_DIR}
ExecStart=$(which node) ${SCRIPT_DIR}/dist/server/src/index.js
Restart=always
RestartSec=5
EnvironmentFile=${SCRIPT_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF

  chown -R "${REAL_USER}:${REAL_USER}" "${SCRIPT_DIR}/data" "${SCRIPT_DIR}/workspaces" 2>/dev/null || true

  systemctl daemon-reload
  systemctl enable --now webcli.service

  echo -e "${GREEN}✔ Service webcli berhasil dijalankan via Systemd!${NC}\n"
fi

# 6. Setup Nginx Reverse Proxy (Wajib)
echo -e "${PURPLE}================================================================${NC}"
echo -e "${BOLD}Langkah 3: Konfigurasi Nginx Reverse Proxy & WebSocket${NC}"
echo -e "${PURPLE}================================================================${NC}"

if ! command -v nginx &> /dev/null; then
  echo -e "${CYAN}[*] Menginstall Nginx web server...${NC}"
  apt-get update -y
  apt-get install -y nginx
fi

NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

echo -e "${CYAN}[*] Membuat konfigurasi Nginx untuk ${DOMAIN}...${NC}"
cat <<EOF > "${NGINX_CONF}"
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Batas ukuran upload file
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Header Wajib untuk WebSocket Terminal (PTY) & Live File Watcher
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard Forwarding Headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeout koneksi terminal interaktif (24 jam)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }
}
EOF

# Aktifkan site di Nginx
ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"

# Hapus default nginx site jika masih aktif
if [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

# Uji dan reload Nginx
echo -e "${CYAN}[*] Menguji konfigurasi Nginx...${NC}"
nginx -t
systemctl reload nginx
echo -e "${GREEN}✔ Nginx Reverse Proxy berhasil dikonfigurasi & direload!${NC}\n"

# 7. Penawaran Pemasangan SSL Let's Encrypt (Certbot)
echo -e "${PURPLE}================================================================${NC}"
echo -e "${BOLD}Langkah 4: Setup SSL / HTTPS (Let's Encrypt)${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo -e "${YELLOW}Catatan: Pastikan DNS domain (${DOMAIN}) sudah benar-benar mengarah ke IP VPS ini.${NC}"
read -rp "$(echo -e "${CYAN}Apakah Anda ingin memasang SSL HTTPS sekarang? (y/n): ${NC}")" INSTALL_SSL

if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
  if ! command -v certbot &> /dev/null; then
    echo -e "${CYAN}[*] Menginstall Certbot...${NC}"
    apt-get update -y
    apt-get install -y certbot python3-certbot-nginx
  fi

  echo -e "${CYAN}[*] Menjalankan Certbot untuk ${DOMAIN}...${NC}"
  certbot --nginx -d "${DOMAIN}" --redirect || {
    echo -e "${RED}[!] Certbot gagal mendapatkan sertifikat. Pastikan DNS Record A sudah aktif.${NC}"
    echo -e "Anda dapat menjalankannya manual nanti dengan: ${BOLD}certbot --nginx -d ${DOMAIN}${NC}"
  }
else
  echo -e "${YELLOW}[!] Melewati pemasangan SSL. Akses saat ini berjalan pada HTTP.${NC}"
fi

echo ""

# 8. Buat Akun Administrator Pertama
echo -e "${PURPLE}================================================================${NC}"
echo -e "${BOLD}Langkah 5: Pembuatan Akun Administrator Pertama${NC}"
echo -e "${PURPLE}================================================================${NC}"
read -rp "$(echo -e "${CYAN}Buat akun user/admin sekarang? (y/n): ${NC}")" CREATE_USER

if [[ "$CREATE_USER" =~ ^[Yy]$ ]]; then
  read -rp "$(echo -e "${CYAN}Masukkan Username: ${NC}")" ADMIN_USER
  read -rp "$(echo -e "${CYAN}Masukkan Email: ${NC}")" ADMIN_EMAIL
  read -rsp "$(echo -e "${CYAN}Masukkan Password (min 6 karakter): ${NC}")" ADMIN_PASS
  echo ""

  if [ "$INSTALL_CHOICE" == "1" ]; then
    # Mode Docker
    if docker compose version &> /dev/null; then
      docker compose exec webcli ./webcli.sh create "$ADMIN_USER" "$ADMIN_EMAIL" "$ADMIN_PASS"
    else
      docker-compose exec webcli ./webcli.sh create "$ADMIN_USER" "$ADMIN_EMAIL" "$ADMIN_PASS"
    fi
  else
    # Mode VPS Bare-Metal
    ./webcli.sh create "$ADMIN_USER" "$ADMIN_EMAIL" "$ADMIN_PASS"
  fi
else
  echo -e "${YELLOW}Anda dapat membuat akun kapan saja nanti dengan perintah:${NC}"
  if [ "$INSTALL_CHOICE" == "1" ]; then
    echo -e "${BOLD}docker compose exec -it webcli ./webcli.sh${NC}"
  else
    echo -e "${BOLD}./webcli.sh${NC}"
  fi
fi

# 9. Selesai
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}               INSTALASI WEBCLI BERHASIL SELESAI!               ${NC}"
echo -e "${GREEN}================================================================${NC}"
if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
  echo -e "🌐 Buka browser Anda di: ${BOLD}${CYAN}https://${DOMAIN}${NC}"
else
  echo -e "🌐 Buka browser Anda di: ${BOLD}${CYAN}http://${DOMAIN}${NC}"
fi
echo ""
echo -e "Perintah manajemen akun di masa mendatang:"
if [ "$INSTALL_CHOICE" == "1" ]; then
  echo -e "  ${BOLD}docker compose exec -it webcli ./webcli.sh${NC}"
else
  echo -e "  ${BOLD}./webcli.sh${NC}"
fi
echo -e "${GREEN}================================================================${NC}\n"
