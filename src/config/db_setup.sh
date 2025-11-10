set -euo pipefail
echo "=== PostgreSQL setup (local) ==="

# Ne jamais hériter de variables parasites
unset PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSSLMODE

# --- Host / Port ---
read -rp "Host PostgreSQL [default: 127.0.0.1]: " DB_HOST
DB_HOST="${DB_HOST:-127.0.0.1}"
read -rp "Port PostgreSQL [default: 5432]: " DB_PORT
DB_PORT="${DB_PORT:-5432}"

# Vérif disponibilité
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; do
  echo "Aucune instance PostgreSQL sur $DB_HOST:$DB_PORT"
  read -rp "Réessaie - Host [127.0.0.1]: " DB_HOST; DB_HOST="${DB_HOST:-127.0.0.1}"
  read -rp "Réessaie - Port [5432]: " DB_PORT; DB_PORT="${DB_PORT:-5432}"
done
echo "PostgreSQL disponible sur $DB_HOST:$DB_PORT"

# Superuser local
PG_SUPERUSER="${PG_SUPERUSER:-$(whoami)}"

# --- Saisie unique user / db / mdp ---
read -rp "Nom d'utilisateur applicatif [default: todo]: " DBUSER
DBUSER="${DBUSER:-todo}"
read -rp "Nom de la base [default: todo]: " DBNAME
DBNAME="${DBNAME:-todo}"
read -srp "Mot de passe pour '${DBUSER}': " DBPASS; echo

echo "‡Connexion superuser: $PG_SUPERUSER@$DB_HOST:$DB_PORT (db=postgres)"

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

# 4) Schéma SQL
SCHEMA_FILE="./src/config/schema.sql"
if [[ ! -f "$SCHEMA_FILE" ]]; then
  mkdir -p ./src/config
  cat > "$SCHEMA_FILE" <<'EOSQL'
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
EOSQL
  echo "  (schema.sql créé automatiquement dans $SCHEMA_FILE)"
fi

# 5) Appliquer le schéma avec l'utilisateur applicatif
export PGPASSWORD="$DBPASS"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DBUSER" -d "$DBNAME" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"
unset PGPASSWORD

#                        AJOUTS AUTH (MongoDB + JWT)                           #

# MONGODB_URI_AUTH (auth toujours sur MongoDB)
read -rp "URI MongoDB pour AUTH [default: mongodb://127.0.0.1:27017/todo_auth]: " MONGO_AUTH_URI
MONGO_AUTH_URI="${MONGO_AUTH_URI:-mongodb://127.0.0.1:27017/todo_auth}"

# JWT_SECRET (généré si vide)
read -rp "JWT secret (laisser vide pour générer aléatoirement): " JWT_SECRET_INPUT || true
if [[ -z "${JWT_SECRET_INPUT:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET_INPUT="$(openssl rand -hex 32)"
  else
    # fallback simple si openssl absent
    JWT_SECRET_INPUT="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64 || true)"
  fi
  echo "→ JWT_SECRET généré."
fi

# JWT_EXPIRES
read -rp "Durée d'expiration JWT [default: 1h]: " JWT_EXPIRES
JWT_EXPIRES="${JWT_EXPIRES:-1h}"

# 6) Mettre à jour .env 
DATABASE_URL="postgres://${DBUSER}:${DBPASS}@${DB_HOST}:${DB_PORT}/${DBNAME}"
cat > ./.env <<EOF
PORT=5050
NODE_ENV=development

# Provider choisi pour les TASKS
DB_PROVIDER=postgres
DATABASE_URL=${DATABASE_URL}

# AUTH (toujours MongoDB)
MONGODB_URI_AUTH=${MONGO_AUTH_URI}

# JWT
JWT_SECRET=${JWT_SECRET_INPUT}
JWT_EXPIRES=${JWT_EXPIRES}
EOF

echo
echo "Base prête."
echo ".env mis à jour avec :"
grep -E '^(PORT|NODE_ENV|DB_PROVIDER|DATABASE_URL|MONGODB_URI_AUTH|JWT_SECRET|JWT_EXPIRES)=' .env
