set -euo pipefail
echo "=== PostgreSQL setup (local, sans Docker) ==="

# Ne jamais hériter de variables PG* parasites
unset PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSSLMODE

# Host/port
read -rp "Host PostgreSQL [default: 127.0.0.1]: " DB_HOST
DB_HOST="${DB_HOST:-127.0.0.1}"
read -rp "Port PostgreSQL [default: 5432]: " DB_PORT
DB_PORT="${DB_PORT:-5432}"

# Vérif disponibilité
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; do
  echo "❌ Aucune instance PostgreSQL sur $DB_HOST:$DB_PORT"
  read -rp "Réessaie - Host [127.0.0.1]: " DB_HOST; DB_HOST="${DB_HOST:-127.0.0.1}"
  read -rp "Réessaie - Port [5432]: " DB_PORT; DB_PORT="${DB_PORT:-5432}"
done
echo "✅ PostgreSQL disponible sur $DB_HOST:$DB_PORT"

# Superuser local
PG_SUPERUSER="${PG_SUPERUSER:-$(whoami)}"

# Saisie unique
read -rp "Nom d'utilisateur applicatif [default: todo]: " DBUSER
DBUSER="${DBUSER:-todo}"
read -rp "Nom de la base [default: todo]: " DBNAME
DBNAME="${DBNAME:-todo}"
read -srp "Mot de passe pour '${DBUSER}': " DBPASS; echo

echo "🔎 Connexion superuser: $PG_SUPERUSER@$DB_HOST:$DB_PORT (db=postgres)"

# 1) Créer/mettre à jour le rôle
psql "host=$DB_HOST port=$DB_PORT user=$PG_SUPERUSER dbname=postgres" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DBUSER') THEN
    CREATE ROLE $DBUSER WITH LOGIN PASSWORD '$DBPASS';
  ELSE
    ALTER ROLE $DBUSER WITH PASSWORD '$DBPASS';
  END IF;
END
\$\$;
SQL

# 2) Créer la base si absente
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$PG_SUPERUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DBNAME'" | grep -q 1; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$PG_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DBNAME OWNER $DBUSER;"
fi

# 3) Donner le schéma public
psql -h "$DB_HOST" -p "$DB_PORT" -U "$PG_SUPERUSER" -d "$DBNAME" -v ON_ERROR_STOP=1 -c "ALTER SCHEMA public OWNER TO $DBUSER;"

# 4) schema.sql
if [[ ! -f "./src/config/schema.sql" ]]; then
  cat > ./src/config/schema.sql <<'EOSQL'
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
EOSQL
  echo "  (schema.sql créé automatiquement)"
fi

# 5) Appliquer le schéma avec l'utilisateur applicatif
export PGPASSWORD="$DBPASS"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DBUSER" -d "$DBNAME" -v ON_ERROR_STOP=1 -f ./schema.sql
unset PGPASSWORD

# 6) Mettre à jour .env
DATABASE_URL="postgres://${DBUSER}:${DBPASS}@${DB_HOST}:${DB_PORT}/${DBNAME}"
cat > ./.env <<EOF
PORT=5050
NODE_ENV=development
DATABASE_URL=${DATABASE_URL}
EOF

echo
echo "✅ Base prête."
echo "👉 .env mis à jour avec :"
grep -E '^(PORT|NODE_ENV|DATABASE_URL)=' .env
