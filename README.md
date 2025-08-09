# Secretario-Virtual v3.0

**Secretario-Virtual** es una plataforma multi-usuario con orquestación por IA que permite múltiples servicios integrados, orientada principalmente a inteligencia artificial.

## 🌟 Características Principales

- **Orquestador IA**: Sistema centralizado que interpreta intenciones y enruta acciones
- **Multi-usuario**: Soporte para múltiples usuarios con contextos independientes
- **Integración WhatsApp**: Canal principal de comunicación con conversaciones continuas
- **Búsqueda Web**: Capacidad de búsqueda en internet mediante OpenAI
 
- **Seguridad Avanzada**: Protección contra loops infinitos, rate limiting y validación robusta
- **Arquitectura Escalable**: Preparada para múltiples canales y servicios

---

## 📑 Tabla de contenidos

1. Características  
2. Requisitos  
3. Instalación  
4. Configuración  
5. Uso  
6. Estructura del proyecto  
7. Scripts disponibles  
8. Seguridad  
9. API Endpoints  
10. Próximas mejoras  
11. Contribuir  
12. Licencia  

---

## 🚀 Características

### Orquestador IA
- Interpreta intenciones de usuario automáticamente
- Enruta acciones a servicios específicos
- Mantiene contexto de conversación por usuario
- Soporte para function calling de OpenAI

### Sistema Multi-Usuario
- Gestión de usuarios con SQLite
- Contextos de conversación independientes
- Estadísticas de uso por usuario
- Sistema de permisos preparado

### Integración WhatsApp
- **Conversaciones continuas**: No requiere prefijo después del comando inicial
- **Protección anti-loops**: Distingue entre mensajes del usuario y respuestas del bot
- **Rate limiting por usuario**: Máximo 10 mensajes por minuto
- Validación robusta de mensajes y números autorizados
- Manejo de errores robusto y logs detallados
  

### Búsqueda Web
- Integración con OpenAI Responses API
- Búsquedas web oficiales con `web_search_preview`
- Resultados contextualizados
- Información actualizada en tiempo real

---

## 🛠 Requisitos

- Docker ≥ 20.x y Docker Compose ≥ 1.29  
- Node.js 18.x (solo si ejecutas localmente)  
- Chromium disponible en contenedor (configurado automáticamente)  
- Cuenta de OpenAI con acceso a Responses API (modelo `gpt-4o` + `web_search_preview`)  
- Número(s) de WhatsApp autorizados (opcional)  

---

## 🔧 Instalación

### Opción 1: Instalación Automática (Recomendada)

1. Clona el repositorio  
   
       git clone https://github.com/tu-usuario/secretario-virtual.git  
       cd secretario-virtual  

2. Configura variables de entorno  
   
       cp env.example .env  
        (Editar `.env` con tus valores:  
         - OPENAI_API_KEY  
         - OPENAI_ORGANIZATION_ID (opcional)  
         - ALLOWED_NUMBERS (opcional)  
         - BOT_PREFIX  
         - LOG_LEVEL  
         - OPENAI_TIMEOUT_MS / OPENAI_MAX_RETRIES  
         - CORS_ORIGIN (opcional)  
        )  

3. Ejecuta la configuración completa  
   
       ./dev-setup.sh full-setup  
   
   Este comando instalará dependencias, inicializará la base de datos y levantará el contenedor Docker.

### Opción 2: Instalación Manual

1. Clona el repositorio  
   
       git clone https://github.com/tu-usuario/secretario-virtual.git  
       cd secretario-virtual  

2. Configura variables de entorno  
   
       cp env.example .env  
       (Editar `.env` con tus valores)  

3. Inicializa la base de datos  
   
       ./dev-setup.sh migrate  

