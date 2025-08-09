#!/bin/sh
set -e

# Crear directorio de sesión si no existe
mkdir -p /usr/src/app/session_data

# Crear directorio de datos si no existe
mkdir -p /usr/src/app/data

# Intentar dar permisos mínimos pero no fallar si no se puede
chmod 770 /usr/src/app/session_data 2>/dev/null || true
chmod 770 /usr/src/app/data 2>/dev/null || true

# Directorio temporal dedicado
mkdir -p ${TEMP_DIR:-/tmp/botcito}
chmod 770 ${TEMP_DIR:-/tmp/botcito} 2>/dev/null || true

# Inicializar la base de datos si no existe (solo una vez)
if [ ! -f /usr/src/app/data/users.db ]; then
    echo "Inicializando base de datos..."
    node scripts/migrate.js 2>/dev/null || {
        echo "Error inicializando base de datos, continuando..."
    }
fi

# Ejecutar el comando directamente (ya somos 'app')
exec "$@"
