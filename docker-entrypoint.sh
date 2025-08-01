#!/bin/sh
set -e

# Crear directorio de sesión si no existe
mkdir -p /usr/src/app/session_data

# Dar permisos de lectura/escritura/ejecución a todos (el contenedor no puede hacer chown)
chmod 777 /usr/src/app/session_data

# Ejecutar el comando como usuario 'app'
exec su -s /bin/sh -c "$*" app