4. Construye e inicia con Docker  
   
       docker-compose up -d --build  
       docker-compose logs -f app  
   
    Escanea el QR que aparece para autenticar WhatsApp Web.
    Si Puppeteer requiere ruta específica, el contenedor define `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `OPENAI_API_KEY` | API Key de OpenAI | Sí | - |
| `OPENAI_ORGANIZATION_ID` | ID de organización OpenAI | No | - |
| `BOT_PREFIX` | Prefijo para activar el bot | No | `#bot` |
| `ALLOWED_NUMBERS` | Números autorizados (separados por coma) | No | Todos |
| `LOG_LEVEL` | Nivel de logging | No | `info` |
| `PORT` | Puerto del servidor | No | `3000` |
| `DB_PATH` | Ruta de la base de datos | No | `./data/users.db` |
| `TEMP_DIR` | Directorio temporal para media | No | `/tmp/botcito` |
| `OPENAI_TIMEOUT_MS` | Timeout OpenAI en ms | No | `30000` |
| `OPENAI_MAX_RETRIES` | Reintentos OpenAI | No | `3` |
| `PUPPETEER_EXECUTABLE_PATH` | Ruta de Chromium | No | `/usr/bin/chromium` |
| `OPENAI_TIMEOUT_MS` | Timeout de llamadas a OpenAI | No | `30000` |
| `OPENAI_MAX_RETRIES` | Reintentos de llamadas a OpenAI | No | `3` |
| `TEMP_DIR` | Directorio temporal para media | No | `/tmp/botcito` |
| `RATE_LIMIT_PER_MINUTE` | Mensajes por minuto por usuario | No | `10` |
| `MAX_TEXT_CHARS` | Longitud máxima de texto | No | `4000` |
| `HISTORY_LEN` | Mensajes guardados en contexto | No | `20` |
| `MODEL_SELECTION_STRATEGY` | Estrategia de modelos (`balanced` `cost_optimized` `performance_optimized`) | No | `balanced` |
| `WHATSAPP_FORMAT_ENHANCE` | Mejorar formato de texto | No | `true` |
| `WHATSAPP_ADD_SEPARATORS` | Separadores visuales en respuestas | No | `false` |
| `OPENAI_TEXT_TEMPERATURE` | Temperatura por defecto (texto) | No | `0.7` |
| `OPENAI_TEXT_MAX_TOKENS` | Máx. tokens por defecto (texto) | No | `800` |
| `OPENAI_TEXT_TOP_P` | Top-p | No | `1` |
| `OPENAI_TEXT_PRESENCE_PENALTY` | Presencia | No | `0` |
| `OPENAI_TEXT_FREQUENCY_PENALTY` | Frecuencia | No | `0` |
| `OPENAI_IMAGE_TEMPERATURE` | Temperatura por defecto (imagen) | No | `0.7` |
| `OPENAI_IMAGE_MAX_TOKENS` | Máx. tokens por defecto (imagen) | No | `600` |

### Limpieza de temporales
- Se ejecuta al inicio y cada 30 minutos (cron `TEMP_CLEAN_CRON`) para borrar archivos en `TEMP_DIR` más antiguos que `TEMP_MAX_AGE_MS` (6h).

### Componentes legacy
Se eliminaron `controllers/messageController.js` y `services/openaiService.js` para consolidar el flujo oficial en `WhatsAppService` + `OrchestratorService` + `openaiClient` centralizado.

### Ejemplo de `.env`:
```
OPENAI_API_KEY=sk-...
BOT_PREFIX=#bot
ALLOWED_NUMBERS=+5491112345678,+5491187654321
LOG_LEVEL=info
```

---

## 🚀 Uso

### Comandos del Bot

**Conversación inicial** (requiere prefijo):
```
#bot ¿Cuál es la capital de Francia?
```

**Conversación continua** (sin prefijo después del primer comando):
```
¿Y qué otros lugares interesantes hay para visitar?
Busca el clima en Buenos Aires hoy
¿Qué películas de comedia recomiendas?
```

**Finalizar conversación**:
```
desactivar conversación
```

 

### Funciones Especiales

#### Búsquedas web:
```
#bot buscar las últimas noticias sobre inteligencia artificial
busca el clima en Madrid  # (en conversación continua)
```

#### Auto-mensajes:
El bot puede responder a mensajes que te envías a ti mismo, distinguiendo claramente entre:
- ✅ **Mensajes que escribes**: Procesados normalmente
- 🚫 **Respuestas del bot**: Ignoradas para evitar loops infinitos

### API Endpoints

