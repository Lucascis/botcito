# Secretario-Virtual

**Secretario-Virtual** es un asistente conversacional para WhatsApp Web potenciado por OpenAI (GPT-4o) que:

- Mantiene conversaciones contextuales con historial.  
- Responde solo al prefijo configurado (`BOT_PREFIX`).  
- Auto-detecta el idioma de la consulta y responde en él.  
- Incorpora la fecha y hora UTC−3 (America/Argentina/Buenos_Aires) obtenida de WhatsApp.  
- Ejecuta búsquedas web oficiales (`web_search_preview`) mediante function calling.  
- Corre en Docker sin privilegios de root y aplica medidas de seguridad (Helmet, rate-limiting, drop capabilities).

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
9. Despliegue continuo  
10. Próximas mejoras  
11. Contribuir  
12. Licencia  

---

## 🌟 Características

- Conversación contextual (historial de hasta 20 turnos por usuario)  
- Invocación por prefijo (`BOT_PREFIX`, p. ej. `#bot`)  
- Detección de idioma: responde en el mismo idioma de la consulta  
- Contexto temporal: inyecta fecha y hora local (UTC−3) desde `msg.timestamp`  
- Function calling integrado: el modelo decide si invocar `search_web` para datos actualizados  
- Docker seguro:  
    - Usuario no-root (`app`)  
    - Volumen `session_data` con permisos 777  
    - `no-new-privileges`, drop ALL capabilities, solo añade SETUID/SETGID  
- Express con Helmet y Rate-Limit (30 req/min)  

---

## 🛠 Requisitos

- Docker ≥ 20.x y Docker Compose ≥ 1.29  
- Node.js 18.x (solo si ejecutas localmente)  
- Cuenta de OpenAI con acceso a Responses API (modelo `gpt-4o` + `web_search_preview`)  
- Número(s) de WhatsApp autorizados  

---

## 🔧 Instalación

1. Clona el repositorio  
   
       git clone https://github.com/tu-usuario/secretario-virtual.git  
       cd secretario-virtual  

2. Configura variables de entorno  
   
       cp .env.example .env  
       (Editar `.env` con tus valores:  
         - OPENAI_API_KEY  
         - OPENAI_ORGANIZATION_ID (opcional)  
         - ALLOWED_NUMBERS  
         - BOT_PREFIX  
         - LOG_LEVEL  
       )  

3. Construye e inicia con Docker  
   
       docker-compose up -d --build  
       docker-compose logs -f app  
   
   Escanea el QR que aparece para autenticar WhatsApp Web.

---

## ⚙️ Configuración

- `.env`: no versionarlo; contiene tus credenciales.  
- `.gitignore`: debe excluir `.env`, `node_modules/`, `session_data/`, logs, etc.  
- Docker:  
    - `Dockerfile` crea usuario `app` y restringe privilegios  
    - `docker-entrypoint.sh` ajusta permisos de `session_data`  
    - `docker-compose.yml` define el servicio y volúmenes  

---

## 🚀 Uso

Envía un mensaje que comience con el prefijo:

    #bot ¿Cuál es la capital de Francia?  
    #bot buscar clima en Buenos Aires hoy  

- El bot usa `chat.completions` para conversaciones.  
- Si necesita datos actualizados, invoca `search_web` y genera la respuesta final.  

---

## 📂 Estructura del proyecto

    secretario-virtual/
    ├── .env.example
    ├── .gitignore
    ├── Dockerfile
    ├── docker-compose.yml
    ├── docker-entrypoint.sh
    ├── index.js
    ├── health.js
    ├── package.json
    ├── config/
    │   └── index.js
    ├── core/
    │   └── app.js
    ├── controllers/
    │   └── messageController.js
    ├── integrations/
    │   └── whatsapp/
    │       └── client.js
    ├── services/
    │   ├── openaiService.js
    │   ├── whatsappService.js
    │   └── alertService.js
    ├── utils/
    │   ├── logger.js
    │   └── sanitizer.js
    └── session_data/       ← volumen Docker para sesiones persistentes  

---

## 📜 Scripts disponibles

| Comando          | Acción                                  |
|------------------|-----------------------------------------|
| `npm start`      | Ejecuta `node index.js`                 |
| `npm run health` | Ejecuta health check (`node health.js`) |
| `npm run lint`   | Lanza ESLint en `.js`                   |

---

## 🔒 Seguridad

- Usuario no-root en Docker  
- Volumen `session_data` con permisos 777  
- `no-new-privileges`, drop ALL capabilities  
- Express con Helmet y Rate-Limit (30 req/min)  
- Sanitización de entrada  
- GitHub Secret Scanning: mantén `.env` fuera del repo y rota tu API key si se expone  

---

## 📈 Despliegue continuo

- GitHub Actions para CI: lint, tests y build  
- Dependabot para dependencias seguras  
- Despliegue a AWS ECS, DigitalOcean, Heroku, etc.  

---

## 🔮 Próximas mejoras

- Persistencia en SQLite o MongoDB  
- Recordatorios y tareas por comando  
- Interfaz web para monitoreo  
- Envío multimedia (imágenes, mapas, PDFs)  
- Soporte de voz (STT/TTS)  

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
