#!/bin/bash

# ===========================================
# Mainstream Setup Wizard
# ===========================================
# Interactive setup script for one-click deployment
#
# Usage: ./setup.sh
#
# This script will:
# 1. Check prerequisites (Docker, Docker Compose)
# 2. Prompt for configuration
# 3. Generate secure secrets
# 4. Create .env file
# 5. Start all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print functions
print_header() {
    echo -e "\n${BLUE}${BOLD}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}${BOLD}════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Generate random string
generate_secret() {
    openssl rand -base64 $1 2>/dev/null | tr -d '=' | tr '+/' '-_' | head -c $1
}

# Generate hex string
generate_hex() {
    openssl rand -hex $1 2>/dev/null
}

# Generate JWT
generate_jwt() {
    local secret=$1
    local role=$2
    local header='{"alg":"HS256","typ":"JWT"}'
    local payload='{"role":"'"$role"'","iss":"supabase","iat":'"$(date +%s)"',"exp":'"$(($(date +%s) + 315360000))"'}'
    
    local header_base64=$(echo -n "$header" | openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    local payload_base64=$(echo -n "$payload" | openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    local signature=$(echo -n "${header_base64}.${payload_base64}" | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    
    echo "${header_base64}.${payload_base64}.${signature}"
}

# ===========================================
# Header
# ===========================================
clear
echo -e "${CYAN}"
echo "  __  __       _           _"
echo " |  \/  |     (_)         | |"
echo " | \  / | __ _ _ _ __  ___| |_ _ __ ___  __ _ _ __ ___"
echo " | |\/| |/ _\` | | '_ \/ __| __| '__/ _ \/ _\` | '_ \` _ \\"
echo " | |  | | (_| | | | | \__ \ |_| | |  __/ (_| | | | | | |"
echo " |_|  |_|\__,_|_|_| |_|___/\__|_|  \___|\__,_|_| |_| |_|"
echo ""
echo -e "${NC}"
echo -e "${BOLD}Welcome to the Mainstream Setup Wizard${NC}"
echo "This will configure and start your Mainstream instance."
echo ""

# ===========================================
# Check Prerequisites
# ===========================================
print_header "Checking Prerequisites"

# Check Docker
print_step "Checking Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker is installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"

# Check Docker Compose
print_step "Checking Docker Compose..."
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose is installed ($(docker compose version --short))"

# Check OpenSSL
print_step "Checking OpenSSL..."
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL is not installed"
    echo "Please install OpenSSL"
    exit 1
fi
print_success "OpenSSL is installed"

# ===========================================
# Configuration
# ===========================================
print_header "Configuration"

# Domain/URL
echo -e "${BOLD}Site URL${NC}"
echo "Enter the URL where Mainstream will be accessible."
echo "Examples: http://localhost:3000, https://mainstream.example.com"
read -p "Site URL [http://localhost:3000]: " SITE_URL
SITE_URL=${SITE_URL:-http://localhost:3000}

# API URL
echo ""
echo -e "${BOLD}API URL${NC}"
echo "Enter the URL for the Supabase API."
echo "Examples: http://localhost:8000, https://api.example.com"
read -p "API URL [http://localhost:8000]: " API_URL
API_URL=${API_URL:-http://localhost:8000}

# Admin email
echo ""
echo -e "${BOLD}Admin Email${NC}"
echo "This will be used for system notifications."
read -p "Admin Email [admin@localhost]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

# Email confirmation
echo ""
echo -e "${BOLD}Email Verification${NC}"
echo "Require email verification for new signups?"
read -p "Enable email verification? (y/N): " ENABLE_EMAIL_VERIFY
if [[ "$ENABLE_EMAIL_VERIFY" =~ ^[Yy]$ ]]; then
    ENABLE_EMAIL_AUTOCONFIRM="false"
else
    ENABLE_EMAIL_AUTOCONFIRM="true"
fi

# SMTP Configuration (if email verification enabled)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_SENDER_NAME="Mainstream"

if [ "$ENABLE_EMAIL_AUTOCONFIRM" = "false" ]; then
    echo ""
    echo -e "${BOLD}SMTP Configuration${NC}"
    echo "Configure your email server for sending verification emails."
    read -p "SMTP Host: " SMTP_HOST
    read -p "SMTP Port [587]: " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP User: " SMTP_USER
    read -s -p "SMTP Password: " SMTP_PASS
    echo ""
    read -p "Sender Name [Mainstream]: " SMTP_SENDER_NAME
    SMTP_SENDER_NAME=${SMTP_SENDER_NAME:-Mainstream}
fi

# AI Features
echo ""
echo -e "${BOLD}AI Features (Optional)${NC}"
echo "Enable AI-powered description generation?"
read -p "Enable AI features? (y/N): " ENABLE_AI
LITELLM_BASE_URL=""
LITELLM_API_KEY=""
LITELLM_MODEL="gemini/gemini-2.5-flash"

if [[ "$ENABLE_AI" =~ ^[Yy]$ ]]; then
    read -p "LiteLLM API URL: " LITELLM_BASE_URL
    read -s -p "LiteLLM API Key: " LITELLM_API_KEY
    echo ""
    read -p "Model [gemini/gemini-2.5-flash]: " LITELLM_MODEL
    LITELLM_MODEL=${LITELLM_MODEL:-gemini/gemini-2.5-flash}
fi

# ===========================================
# Generate Secrets
# ===========================================
print_header "Generating Secrets"

print_step "Generating PostgreSQL password..."
POSTGRES_PASSWORD=$(generate_secret 32)
print_success "PostgreSQL password generated"

print_step "Generating JWT secret..."
JWT_SECRET=$(generate_secret 32)
print_success "JWT secret generated"

print_step "Generating anonymous key..."
ANON_KEY=$(generate_jwt "$JWT_SECRET" "anon")
print_success "Anonymous key generated"

print_step "Generating service role key..."
SERVICE_ROLE_KEY=$(generate_jwt "$JWT_SECRET" "service_role")
print_success "Service role key generated"

print_step "Generating encryption key..."
ENCRYPTION_KEY=$(generate_hex 32)
print_success "Encryption key generated"

print_step "Generating dashboard password..."
DASHBOARD_PASSWORD=$(generate_secret 16)
print_success "Dashboard password generated"

# ===========================================
# Create .env file
# ===========================================
print_header "Creating Configuration"

print_step "Writing .env file..."

cat > .env << EOF
# ===========================================
# Mainstream Configuration
# Generated by setup.sh on $(date)
# ===========================================

# ===========================================
# URLs
# ===========================================
SITE_URL=${SITE_URL}
API_EXTERNAL_URL=${API_URL}

# ===========================================
# Secrets (DO NOT SHARE!)
# ===========================================
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ===========================================
# Authentication
# ===========================================
ENABLE_EMAIL_AUTOCONFIRM=${ENABLE_EMAIL_AUTOCONFIRM}
DISABLE_SIGNUP=false

# ===========================================
# SMTP (Email)
# ===========================================
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_ADMIN_EMAIL=${ADMIN_EMAIL}
SMTP_SENDER_NAME=${SMTP_SENDER_NAME}

# ===========================================
# AI Features
# ===========================================
LITELLM_BASE_URL=${LITELLM_BASE_URL}
LITELLM_API_KEY=${LITELLM_API_KEY}
LITELLM_MODEL=${LITELLM_MODEL}

# ===========================================
# Supabase Studio
# ===========================================
STUDIO_DEFAULT_ORGANIZATION=Mainstream
STUDIO_DEFAULT_PROJECT=Mainstream
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
EOF

print_success ".env file created"

# ===========================================
# Start Services
# ===========================================
print_header "Starting Services"

echo "Would you like to start the services now?"
read -p "Start services? (Y/n): " START_SERVICES

if [[ ! "$START_SERVICES" =~ ^[Nn]$ ]]; then
    print_step "Building and starting containers..."
    docker compose up -d --build
    
    echo ""
    print_step "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    print_step "Checking service health..."
    docker compose ps
fi

# ===========================================
# Summary
# ===========================================
print_header "Setup Complete!"

echo -e "${GREEN}${BOLD}Mainstream has been configured successfully!${NC}"
echo ""
echo -e "${BOLD}Access Points:${NC}"
echo "  • Mainstream App:    ${SITE_URL}"
echo "  • Supabase API:      ${API_URL}"
echo "  • Supabase Studio:   http://localhost:3001"
echo ""
echo -e "${BOLD}Supabase Studio Credentials:${NC}"
echo "  • Username: admin"
echo "  • Password: ${DASHBOARD_PASSWORD}"
echo ""
echo -e "${BOLD}Database Connection:${NC}"
echo "  • Host: localhost"
echo "  • Port: 5432"
echo "  • User: postgres"
echo "  • Password: ${POSTGRES_PASSWORD}"
echo ""
echo -e "${YELLOW}${BOLD}Important:${NC}"
echo "  • Save your credentials! They're stored in .env"
echo "  • For production, configure a reverse proxy (Nginx/Caddy)"
echo "  • Run database migrations: ./migrate.sh"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "  1. Wait for services to fully start (~1-2 minutes)"
echo "  2. Run migrations: ./migrate.sh"
echo "  3. Visit ${SITE_URL} and create your first account"
echo "  4. Make yourself an admin (see README.md)"
echo ""
echo -e "${CYAN}Thank you for using Mainstream! 🚀${NC}"

