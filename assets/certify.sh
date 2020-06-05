#!/usr/bin/env bash

name="snowpack"

function command_exists () {
    type "$1" &> /dev/null ;
}

# Make sure openssl exists
if ! command_exists openssl ; then
        echo "OpenSSL isn't installed. You need that to generate SSL certificates."
    exit
fi

## Make sure the tmp/ directory exists
if [ ! -d "tmp" ]; then
    mkdir tmp/
fi

# Generate Certificate Authority
openssl genrsa -out "tmp/${name}CA.key" 2048 &>/dev/null
openssl req -x509 -config utils/ca.conf -new -nodes -key "tmp/${name}CA.key" -sha256 -days 1825 -out "${name}CA.crt" &>/dev/null

# This is the part that demands root privileges
if [ "$EUID" -eq 0 ] ; then
    if command_exists security ; then
        # Delete trusted certs by their common name via https://unix.stackexchange.com/a/227014
        security find-certificate -c "${name}" -a -Z | sudo awk '/SHA-1/{system("security delete-certificate -Z "$NF)}'
        # Trust the Root Certificate cert
        security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${name}CA.crt"
    fi
fi

# Generate CA-signed Certificate
openssl genrsa -out "${name}.key" 2048 &>/dev/null
openssl req -new -config utils/ca.conf -key "${name}.key" -out "tmp/${name}.csr" &>/dev/null

# Generate SSL Certificate
openssl x509 -req -in "tmp/${name}.csr" -CA "${name}CA.crt" -CAkey "tmp/${name}CA.key" -CAcreateserial -out "${name}.crt" -days 1825 -sha256 -extfile utils/ssl.conf &>/dev/null

# Cleanup files
rm snowpackCA.srl
rm -rf tmp