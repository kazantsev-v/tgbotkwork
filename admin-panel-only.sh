#!/bin/bash

echo "Starting Admin Panel standalone..."
echo ""

cd admin-panel
echo "Running exact Angular CLI command:"
echo "ng serve --host 0.0.0.0 --ssl true --ssl-cert ./cert.pem --ssl-key ./privkey.pem"
echo ""

ng serve --host 0.0.0.0 --ssl true --ssl-cert ./cert.pem --ssl-key ./privkey.pem
