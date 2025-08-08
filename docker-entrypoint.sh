#!/bin/sh
set -e

# Crear directorio de sesión si no existe
mkdir -p /usr/src/app/session_data

# Crear directorio de datos si no existe
mkdir -p /usr/src/app/data

# Intentar dar permisos pero no fallar si no se puede
chmod 777 /usr/src/app/session_data 2>/dev/null || true
chmod 777 /usr/src/app/data 2>/dev/null || true

# Inicializar la base de datos si no existe (solo una vez)
if [ ! -f /usr/src/app/data/users.db ]; then
    echo "Inicializando base de datos..."
    su -s /bin/sh -c "node scripts/migrate.js" app 2>/dev/null || {
        echo "Error inicializando base de datos, continuando..."
    }
fi

# Ejecutar el comando como usuario 'app'
exec su -s /bin/sh -c "$*" app
