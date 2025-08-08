# Secretario-Virtual v3.0

**Secretario-Virtual** es una plataforma multi-usuario con orquestación por IA que permite múltiples servicios integrados, orientada principalmente a inteligencia artificial.

## 🌟 Características Principales

- **Orquestador IA**: Sistema centralizado que interpreta intenciones y enruta acciones
- **Multi-usuario**: Soporte para múltiples usuarios con contextos independientes
- **Integración WhatsApp**: Canal principal de comunicación con conversaciones continuas
- **Búsqueda Web**: Capacidad de búsqueda en internet mediante OpenAI
- **Mascotas Virtuales**: Sistema de IA con personalidades configurables en lenguaje natural
- **Persistencia**: Base de datos SQLite para usuarios, contextos y mascotas
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

### (Removido) Mascotas Virtuales 🐾
Esta funcionalidad fue eliminada para simplificar el núcleo y mejorar seguridad. El sistema está listo para integrarse con nuevos módulos de negocio de forma escalable.

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

### Comandos de Mascotas Virtuales

#### Crear mascotas con descripción natural:
```
#bot crear mascota Luna gato "curiosa y juguetona, le gusta explorar por la casa, su juguete favorito es un ratón de peluche rojo, tiene energía muy alta y le encanta dormir en lugares altos como estantes"
```

#### Configurar mascotas en lenguaje natural:
```
#bot configurar mascota 1 "ahora también le gusta jugar con pelotas de colores brillantes, su comida favorita es atún fresco, aprendió a abrir puertas y es muy cariñosa con los niños pequeños"
```

#### Gestionar mascotas:
```
#bot listar mascotas
#bot activar mascota 1
#bot estadísticas mascotas
```

#### Interactuar con mascotas específicas:
```
#bot @1 ¡Hola Luna! ¿Cómo estás hoy?
#bot @2 Max, ¿quieres jugar con la pelota?
#bot @1 cuéntame sobre tu juguete favorito
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
- `GET /stats` - Estadísticas de usuarios y mascotas
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
│   └── pet/
│       └── VirtualPet.js ← Modelo de mascotas virtuales
├── services/
│   ├── orchestrator/
│   │   └── OrchestratorService.js ← Orquestador IA
│   ├── pet/
│   │   └── PetService.js ← Servicio de mascotas
│   ├── whatsappService.js ← Servicio WhatsApp
│   └── openaiService.js   ← Servicio OpenAI (legacy)
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
│   ├── test-pets.js      ← Pruebas de mascotas
│   ├── test-conversation.js ← Pruebas de conversación
│   ├── test-security.js  ← Pruebas de seguridad
│   └── pet-examples.js   ← Ejemplos de mascotas
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
| `npm run test-pets` | Pruebas de mascotas virtuales          |
| `npm run test-conversation` | Pruebas de conversación continua       |
| `npm run test-security` | Pruebas de seguridad anti-loops        |
| `npm run pet-examples` | Ejemplos de mascotas virtuales         |

### Scripts de Desarrollo WSL
| Comando          | Acción                                  |
|------------------|-----------------------------------------|
| `./dev-setup.sh full-setup` | Configuración completa automática      |
| `./dev-setup.sh migrate` | Inicializa BD (WSL)                    |
| `./dev-setup.sh test-setup` | Pruebas de configuración (WSL)         |
| `./dev-setup.sh test-pets` | Pruebas mascotas (WSL)                |
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
| `./docker-run.sh test-pets` | Pruebas mascotas (Docker)             |
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

### GET /stats
Estadísticas completas de usuarios y mascotas
```json
{
  "users": {
    "totalUsers": 15,
    "activeUsers": 12,
    "recentUsers": 8
  },
  "pets": {
    "totalPets": 23,
    "activePets": 20,
    "avgPetsPerUser": 1.5
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
- [x] Mascotas virtuales con personalidades únicas
- [x] Configuración de mascotas en lenguaje natural
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
- [ ] **Evolución de mascotas**: Aprendizaje basado en interacciones
- [ ] **Mascotas sociales**: Interacciones entre mascotas diferentes
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

# Mascotas virtuales
./docker-run.sh test-pets

# Conversaciones continuas
./docker-run.sh test-conversation

# Seguridad anti-loops
./docker-run.sh test-security
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
