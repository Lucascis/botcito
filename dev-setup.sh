#!/bin/bash

# Script de desarrollo para WSL
# Soluciona problemas de rutas entre WSL y Windows

echo "🚀 Configurando entorno de desarrollo para WSL..."

# Verificar si estamos en WSL
if [[ -n "$WSL_DISTRO_NAME" ]]; then
    echo "✅ Detectado entorno WSL: $WSL_DISTRO_NAME"
else
    echo "⚠️ No se detectó entorno WSL, pero continuando..."
fi

# Función para ejecutar comandos dentro del contenedor Docker
run_in_docker() {
    local cmd="$1"
    echo "🐳 Ejecutando en Docker: $cmd"
    
    # Verificar si el contenedor está ejecutándose
    if ! docker ps --format "table {{.Names}}" | grep -q "^secretario_virtual_app$"; then
        echo "⚠️ Contenedor no está ejecutándose. Ejecutando comando directamente..."
        case "$cmd" in
            "migrate")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/migrate.js
                ;;
            "test-setup")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-setup.js
                ;;
            "test-pets")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-pets.js
                ;;
            "test-conversation")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-conversation.js
                ;;
            "test-security")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-security.js
                ;;
            "test-audio")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-audio.js
                ;;
            "test-image")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-image.js
                ;;
            "test-models")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-model-optimization.js
                ;;
            "test-multimodal")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-multimodal.js
                ;;
            "test-user-validation")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-user-validation.js
                ;;
            "test-multi-chat")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/test-multi-chat.js
                ;;
            "pet-examples")
                docker run --rm -v "$(pwd):/usr/src/app" -w /usr/src/app node:24-slim node scripts/pet-examples.js
                ;;
            *)
                echo "❌ Comando no reconocido: $cmd"
                exit 1
                ;;
        esac
    else
        # Usar el script docker-run.sh si el contenedor está ejecutándose
        ./docker-run.sh "${cmd}"
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./dev-setup.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  migrate     - Inicializar base de datos"
    echo "  test-setup  - Ejecutar pruebas de configuración"
    echo "  test-pets   - Ejecutar pruebas de mascotas"
    echo "  test-conversation - Ejecutar pruebas de conversación"
    echo "  test-security - Ejecutar pruebas de seguridad"
    echo "  test-audio  - Ejecutar pruebas de audio"
    echo "  test-image  - Ejecutar pruebas de imagen"
    echo "  test-models - Ejecutar pruebas de optimización de modelos"
    echo "  test-multimodal - Ejecutar pruebas multimodales completas"
    echo "  test-user-validation - Ejecutar pruebas de validación de usuarios"
    echo "  test-multi-chat - Ejecutar pruebas de múltiples chats"
    echo "  pet-examples- Ejecutar ejemplos de mascotas"
    echo "  docker-build- Construir imagen Docker"
    echo "  docker-up   - Levantar contenedor Docker"
    echo "  docker-down - Detener contenedor Docker"
    echo "  docker-logs - Ver logs del contenedor"
    echo "  full-setup  - Configuración completa"
    echo ""
    echo "Ejemplos:"
    echo "  ./dev-setup.sh migrate"
    echo "  ./dev-setup.sh full-setup"
}

# Configuración completa
full_setup() {
    echo "🔧 Configuración completa iniciada..."
    
    # 1. Verificar dependencias básicas
    echo "📋 Verificando dependencias..."
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker no está instalado"
        echo "💡 Instala Docker Desktop para Windows y habilita la integración WSL"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose no está instalado"
        echo "💡 Instala Docker Compose o usa 'docker compose' (nueva sintaxis)"
        exit 1
    fi
    
    echo "✅ Dependencias verificadas"
    
    # 2. Verificar archivo .env
    if [ ! -f .env ]; then
        echo "📝 Creando archivo .env desde env.example..."
        if [ -f env.example ]; then
            cp env.example .env
            echo "⚠️ Archivo .env creado. Por favor, edítalo con tus credenciales de OpenAI"
            echo "💡 Ejecuta: nano .env"
        else
            echo "❌ No se encontró env.example"
            exit 1
        fi
    fi
    
    # 3. Inicializar base de datos usando Docker
    echo "🗄️ Inicializando base de datos..."
    run_in_docker "migrate"
    
    # 4. Construir Docker
    echo "🐳 Construyendo imagen Docker..."
    docker-compose build
    
    # 5. Levantar contenedor
    echo "🚀 Levantando contenedor..."
    docker-compose up -d
    
    # 6. Esperar a que esté listo
    echo "⏳ Esperando a que el contenedor esté listo..."
    sleep 15
    
    # 7. Verificar que el contenedor esté ejecutándose
    if ! docker ps --format "table {{.Names}}" | grep -q "^secretario_virtual_app$"; then
        echo "❌ El contenedor no se inició correctamente"
        echo "📋 Mostrando logs..."
        docker-compose logs
        exit 1
    fi
    
    # 8. Ejecutar pruebas
    echo "🧪 Ejecutando pruebas..."
    run_in_docker "test-setup"
    
    echo "🎉 ¡Configuración completa finalizada!"
    echo "📱 El bot está listo para usar en WhatsApp"
    echo ""
    echo "📋 Comandos útiles:"
    echo "  ./dev-setup.sh docker-logs    - Ver logs"
    echo "  ./dev-setup.sh docker-down    - Detener contenedor"
    echo "  ./docker-run.sh shell         - Shell interactivo"
    echo "  curl http://localhost:3000/health - Health check"
}

# Manejar comandos
case "$1" in
    "migrate")
        run_in_docker "migrate"
        ;;
    "test-setup")
        run_in_docker "test-setup"
        ;;
            "test-pets")
            run_in_docker "test-pets"
            ;;
        "test-conversation")
            run_in_docker "test-conversation"
            ;;
        "test-security")
            run_in_docker "test-security"
            ;;
        "test-audio")
            run_in_docker "test-audio"
            ;;
        "test-image")
            run_in_docker "test-image"
            ;;
        "test-models")
            run_in_docker "test-models"
            ;;
        "test-multimodal")
            run_in_docker "test-multimodal"
            ;;
        "test-user-validation")
            run_in_docker "test-user-validation"
            ;;
        "test-multi-chat")
            run_in_docker "test-multi-chat"
            ;;
        "pet-examples")
        run_in_docker "pet-examples"
        ;;
    "docker-build")
        echo "🐳 Construyendo imagen Docker..."
        docker-compose build
        ;;
    "docker-up")
        echo "🚀 Levantando contenedor Docker..."
        docker-compose up -d
        ;;
    "docker-down")
        echo "🛑 Deteniendo contenedor Docker..."
        docker-compose down
        ;;
    "docker-logs")
        echo "📋 Mostrando logs del contenedor..."
        docker-compose logs -f
        ;;
    "full-setup")
        full_setup
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