- `GET /health` - Estado del servicio
- `GET /ready` - Readiness (WhatsApp listo + DB)
- `GET /metrics` - Métricas Prometheus (si `prom-client` está disponible)
  - Contadores: mensajes recibidos/bloqueados, errores, llamadas a OpenAI
  - Histogramas: duración de llamadas a OpenAI
  - Resultados por handler: `bot_handler_results_total{handler="text|audio|image|mixed",result="success|error"}`
### Parámetros de respuesta del bot (configuración y overrides)

- Defaults de OpenAI para texto e imagen vienen de `.env` y se validan con `envalid`:
  - Texto: `OPENAI_TEXT_TEMPERATURE`, `OPENAI_TEXT_MAX_TOKENS`, `OPENAI_TEXT_TOP_P`, `OPENAI_TEXT_PRESENCE_PENALTY`, `OPENAI_TEXT_FREQUENCY_PENALTY`.
  - Imagen: `OPENAI_IMAGE_TEMPERATURE`, `OPENAI_IMAGE_MAX_TOKENS`.
- El orquestador aplica esos defaults y permite overrides por invocación al llamar internamente:
  - `OrchestratorService.callOpenAI(params, contentType, options)` fusiona `{...defaults, ...params}`; cualquier parámetro pasado en `params` tiene prioridad.
  - Ej.: para subir `temperature` en una llamada concreta, pasar `params = { messages, temperature: 0.9 }`.
- Formato de salida de WhatsApp es configurable vía `.env`:
  - `WHATSAPP_FORMAT_ENHANCE=true|false`, `WHATSAPP_ADD_SEPARATORS=true|false`.
- `GET /stats` - Estadísticas de usuarios
- `GET /conversations` - Lista de conversaciones activas

---

## 📂 Estructura del proyecto

```
secretario-virtual/
├── .env                    ← Variables de entorno
├── docker-compose.yml      ← Configuración Docker
├── Dockerfile             ← Imagen Docker
├── index.js               ← Punto de entrada
├── core/
│   └── app.js            ← Aplicación principal
├── models/
│   ├── user/
│   │   └── User.js       ← Modelo de usuarios
 
├── services/
│   ├── orchestrator/
│   │   └── OrchestratorService.js ← Orquestador IA
 
│   ├── whatsappService.js ← Servicio WhatsApp
 
├── integrations/
│   └── whatsapp/
│       └── client.js      ← Cliente WhatsApp con anti-loops
├── config/
│   └── index.js          ← Configuración
├── utils/
│   ├── logger.js         ← Sistema de logging
│   └── sanitizer.js      ← Sanitización de datos
├── scripts/
│   ├── migrate.js        ← Script de migración
│   ├── test-setup.js     ← Pruebas de configuración
│   ├── test-conversation.js ← Pruebas de conversación
│   ├── test-security.js  ← Pruebas de seguridad
├── dev-setup.sh           ← Script de configuración WSL
├── docker-run.sh          ← Script de ejecución Docker
├── WSL_SETUP.md          ← Documentación WSL
└── data/                 ← Base de datos SQLite
    └── users.db
```

---

## 📜 Scripts disponibles

### Scripts NPM
| Comando          | Acción                                  |
|------------------|-----------------------------------------|
| `npm start`      | Ejecuta `node index.js`                 |
| `npm run dev`    | Ejecuta con nodemon                     |
| `npm run health` | Ejecuta health check                    |
| `npm run lint`   | Lanza ESLint en `.js`                   |
| `npm run test`   | Ejecuta tests                           |
| `npm run migrate`| Inicializa base de datos                |
| `npm run test-setup` | Pruebas de configuración básica        |
| `npm run test-conversation` | Pruebas de conversación continua       |
| `npm run test-security` | Pruebas de seguridad anti-loops        |
| `npm run pet-examples` | Ejemplos de mascotas virtuales         |

