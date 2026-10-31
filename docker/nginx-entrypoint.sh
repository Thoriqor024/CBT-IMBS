#!/bin/sh
set -eu

cert_dir=/etc/nginx/certs
cert_file="$cert_dir/tls.crt"
key_file="$cert_dir/tls.key"
tls_host=${TLS_HOST:-localhost}
cert_days=${TLS_CERT_DAYS:-365}

mkdir -p "$cert_dir"
case "$tls_host" in
  *[!0-9.]* ) host_san="DNS:$tls_host"; cert_match="DNS:$tls_host" ;;
  * ) host_san="IP:$tls_host"; cert_match="IP Address:$tls_host" ;;
esac

if [ ! -s "$cert_file" ] || [ ! -s "$key_file" ] || ! openssl x509 -in "$cert_file" -noout -ext subjectAltName 2>/dev/null | grep -Fq "$cert_match"; then
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days "$cert_days" \
    -keyout "$key_file" -out "$cert_file" -subj "/CN=$tls_host" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,$host_san"
  chmod 600 "$key_file"
fi

exec "$@"
