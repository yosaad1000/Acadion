#!/bin/bash

# Create SSL directory
mkdir -p ssl/certs ssl/private

# Generate private key
openssl genrsa -out ssl/private/server.key 4096

# Create certificate signing request configuration
cat > ssl/server.conf << EOF
[req]
default_bits = 4096
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C = US
ST = State
L = City
O = Organization
OU = IT Department
CN = 54.167.95.26

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = 54.167.95.26
IP.1 = 54.167.95.26
DNS.2 = localhost
IP.2 = 127.0.0.1
EOF

# Generate certificate signing request
openssl req -new -key ssl/private/server.key -out ssl/server.csr -config ssl/server.conf

# Generate self-signed certificate
openssl x509 -req -in ssl/server.csr -signkey ssl/private/server.key -out ssl/certs/server.crt -days 365 -extensions v3_req -extfile ssl/server.conf

# Set proper permissions
chmod 600 ssl/private/server.key
chmod 644 ssl/certs/server.crt

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate: ssl/certs/server.crt"
echo "🔑 Private key: ssl/private/server.key"