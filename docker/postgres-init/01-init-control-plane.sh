#!/bin/sh
set -e

# Inisialisasi otomatis Control Plane untuk CBT IMBS SaaS
# Dieksekusi otomatis oleh PostgreSQL container pada saat database pertama kali diinisialisasi (/docker-entrypoint-initdb.d)

CONTROL_DB="${CONTROL_DB_NAME:-cbt_control_plane}"
CONTROL_USER="${CONTROL_DB_USER:-cbt_control_app}"
CONTROL_PASS="${CONTROL_DB_PASSWORD:-cbt_control_password}"

echo "==> [Control Plane Init] Memeriksa database dan role control-plane..."

# Buat role jika belum ada
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$CONTROL_USER') THEN
            CREATE ROLE "$CONTROL_USER" WITH LOGIN PASSWORD '$CONTROL_PASS' NOSUPERUSER NOCREATEDB NOCREATEROLE;
            RAISE NOTICE 'Role % berhasil dibuat.', '$CONTROL_USER';
        ELSE
            RAISE NOTICE 'Role % sudah ada.', '$CONTROL_USER';
        END IF;
    END
    \$\$;
EOSQL

# Buat database jika belum ada
EXISTS_DB=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '$CONTROL_DB'")
if [ "$EXISTS_DB" != "1" ]; then
    echo "==> [Control Plane Init] Membuat database $CONTROL_DB dengan owner $CONTROL_USER..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE DATABASE "$CONTROL_DB" OWNER "$CONTROL_USER";
        GRANT ALL PRIVILEGES ON DATABASE "$CONTROL_DB" TO "$CONTROL_USER";
EOSQL
else
    echo "==> [Control Plane Init] Database $CONTROL_DB sudah ada."
fi

echo "==> [Control Plane Init] Selesai."