### Scripts de Desarrollo WSL
| Comando          | Acción                                  |
|------------------|-----------------------------------------|
| `./dev-setup.sh full-setup` | Configuración completa automática      |
| `./dev-setup.sh migrate` | Inicializa BD (WSL)                    |
| `./dev-setup.sh test-setup` | Pruebas de configuración (WSL)         |
| `./dev-setup.sh test-conversation` | Pruebas conversación (WSL)             |
| `./dev-setup.sh test-security` | Pruebas seguridad (WSL)               |
| `./dev-setup.sh docker-build` | Construir imagen Docker                |
| `./dev-setup.sh docker-up` | Levantar contenedor                   |
| `./dev-setup.sh docker-logs` | Ver logs del contenedor                |

### Scripts Docker
| Comando          | Acción                                  |
|------------------|-----------------------------------------|
| `./docker-run.sh migrate` | Inicializa BD (Docker)                 |
| `./docker-run.sh test-setup` | Pruebas configuración (Docker)         |
| `./docker-run.sh test-conversation` | Pruebas conversación (Docker)          |
| `./docker-run.sh test-security` | Pruebas seguridad (Docker)            |
| `./docker-run.sh shell` | Shell interactivo en contenedor       |
| `./docker-run.sh logs` | Ver logs del contenedor                |

---

## 🔒 Seguridad

### Protecciones Implementadas

#### Anti-Loop Infinito 🔄
- **Detección de mensajes del bot**: Sistema de hashing MD5 para identificar respuestas propias
- **Filtrado inteligente**: Distingue entre mensajes del usuario y respuestas del bot
- **Prevención de auto-procesamiento**: Evita que el bot responda a sus propias respuestas

#### Rate Limiting ⏱️
- **Por usuario**: Máximo 10 mensajes por minuto por número de teléfono
- **Protección contra spam**: Bloqueo temporal de usuarios que exceden el límite
- **Logs de seguridad**: Registro detallado de intentos bloqueados

#### Validación Robusta ✅
- **Validación de origen**: Verificación de números autorizados (opcional)
- **Sanitización de entrada**: Limpieza y validación de todos los mensajes
- **Validación de tipo**: Solo procesa mensajes de chat válidos
- **Límites de longitud**: Rechazo de mensajes excesivamente largos (>4000 caracteres)

#### Seguridad Docker 🐳
- **Usuario no-root**: Ejecución con usuario `app` sin privilegios
- **Capabilities mínimas**: Solo SETUID y SETGID permitidas
- **Volúmenes seguros**: Permisos adecuados para datos persistentes
- **Health checks**: Monitoreo automático del estado del servicio

#### Logs y Monitoreo 📊
- **Trazabilidad completa**: Logs detallados de todos los mensajes procesados
- **Identificación de origen**: Clasificación clara entre mensajes de usuario y bot
- **Alertas de seguridad**: Notificaciones de eventos sospechosos
- **Estadísticas de uso**: Métricas para detectar patrones anómalos

