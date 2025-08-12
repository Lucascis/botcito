# Secretario-Virtual v3.0

**Secretario-Virtual** es una plataforma multi-usuario con orquestación por IA que permite múltiples servicios integrados, orientada principalmente a inteligencia artificial.

## 🌟 Características Principales

- **Orquestador IA**: Sistema centralizado que interpreta intenciones y enruta acciones
- **Multi-usuario**: Soporte para múltiples usuarios con contextos independientes  
- **Integración WhatsApp**: Canal principal de comunicación con conversaciones continuas
- **Sesiones Persistentes**: Las sesiones de WhatsApp se recuperan automáticamente al reiniciar
- **Búsqueda Web**: Capacidad de búsqueda en internet mediante OpenAI
- **Procesamiento Multimedia**: Soporte completo para audio, imágenes y documentos con IA
- **Seguridad Avanzada**: Protección contra loops infinitos, rate limiting y validación robusta
- **Arquitectura Escalable**: Preparada para múltiples canales y servicios
- **Monitoreo Completo**: Métricas Prometheus, logs estructurados y dashboards Grafana

---

## 📑 Tabla de contenidos

1. [Características](#-características)  
2. [Requisitos](#-requisitos)  
3. [Instalación](#-instalación)  
4. [Configuración](#-configuración)  
5. [Uso](#-uso)  
6. [Estructura del proyecto](#-estructura-del-proyecto)  
7. [Scripts disponibles](#-scripts-disponibles)  
8. [Seguridad](#-seguridad)  
9. [Bot Response Parameters](#-bot-response-parameters)
10. [Gestión de Sesiones](#-gestión-de-sesiones)
11. [Monitoreo](#-monitoreo)
12. [API Endpoints](#-api-endpoints)  
13. [Próximas mejoras](#-próximas-mejoras)  
14. [Contribuir](#-contribuir)  
15. [Licencia](#-licencia)  

---

## 🚀 Características

### Orquestador IA
- Interpreta intenciones de usuario automáticamente
- Enruta acciones a servicios específicos
- Mantiene contexto de conversación por usuario
- Soporte para function calling de OpenAI
- Optimización automática de modelos según complejidad

### Sistema Multi-Usuario
- Gestión de usuarios con SQLite
- Contextos de conversación independientes
- Estadísticas de uso por usuario
- Sistema de permisos preparado
- Prevención de race conditions en creación de usuarios

### Integración WhatsApp
- **Conversaciones continuas**: No requiere prefijo después del comando inicial
- **Protección anti-loops**: Distingue entre mensajes del usuario y respuestas del bot
- **Rate limiting por usuario**: Máximo 10 mensajes por minuto (configurable)
- **Validación unificada**: Sistema robusto de validación de mensajes
- **Gestión de memoria**: Prevención automática de memory leaks
- **Watchdog inteligente**: Monitoreo y recuperación automática de sesiones
- Manejo de errores robusto y logs detallados

### Procesamiento Multimedia
- **Audio**: Transcripción automática con Whisper-1 de OpenAI
- **Imágenes**: Análisis visual con GPT-4o Vision
- **Contenido mixto**: Procesamiento conjunto de texto e imágenes
- **Optimización de modelos**: Selección automática según complejidad
- **Gestión de archivos**: Limpieza automática de archivos temporales

### Búsqueda Web
- Integración con OpenAI Responses API
- Búsquedas web oficiales con `web_search_preview`
- Resultados contextualizados
- Información actualizada en tiempo real

---

## 🛠 Requisitos

- Docker ≥ 20.x y Docker Compose ≥ 1.29  
- Node.js ≥ 18.x (solo para desarrollo local)
- Git

### Para WSL (Windows)
- WSL 2 habilitado
- Docker Desktop con integración WSL
- Ver [WSL_SETUP.md](WSL_SETUP.md) para configuración específica

---

## 🚀 Instalación

### Opción 1: Docker (Recomendado)

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/secretario-virtual.git
cd secretario-virtual

# Configurar variables de entorno
cp env.example .env
# Editar .env con tu API key de OpenAI

# Levantar con Docker
docker-compose up -d

# Verificar que está funcionando
curl http://localhost:3000/health
```

### Opción 2: Desarrollo local

```bash
# Instalar dependencias
npm ci

# Configurar variables
cp env.example .env
# Editar .env

# Migrar base de datos
npm run migrate

# Iniciar aplicación
npm start
```

### Opción 3: Script de desarrollo WSL

```bash
# Para usuarios de WSL
chmod +x dev-setup.sh
./dev-setup.sh full-setup
```

---

## ⚙️ Configuración

### Variables de entorno principales

```bash
# OpenAI (Requerido)
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_ORGANIZATION_ID=tu_organization_id_opcional

# Bot configuration
BOT_PREFIX=#bot
MODEL_SELECTION_STRATEGY=balanced # balanced|cost_optimized|performance_optimized

# Límites y seguridad
RATE_LIMIT_PER_MINUTE=10
MAX_TEXT_CHARS=4000
ALLOWED_NUMBERS=+5491112345678,+5491187654321  # Opcional

# Límites configurables del sistema
PROCESSED_MESSAGES_LIMIT=1000
PROCESSED_MESSAGES_CLEANUP_SIZE=200
BOT_MESSAGES_CACHE_LIMIT=2000
BOT_MESSAGES_CLEANUP_SIZE=1000

# WhatsApp formatting
WHATSAPP_FORMAT_ENHANCE=true
WHATSAPP_ADD_SEPARATORS=false
```

Ver `env.example` para la lista completa de variables.

---

## 📱 Uso

### Comandos WhatsApp

#### Iniciar conversación:
```
#bot ¿Cuál es la capital de Francia?
```

#### Comandos disponibles una vez iniciada la conversación:
```
¿Cómo está el clima hoy?
Busca información sobre Python
Analiza esta imagen [enviar imagen]
Transcribe este audio [enviar audio]
desactivar conversación
```

### Comandos de desactivación:
- `desactivar conversación`
- `detener chat` 
- `salir`
- `stop bot`
- `exit`
- `chau`

---

## 📁 Estructura del proyecto

```
secretario-virtual/
├── config/                    # Configuración y validación de env
│   ├── envSchema.js          # Schema de validación con envalid
│   └── index.js              # Configuración centralizada
├── controllers/              # (Deprecado - funcionalidad movida a services)
├── core/
│   └── app.js               # Aplicación principal Express
├── integrations/
│   └── whatsapp/
│       └── client.js        # Cliente WhatsApp con watchdog
├── models/
│   └── user/
│       └── User.js          # Modelo de usuario SQLite
├── services/
│   ├── alertService.js      # Alertas y notificaciones
│   ├── audioService.js      # Procesamiento de audio
│   ├── imageService.js      # Procesamiento de imágenes
│   ├── modelService.js      # Optimización de modelos IA
│   ├── openaiClient.js      # Cliente OpenAI con circuit breaker
│   ├── whatsappService.js   # Lógica principal WhatsApp
│   ├── orchestrator/
│   │   └── OrchestratorService.js  # Orquestador principal
│   ├── router/
│   │   └── MessageRouter.js # Router de tipos de mensaje
│   ├── session/
│   │   └── ChatSessionManager.js  # Gestión de sesiones
│   └── storage/
│       ├── FileStorageService.js  # Gestión de archivos
│       └── TempCleanupService.js  # Limpieza automática
├── utils/
│   ├── commands.js          # Comandos y validaciones
│   ├── constants.js         # Constantes del sistema
│   ├── logger.js            # Logger con rotación
│   ├── messageValidator.js  # Validador unificado de mensajes
│   ├── metrics.js           # Métricas Prometheus
│   ├── sanitizer.js         # Sanitización de entrada
│   └── whatsappFormatter.js # Formateo de mensajes
├── scripts/                 # Scripts de testing y migración
├── monitoring/              # Configuración de monitoreo
│   ├── grafana/dashboards/
│   └── prometheus.yml
├── logs/                    # Logs con rotación diaria
├── data/                    # Base de datos SQLite
└── session_data/           # Datos de sesión WhatsApp
```

---

## 🧪 Scripts disponibles

### Scripts NPM
| Comando | Acción |
|---------|--------|
| `npm start` | Iniciar aplicación |
| `npm run dev` | Desarrollo con nodemon |
| `npm run migrate` | Inicializar base de datos |
| `npm run lint` | Verificar código con ESLint |
| `npm run health` | Verificar estado de la aplicación |

### Scripts de Testing
| Comando | Acción |
|---------|--------|
| `npm run test-setup` | Pruebas de configuración inicial |
| `npm run test-security` | Pruebas de seguridad (anti-loops, rate limiting) |
| `npm run test-audio` | Pruebas de procesamiento de audio |
| `npm run test-image` | Pruebas de procesamiento de imágenes |
| `npm run test-models` | Pruebas de optimización de modelos |
| `npm run test-multimodal` | Pruebas de integración multimodal |
| `npm run test-user-validation` | Pruebas de validación de usuarios |
| `npm run test-multi-chat` | Pruebas de conversaciones múltiples |
| `npm run test-utils` | Pruebas de utilidades y helpers |
| `npm run test-endpoints` | Pruebas de endpoints HTTP |
| `npm run test-openai` | Prueba de conectividad OpenAI |

### Scripts adicionales
| Comando | Acción |
|---------|--------|
| `node scripts/test-session-persistence.js` | Pruebas de sesiones persistentes |
| `node scripts/test-session-endpoints.js` | Pruebas de endpoints de sesiones |
| `node scripts/test-all-corrections.js` | Pruebas de correcciones de bugs |

### Scripts de Desarrollo
| Comando | Acción |
|---------|--------|
| `./dev-setup.sh help` | Ver todos los comandos disponibles |
| `./dev-setup.sh full-setup` | Configuración completa automática |
| `./dev-setup.sh migrate` | Migrar base de datos |
| `./dev-setup.sh test-setup` | Pruebas de configuración |
| `./dev-setup.sh docker-up` | Levantar contenedor |
| `./dev-setup.sh docker-logs` | Ver logs del contenedor |

### Scripts Docker
| Comando | Acción |
|---------|--------|
| `./docker-run.sh migrate` | Inicializa BD (Docker) |
| `./docker-run.sh test-setup` | Pruebas configuración (Docker) |
| `./docker-run.sh test-conversation` | Pruebas conversación (Docker) |
| `./docker-run.sh test-security` | Pruebas seguridad (Docker) |
| `./docker-run.sh shell` | Shell interactivo en contenedor |
| `./docker-run.sh logs` | Ver logs del contenedor |

---

## 🔒 Seguridad

### Protecciones Implementadas

#### Anti-Loop Infinito 🔄
- **Detección de mensajes del bot**: Sistema de hashing MD5 para identificar respuestas propias
- **Filtrado inteligente**: Distingue entre mensajes del usuario y respuestas del bot
- **Prevención de auto-procesamiento**: Evita que el bot responda a sus propias respuestas
- **Limpieza automática**: Cache con TTL y límites configurables

#### Rate Limiting ⏱️
- **Por usuario**: Máximo 10 mensajes por minuto por número de teléfono (configurable)
- **Thread-safe**: Protección contra race conditions en contadores
- **Protección contra spam**: Bloqueo temporal de usuarios que exceden el límite
- **Logs de seguridad**: Registro detallado de intentos bloqueados

#### Validación Robusta ✅
- **Validador unificado**: Sistema consistente con `MessageValidator`
- **Validación de origen**: Verificación de números autorizados (opcional)
- **Sanitización de entrada**: Limpieza y validación de todos los mensajes
- **Validación de tipo**: Solo procesa mensajes de chat, audio e imágenes válidos
- **Límites configurables**: Rechazo de mensajes excesivamente largos (configurable)
- **Validación base64**: Verificación robusta de archivos multimedia

#### Gestión de Memoria 🧠
- **Memory leak prevention**: Limpieza automática de caches con límites configurables
- **Processed messages**: Límite de 1000 mensajes con limpieza de 200 (configurable)
- **Bot messages cache**: Límite de 2000 con limpieza de 1000 (configurable)
- **Archivos temporales**: Limpieza automática cada 30 minutos

#### Seguridad Docker 🐳
- **Usuario no-root**: Ejecución con usuario `app` sin privilegios
- **Capabilities mínimas**: Solo SETUID y SETGID permitidas
- **Volúmenes seguros**: Permisos adecuados para datos persistentes
- **Health checks**: Monitoreo automático del estado del servicio

#### Logs y Monitoreo 📊
- **Trazabilidad completa**: Logs detallados con rotación diaria
- **Identificación de origen**: Clasificación clara entre mensajes de usuario y bot
- **Métricas Prometheus**: Contadores, histogramas y gauges completos
- **Dashboards Grafana**: Visualización avanzada de métricas
- **Circuit breaker**: Protección automática ante fallos de OpenAI
- **Alertas de seguridad**: Notificaciones de eventos sospechosos
- **Estadísticas de uso**: Métricas para detectar patrones anómalos

### Pruebas de Seguridad
Ejecuta las pruebas de seguridad para validar todas las protecciones:
```bash
./docker-run.sh test-security
```

---

## 🎛️ Bot Response Parameters

### Defaults y Configuración LLM

Los parámetros de respuesta del bot son completamente configurables via variables de entorno:

#### Parámetros de Texto (GPT-4o)
```bash
OPENAI_TEXT_TEMPERATURE=0.7      # Creatividad (0.0-2.0)
OPENAI_TEXT_MAX_TOKENS=800       # Longitud máxima de respuesta
OPENAI_TEXT_TOP_P=1              # Diversidad de tokens (0.0-1.0)
OPENAI_TEXT_PRESENCE_PENALTY=0   # Penalización por repetición (-2.0-2.0)
OPENAI_TEXT_FREQUENCY_PENALTY=0  # Penalización por frecuencia (-2.0-2.0)
```

#### Parámetros de Imágenes (GPT-4o Vision)
```bash
OPENAI_IMAGE_TEMPERATURE=0.7     # Creatividad para análisis visual
OPENAI_IMAGE_MAX_TOKENS=600      # Longitud de descripción
```

#### Estrategia de Selección de Modelos
```bash
MODEL_SELECTION_STRATEGY=balanced
# Opciones: balanced, cost_optimized, performance_optimized
```

### Override por Invocación

El sistema permite override dinámico de parámetros por llamada específica en el código:

```javascript
// En OrchestratorService.js
const result = await this.callOpenAI({
  temperature: 0.9,      // Override más creativo
  max_tokens: 1200       // Override más extenso
}, 'text', { complexity: 'high' });
```

### Configuración Adaptativa

El sistema ajusta automáticamente `max_tokens` basado en la complejidad detectada:
- **Baja complejidad**: 400-600 tokens
- **Media complejidad**: 600-800 tokens  
- **Alta complejidad**: 800-1200 tokens

---

## 💾 Gestión de Sesiones

El sistema implementa **sesiones persistentes** para WhatsApp, permitiendo que los usuarios mantengan sus conversaciones activas incluso después de reiniciar la aplicación.

### 🔄 Funcionamiento Automático

1. **Primera conexión**: Usuario escanea QR y establece sesión
2. **Guardado automático**: La sesión se almacena en SQLite al autenticarse
3. **Recuperación**: Al reiniciar, la sesión se recupera automáticamente
4. **Sin QR repetido**: El usuario no necesita escanear QR nuevamente

### 📋 Gestión de Sesiones

#### Información de Sesiones
- **ID único**: Generado basado en el número de teléfono
- **Metadatos**: Información del dispositivo y navegador
- **Expiración**: 30 días de inactividad (configurable)
- **Estado**: Activa, inválida o expirada

#### Invalidación Automática
Las sesiones se invalidan automáticamente cuando:
- El usuario hace logout desde WhatsApp
- La sesión se corrompe o desconecta
- Expira por inactividad (30 días)
- Hay un error de navegador irrecuperable

### 🔧 Endpoints de Gestión

- **`GET /sessions`**: Lista todas las sesiones activas
- **`DELETE /sessions/:id`**: Invalida una sesión específica  
- **`GET /ready`**: Estado del sistema incluyendo sesiones

#### Ejemplo de respuesta `/sessions`:
```json
{
  "sessions": [
    {
      "sessionId": "wpp_session_5491123456789",
      "userPhone": "+5491123456789", 
      "status": "active",
      "createdAt": "2025-08-11T10:00:00Z",
      "lastActive": "2025-08-11T16:30:00Z",
      "expiresAt": "2025-09-10T10:00:00Z"
    }
  ],
  "stats": {
    "activeSessions": 1,
    "cacheSize": 1,
    "sessionDir": "/app/session_data"
  }
}
```

### 🧹 Limpieza Automática

- **Cada 6 horas**: Limpia sesiones expiradas o inválidas
- **Base de datos**: Mantiene histórico para auditoría
- **Archivos**: Elimina datos temporales automáticamente

### 🔧 Test de Sesiones

```bash
# Probar funcionalidad de sesiones
npm run test-session-persistence

# Verificar endpoints
curl http://localhost:3000/sessions
```

---

## 📊 Monitoreo

### Métricas Prometheus

El sistema expone métricas detalladas en `/metrics`:

#### Contadores
- `bot_messages_received_total`: Mensajes recibidos por tipo
- `bot_messages_blocked_total`: Mensajes bloqueados (rate limiting)
- `bot_errors_total`: Errores por handler
- `bot_openai_calls_total`: Llamadas a OpenAI por tipo

#### Histogramas
- `bot_openai_call_duration_seconds`: Duración de llamadas OpenAI

#### Gauges
- `openai_breaker_open`: Estado del circuit breaker (0/1)
- `bot_active_conversations`: Conversaciones activas

### Dashboards Grafana

Dashboard pre-configurado disponible en `monitoring/grafana/dashboards/secretario-virtual-overview.json`

Incluye paneles para:
- Estado del circuit breaker OpenAI
- Conversaciones activas
- Duración de llamadas OpenAI
- Resultados por handler
- Uso de CPU/memoria
- Errores por tipo

### Configuración Rápida

#### 1. Prometheus
```bash
# Editar monitoring/prometheus.yml si no usas Docker Desktop
# Reemplazar host.docker.internal por tu host

# Iniciar Prometheus
docker run -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

#### 2. Grafana
```bash
# Iniciar Grafana
docker run -p 3001:3000 grafana/grafana

# Importar dashboard desde monitoring/grafana/dashboards/secretario-virtual-overview.json
```

### Alertas Recomendadas (PromQL)

#### Circuit Breaker Abierto
```promql
max_over_time(openai_breaker_open[5m]) == 1
```

#### Sin Conversaciones Activas (horario laboral)
```promql
avg_over_time(bot_active_conversations[10m]) == 0
```

#### Alta Tasa de Errores
```promql
rate(bot_errors_total[5m]) > 0.1
```

---

## 📊 API Endpoints

### GET /health
Estado del servicio
```json
{
  "status": "ok"
}
```

### GET /ready
Readiness del servicio (WhatsApp listo, DB accesible, breakers cerrados)
```json
{
  "ready": true,
  "users": 12,
  "openaiBreakerOpen": false,
  "fileBreakerOpen": false
}
```

### GET /metrics
Métricas Prometheus (formato texto)
```
# HELP bot_messages_received_total Total messages received
# TYPE bot_messages_received_total counter
bot_messages_received_total{type="text"} 1250
...
```

### GET /sessions
Gestión de sesiones de WhatsApp
```json
{
  "sessions": [
    {
      "sessionId": "wpp_session_5491123456789",
      "userPhone": "+5491123456789",
      "status": "active",
      "createdAt": "2025-08-11T10:00:00Z",
      "lastActive": "2025-08-11T16:30:00Z",
      "expiresAt": "2025-09-10T10:00:00Z"
    }
  ],
  "stats": {
    "activeSessions": 1,
    "cacheSize": 1,
    "sessionDir": "/app/session_data"
  }
}
```

### DELETE /sessions/:sessionId
Invalida una sesión específica
```json
{
  "success": true,
  "sessionId": "wpp_session_5491123456789",
  "invalidated": true
}
```

### GET /stats
Estadísticas de usuarios
```json
{
  "users": {
    "totalUsers": 15,
    "activeUsers": 12,
    "recentUsers": 8
  },
  "system": {
    "uptime": "2 días, 3 horas",
    "totalMessages": 1250,
    "avgMessagesPerUser": 83
  }
}
```

### GET /conversations
Lista de conversaciones activas
```json
{
  "activeConversations": [
    "+5491112345678@c.us",
    "+5491187654321@c.us"
  ],
  "count": 2
}
```

---

## 🔮 Próximas mejoras

### ✅ Completadas (v3.0)
- [x] Conversaciones continuas sin prefijo repetido
- [x] Protección anti-loops infinitos
- [x] Rate limiting por usuario
- [x] Validación robusta de mensajes unificada
- [x] Sistema de seguridad avanzado
- [x] Pruebas automatizadas de seguridad
- [x] Soporte para auto-mensajes seguros
- [x] Scripts de configuración WSL
- [x] Procesamiento multimedia completo (audio/imágenes)
- [x] Optimización de modelos IA
- [x] Monitoreo con Prometheus/Grafana
- [x] Circuit breaker para OpenAI
- [x] Prevención de memory leaks
- [x] Límites configurables via environment
- [x] Validador unificado de mensajes
- [x] Gestión robusta de archivos temporales

### 🚀 Próximas Funcionalidades
- [ ] **Integración Discord**: Canal adicional de comunicación
- [ ] **Integración Telegram**: Expansión multi-plataforma  
- [ ] **Integración Gmail**: Gestión de correos electrónicos
- [ ] **Sistema de permisos granular**: Control detallado por módulo
- [ ] **Servicios de descarga**: Integración con servicios Arr (Sonarr, Radarr)
- [ ] **Recordatorios y tareas**: Sistema de notificaciones programadas
- [ ] **Interfaz web de administración**: Panel de control visual
- [ ] **Integración con streaming**: Control de servicios multimedia
- [ ] **Base de datos distribuida**: Soporte para múltiples nodos
- [ ] **API GraphQL**: Interface moderna para integraciones
- [ ] **Transacciones SQLite**: Para operaciones críticas complejas
- [ ] **Circuit breaker para I/O**: Protección adicional de archivos

---

## 🔧 Operación

### Backups
- Realizar copia del archivo SQLite en `data/users.db` (volumen `user_data`)
- Sugerido cron externo o job en CI con retención
- Evitar backup en caliente si hay escrituras intensas

### Logs
- En producción se generan `logs/app-YYYY-MM-DD.log` con rotación diaria y compresión
- Ajustable por `LOG_LEVEL`
- En desarrollo, salida en consola legible

### Métricas y Alertas
- `GET /metrics` expone métricas Prometheus (contadores, histogramas y gauges)
- Alertar si `openai_breaker_open=1` sostenido
- Alertar si `bot_active_conversations` se mantiene en 0 en horario hábil

---

## 🤝 Contribuir

1. Fork del proyecto
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de código:
- ESLint configurado con reglas de seguridad
- Tests requeridos para nuevas funcionalidades
- Documentación actualizada

---

## 📄 Licencia

Proyecto bajo licencia MIT. Ver archivo `LICENSE` para detalles.

---

## 🔗 Enlaces útiles

- [Configuración WSL](WSL_SETUP.md)
- [Reporte de Bugs](BUGS_DETECTADOS.md)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [WhatsApp Web.js](https://wwebjs.dev/)
- [Prometheus Monitoring](https://prometheus.io/)
- [Grafana Dashboards](https://grafana.com/)