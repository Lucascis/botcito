#!/bin/bash

# Script para ejecutar comandos npm dentro del contenedor Docker

CONTAINER_NAME="secretario_virtual_app"

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./docker-run.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  migrate     - Inicializar base de datos"
    echo "  test-setup  - Ejecutar pruebas de configuración"
    echo "  test-pets   - Ejecutar pruebas de mascotas"
    echo "  test-audio  - Ejecutar pruebas de audio"
    echo "  test-image  - Ejecutar pruebas de imagen"
    echo "  test-models - Ejecutar pruebas de optimización de modelos"
    echo "  test-multimodal - Ejecutar pruebas multimodales completas"
    echo "  test-user-validation - Ejecutar pruebas de validación de usuarios"
    echo "  test-multi-chat - Ejecutar pruebas de múltiples chats"
    echo "  pet-examples- Ejecutar ejemplos de mascotas"
    echo "  shell       - Abrir shell interactivo"
    echo "  logs        - Ver logs del contenedor"
    echo "  restart     - Reiniciar el contenedor"
    echo ""
    echo "Ejemplos:"
    echo "  ./docker-run.sh migrate"
    echo "  ./docker-run.sh test-pets"
    echo "  ./docker-run.sh shell"
}

# Verificar si el contenedor está ejecutándose
check_container() {
    if ! docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo "❌ El contenedor ${CONTAINER_NAME} no está ejecutándose."
        echo "💡 Ejecuta 'docker-compose up -d' primero."
        exit 1
    fi
}

# Ejecutar comando en el contenedor
run_command() {
    local cmd="$1"
    echo "🚀 Ejecutando: $cmd en el contenedor ${CONTAINER_NAME}..."
    docker exec -it ${CONTAINER_NAME} su -s /bin/sh -c "$cmd" app
}

# Manejar diferentes comandos
case "$1" in
    "migrate")
        check_container
        run_command "node scripts/migrate.js"
        ;;
    "test-setup")
        check_container
        run_command "node scripts/test-setup.js"
        ;;
    "test-pets")
        check_container
        run_command "node scripts/test-pets.js"
        ;;
    "test-conversation")
        check_container
        run_command "node scripts/test-conversation.js"
        ;;
    "test-security")
        check_container
        run_command "node scripts/test-security.js"
        ;;
    "test-audio")
        check_container
        run_command "node scripts/test-audio.js"
        ;;
    "test-image")
        check_container
        run_command "node scripts/test-image.js"
        ;;
    "test-models")
        check_container
        run_command "node scripts/test-model-optimization.js"
        ;;
    "test-multimodal")
        check_container
        run_command "node scripts/test-multimodal.js"
        ;;
    "test-user-validation")
        check_container
        run_command "node scripts/test-user-validation.js"
        ;;
    "test-multi-chat")
        check_container
        run_command "node scripts/test-multi-chat.js"
        ;;
    "pet-examples")
        check_container
        run_command "node scripts/pet-examples.js"
        ;;
    "shell")
        check_container
        echo "🐳 Abriendo shell interactivo en el contenedor..."
        docker exec -it ${CONTAINER_NAME} su -s /bin/bash app
        ;;
    "logs")
        docker logs -f ${CONTAINER_NAME}
        ;;
    "restart")
        echo "🔄 Reiniciando contenedor..."
        docker-compose restart
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        echo "❌ Comando desconocido: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 