### Pruebas de Seguridad
Ejecuta las pruebas de seguridad para validar todas las protecciones:
```bash
./docker-run.sh test-security
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
Readiness del servicio (WhatsApp listo, DB accesible, breaker de OpenAI cerrado)
```json
{
  "ready": true,
  "users": 12,
  "openaiBreakerOpen": false
}
```

### GET /metrics
Métricas Prometheus (si `prom-client` está disponible)
- Contadores: mensajes recibidos/bloqueados, errores, llamadas a OpenAI
- Histogramas: duración de llamadas a OpenAI
- Gauges: `openai_breaker_open`, `bot_active_conversations`

---

## 🧭 Operación

- Backups: realizar copia del archivo SQLite en `data/users.db` (volumen `user_data`). Sugerido cron externo o job en CI con retención (evitar backup en caliente si hay escrituras intensas).
- Logs: en producción se generan `logs/app-YYYY-MM-DD.log` con rotación diaria y compresión. Ajustable por `LOG_LEVEL`. En desarrollo, salida en consola legible.
- Métricas: `GET /metrics` expone métricas Prometheus (contadores, histogramas y gauges). Alertar si `openai_breaker_open=1` sostenido o `bot_active_conversations` se mantiene en 0 en horario hábil.

### Ejemplos de alertas (PromQL)
- Breaker OpenAI abierto por 5 minutos:
  - `max_over_time(openai_breaker_open[5m]) == 1`
- Conversaciones activas en 0 por 10 minutos (horario laboral):
  - `avg_over_time(bot_active_conversations[10m]) == 0`

### Dashboards y Prometheus

- Archivos de ejemplo:
  - `monitoring/grafana/dashboards/secretario-virtual-overview.json`
  - `monitoring/prometheus.yml`

- Uso rápido:
  1. Prometheus: editar `monitoring/prometheus.yml` si no usas Docker Desktop; reemplazar `host.docker.internal` por el host correcto.
  2. Iniciar Prometheus:
     - `docker run -p 9090:9090 -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus`
  3. Importar dashboard en Grafana: importar el JSON desde `monitoring/grafana/dashboards/secretario-virtual-overview.json` y seleccionar tu datasource Prometheus.

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
- [x] Validación robusta de mensajes
- [x] Sistema de seguridad avanzado
- [x] Pruebas automatizadas de seguridad
- [x] Soporte para auto-mensajes seguros
- [x] Scripts de configuración WSL

### 🚀 Próximas Funcionalidades
- [ ] **Integración Discord**: Canal adicional de comunicación
- [ ] **Integración Telegram**: Expansión multi-plataforma  
- [ ] **Integración Gmail**: Gestión de correos electrónicos
- [ ] **Sistema de permisos granular**: Control detallado por módulo
- [ ] **Servicios de descarga**: Integración con servicios Arr (Sonarr, Radarr)
- [ ] **Recordatorios y tareas**: Sistema de notificaciones programadas
- [ ] **Interfaz web de administración**: Panel de control visual
- [ ] **Soporte multimedia**: Procesamiento de imágenes y audio
- [ ] **Integración con streaming**: Control de servicios multimedia
 
- [ ] **Base de datos distribuida**: Soporte para múltiples nodos
- [ ] **API GraphQL**: Interface moderna para integraciones
- [ ] **Webhooks configurables**: Notificaciones a servicios externos
- [ ] **Análisis de sentimientos**: Detección emocional en conversaciones

---

## 🛠 Solución de Problemas

### Problemas Comunes

#### Error: "Cannot find module" en WSL
```bash
Error: Cannot find module 'C:\Windows\scripts\migrate.js'
```
**Solución**: Usa los scripts de desarrollo WSL:
```bash
./dev-setup.sh migrate
# o
./docker-run.sh migrate
```

#### Error: "Permission denied" en scripts
```bash
bash: ./dev-setup.sh: Permission denied
```
**Solución**: Dar permisos de ejecución:
```bash
chmod +x dev-setup.sh docker-run.sh
```

#### Loop infinito en WhatsApp
El sistema tiene protección automática, pero si experimentas loops:
1. Verifica los logs: `./docker-run.sh logs`
2. Ejecuta las pruebas de seguridad: `./docker-run.sh test-security`
3. Reinicia el contenedor: `docker-compose restart`

#### Contenedor no inicia
```bash
# Ver logs detallados
docker-compose logs app

# Reconstruir desde cero
docker-compose down -v
docker-compose up -d --build
```

### Documentación Adicional
- **[WSL_SETUP.md](WSL_SETUP.md)**: Guía completa para entornos WSL
- **Logs del sistema**: `docker-compose logs -f app`
- **Shell interactivo**: `./docker-run.sh shell`

### Validación del Sistema
Ejecuta todas las pruebas para validar el funcionamiento:
```bash
# Configuración básica
./docker-run.sh test-setup

# Conversaciones continuas
./docker-run.sh test-conversation

# Seguridad anti-loops
./docker-run.sh test-security

# Endpoints (smoke)
DISABLE_WHATSAPP=true OPENAI_API_KEY=dummy node index.js & APP_PID=$! && sleep 2 && node scripts/test-endpoints.js && kill $APP_PID

# Conectividad real a OpenAI (requiere API key válida en .env o env)
npm run test-openai
```

---

## 🤝 Contribuir

1. Haz fork y crea tu rama:  
   
       git checkout -b feature/mi-feature  

2. Commit y push:  
   
       git commit -m "feat: descripción breve"  
       git push origin feature/mi-feature  

3. Abre un Pull Request  

---

## 📄 Licencia

Este proyecto está bajo la **MIT License**. Consulta el archivo `LICENSE`.
