# Configuración para WSL (Windows Subsystem for Linux)

Este documento explica cómo configurar y usar Secretario-Virtual en un entorno WSL.

## 🚨 Problema Común

En WSL, los comandos `npm run` pueden fallar debido a conflictos de rutas entre Windows y Linux. El error típico es:

```
Error: Cannot find module 'C:\Windows\scripts\migrate.js'
```

## ✅ Soluciones Disponibles

### 1. Script de Desarrollo WSL (Recomendado)

Usa el script `dev-setup.sh` que maneja automáticamente los problemas de rutas:

```bash
# Configuración completa automática
./dev-setup.sh full-setup

# Comandos individuales
./dev-setup.sh migrate          # Inicializar base de datos
./dev-setup.sh test-setup       # Pruebas de configuración
./dev-setup.sh test-security    # Pruebas de seguridad
./dev-setup.sh test-all         # Ejecutar todos los tests
```

### 2. Script de Docker

Si prefieres ejecutar todo dentro del contenedor Docker:

```bash
# Primero levanta el contenedor
docker-compose up -d

# Luego ejecuta comandos dentro del contenedor
./docker-run.sh migrate
./docker-run.sh test-setup
./docker-run.sh test-security
./docker-run.sh shell          # Shell interactivo
```

### 3. Comandos Directos con Node

Si necesitas ejecutar scripts directamente:

```bash
# Usar node con rutas absolutas
node $(pwd)/scripts/migrate.js
node $(pwd)/scripts/test-setup.js
node $(pwd)/scripts/test-security.js
node $(pwd)/scripts/test-all-corrections.js
```

## 🔧 Configuración Paso a Paso

### Paso 1: Verificar WSL

```bash
# Verificar que estás en WSL
echo $WSL_DISTRO_NAME

# Verificar dependencias
which node
which docker
which docker-compose
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar con tu editor preferido
nano .env
# o
code .env
```

### Paso 3: Instalación Automática

```bash
# Dar permisos de ejecución
chmod +x dev-setup.sh
chmod +x docker-run.sh

# Ejecutar configuración completa
./dev-setup.sh full-setup
```

### Paso 4: Verificar Instalación

```bash
# Verificar que el contenedor está ejecutándose
docker ps

# Ver logs
docker-compose logs -f

# Probar endpoints
curl http://localhost:3000/health
curl http://localhost:3000/stats
```

## 🐛 Solución de Problemas

### Error: "Cannot find module"

**Síntoma:**
```
Error: Cannot find module 'C:\Windows\scripts\migrate.js'
```

**Solución:**
```bash
# Usar el script de desarrollo WSL
./dev-setup.sh migrate

# O ejecutar dentro del contenedor
./docker-run.sh migrate
```

### Error: "Permission denied"

**Síntoma:**
```
bash: ./dev-setup.sh: Permission denied
```

**Solución:**
```bash
chmod +x dev-setup.sh
chmod +x docker-run.sh
```

### Error: "Docker not found"

**Síntoma:**
```
docker: command not found
```

**Solución:**
1. Instalar Docker Desktop para Windows
2. Habilitar integración WSL en Docker Desktop
3. Reiniciar WSL: `wsl --shutdown`

### Error: "Port already in use"

**Síntoma:**
```
Error: Port 3000 is already in use
```

**Solución:**
```bash
# Ver qué está usando el puerto
sudo netstat -tulpn | grep :3000

# Detener contenedor anterior
docker-compose down

# O cambiar puerto en docker-compose.yml
```

## 📱 Uso del Bot

Una vez configurado, puedes usar el bot en WhatsApp:

### Comandos Básicos:
```
#bot ¿Cuál es la capital de Francia?
#bot buscar clima en Buenos Aires
#bot analiza esta imagen [enviar imagen]
Transcribe este audio [enviar audio]
desactivar conversación
```

### Funcionalidades Disponibles:
- **Conversaciones continuas**: No repetir #bot después del primer mensaje
- **Procesamiento multimedia**: Análisis de imágenes y transcripción de audio
- **Búsqueda web**: Información actualizada de internet
- **Protección anti-loops**: Sistema inteligente de prevención
- **Rate limiting**: Máximo 10 mensajes por minuto por usuario

## 🔍 Comandos Útiles

### Desarrollo:
```bash
./dev-setup.sh help              # Ver todos los comandos
./dev-setup.sh docker-logs       # Ver logs
./dev-setup.sh docker-restart    # Reiniciar contenedor
```

### Docker:
```bash
./docker-run.sh help             # Ver comandos Docker
./docker-run.sh shell            # Shell interactivo
./docker-run.sh logs             # Ver logs
```

### Debugging:
```bash
# Ver logs en tiempo real
docker-compose logs -f app

# Entrar al contenedor
docker exec -it secretario_virtual_app bash

# Ver archivos de datos
ls -la data/
```

## 📊 Verificar Estado

```bash
# Estado del contenedor
docker ps

# Logs de la aplicación
docker-compose logs app

# Estadísticas del bot
curl http://localhost:3000/stats

# Health check
curl http://localhost:3000/health

# Métricas Prometheus
curl http://localhost:3000/metrics

# Conversaciones activas
curl http://localhost:3000/conversations
```

## 🆘 Obtener Ayuda

Si tienes problemas:

1. **Verificar logs:** `docker-compose logs -f`
2. **Reiniciar:** `docker-compose restart`
3. **Reconstruir:** `docker-compose up -d --build`
4. **Limpiar todo:** `docker-compose down -v && docker system prune`

## 📝 Notas Importantes

- **Rutas:** Siempre usa rutas Linux en WSL, no rutas Windows
- **Permisos:** Los scripts necesitan permisos de ejecución (`chmod +x`)
- **Docker:** Asegúrate de que Docker Desktop esté ejecutándose
- **Puertos:** El puerto 3000 debe estar libre
- **Variables:** Verifica que `.env` esté configurado correctamente
- **OpenAI API:** Se requiere una API key válida de OpenAI
- **Memoria:** El sistema previene automáticamente memory leaks
- **Seguridad:** Rate limiting y validación están activos por defecto
- **Logs:** Los logs se guardan en `logs/` con rotación diaria
- **Tests:** Ejecuta `npm run test-security` para validar el sistema

## 🔒 Características de Seguridad

### Protecciones Implementadas
- ✅ **Memory leak prevention**: Limpieza automática de caches
- ✅ **Rate limiting**: 10 mensajes/minuto por usuario (configurable)
- ✅ **Anti-loop protection**: Prevención de bucles infinitos
- ✅ **Message validation**: Validador unificado robusto
- ✅ **Circuit breaker**: Protección ante fallos de OpenAI
- ✅ **Thread-safe operations**: Sin race conditions críticas

### Monitoreo Disponible
- 📊 **Métricas Prometheus**: `/metrics` endpoint
- 📈 **Dashboards Grafana**: Configuración incluida
- 📋 **Logs estructurados**: Rotación diaria automática
- 🔍 **Health checks**: `/health` y `/ready` endpoints

## 🚀 Nuevas Funcionalidades v3.0

- ✅ **Procesamiento multimedia**: Audio y imágenes con IA
- ✅ **Optimización de modelos**: Selección automática según complejidad
- ✅ **Validación unificada**: MessageValidator para consistencia
- ✅ **Límites configurables**: Todas las constantes via `.env`
- ✅ **Gestión robusta**: Watchdog y recuperación automática
- ✅ **Tests completos**: Validación automática de correcciones