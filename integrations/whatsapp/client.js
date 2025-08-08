const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../../utils/logger');
const alertService = require('../../services/alertService');

class WhatsAppIntegration {
  constructor() {
    this.sessionPath = path.resolve(__dirname, '../../session_data');
    this.processedMessageIds = new Set(); // Almacena IDs de mensajes ya procesados
    this.botMessages = new Set(); // Almacena hashes de mensajes enviados por el bot
    this.lastQrHash = null; // Evitar QR duplicado
    this.lastQrTs = 0; // Throttle para logs de QR
    this.initializing = false;
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.sessionPath, clientId: 'main' }),
      takeoverOnConflict: true,
      restartOnAuthFail: true,
      authTimeoutMs: 10 * 60 * 1000, // 10 minutos para escanear QR
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-crashpad',
          '--no-zygote',
          '--disable-gpu',
          '--single-process',
          '--window-size=1280,720'
        ]
      },
      // Reduce probabilidad de navegación durante inyección
      webVersionCache: {
        type: 'local'
      }
    });
  }

  /**
   * Crea un hash único para identificar mensajes del bot
   */
  createMessageHash(to, text) {
    const timestamp = Date.now();
    // Crear hash basado en destinatario, texto y timestamp (redondeado a 5 segundos)
    const roundedTimestamp = Math.floor(timestamp / 5000) * 5000;
    const data = `${to}:${text}:${roundedTimestamp}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Verifica si un mensaje es del bot
   */
  isBotMessage(from, body) {
    if (!body || typeof body !== 'string') return false;
    
    const currentTime = Date.now();
    // Crear hashes para los últimos 10 segundos
    for (let i = 0; i <= 2; i++) {
      const checkTime = Math.floor((currentTime - i * 5000) / 5000) * 5000;
      const hash = crypto.createHash('md5').update(`${from}:${body}:${checkTime}`).digest('hex');
      if (this.botMessages.has(hash)) {
        logger.debug(`Mensaje identificado como del bot: ${hash}`);
        return true;
      }
    }
    return false;
  }

  async start(onMessage) {
    const initializeWithRetry = async (maxRetries = 5) => {
      if (this.initializing) return;
      this.initializing = true;
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          await this.client.initialize();
          this.initializing = false;
          return;
        } catch (err) {
          attempt++;
          const waitMs = Math.min(15000, 1000 * Math.pow(2, attempt));
          logger.warn(`Fallo al inicializar WhatsApp (intento ${attempt}/${maxRetries}): ${err?.message || err}`);
          if (err?.message && err.message.includes('Execution context was destroyed')) {
            // Error típico por navegación: esperar y reintentar
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
          if (attempt >= maxRetries) {
            this.initializing = false;
            throw err;
          }
          await new Promise(r => setTimeout(r, waitMs));
        }
      }
      this.initializing = false;
    };
    this.client.on('qr', (qr) => {
      try {
        const hash = crypto.createHash('md5').update(qr).digest('hex');
        const now = Date.now();
        // Evitar loguear el mismo QR repetidamente o más de 1 vez cada 30s
        if (hash === this.lastQrHash && now - this.lastQrTs < 30000) {
          return;
        }
        this.lastQrHash = hash;
        this.lastQrTs = now;
        logger.info('Escanee el código QR para conectar WhatsApp');
        qrcode.generate(qr, { small: true });
      } catch (e) {
        logger.error('Error mostrando QR:', e);
      }
    });

    let authLogged = false;
    this.client.on('authenticated', () => {
      if (!authLogged) {
        logger.info('Autenticación de WhatsApp exitosa');
        authLogged = true;
      }
    });

    let readyLogged = false;
    this.client.on('ready', () => {
      if (!readyLogged) {
        logger.info('Cliente de WhatsApp listo');
        readyLogged = true;
      }
    });

    this.client.on('change_state', (state) => {
      logger.info(`Estado de WhatsApp cambiado: ${state}`);
    });

    const handler = (msg) => {
      try {
        // CRÍTICO: Distinguir entre mensajes del usuario y respuestas del bot
        if (msg.fromMe && this.isBotMessage(msg.to, msg.body)) {
          logger.debug(`Ignorando respuesta del bot: ${msg.body?.substring(0, 50) || 'sin contenido'}`);
          return;
        }

        // Validar tipo de mensaje - permitir chat, imagen, audio y voice messages
        const allowedTypes = ['chat', 'image', 'audio', 'ptt'];
        if (!allowedTypes.includes(msg.type)) {
          logger.debug(`Ignorando mensaje tipo "${msg.type}"`);
          return;
        }

        // Validar que tenga contenido (solo para mensajes de chat sin media)
        if (!msg.hasMedia && (!msg.body || typeof msg.body !== 'string' || msg.body.trim() === '')) {
          logger.debug('Ignorando mensaje sin contenido');
          return;
        }

        // Cada mensaje tiene un id único; usamos _serialized si está disponible
        const messageId = msg.id?._serialized || msg.id;
        // Descartar si ya se procesó (p.ej., disparado por message y message_create)
        if (this.processedMessageIds.has(messageId)) return;
        this.processedMessageIds.add(messageId);
        // Limitar el tamaño del Set para evitar consumos de memoria excesivos
        if (this.processedMessageIds.size > 1000) {
          // Eliminar el primer elemento (Set mantiene orden de inserción)
          const [first] = this.processedMessageIds;
          this.processedMessageIds.delete(first);
        }

        const { from, to, fromMe, type, body } = msg;
        const bodyPreview = typeof body === 'string' ? body.substring(0, 100) : '';
        
        // Determinar el origen del mensaje
        const messageOrigin = fromMe ? 
          (this.isBotMessage(to, body) ? 'BOT_RESPONSE' : 'USER_SELF') : 
          'USER_OTHER';
        
        logger.debug(
          `Mensaje procesado [${messageOrigin}]: id=${messageId}, from=${from}, to=${to}, fromMe=${fromMe}, type=${type}, body="${bodyPreview}"`
        );
        onMessage(msg);
      } catch (err) {
        logger.error('Error en manejador de mensaje de WhatsApp:', err);
      }
    };

    // Escuchar ambos eventos y deduplicar por messageId
    this.client.on('message', handler);
    this.client.on('message_create', handler);

    this.client.on('disconnected', async (reason) => {
      logger.warn(`Desconectado de WhatsApp: ${reason}`);
      alertService.alert(`WhatsApp desconectado: ${reason}`);
      try {
        // Solo borrar sesión si realmente hubo logout/invalidación
        if (reason && (reason.includes('LOGOUT') || reason.includes('UNPAIRED') || reason.includes('DATA_SYNC'))) {
          await fs.promises.rm(this.sessionPath, { recursive: true, force: true });
          logger.info('Sesión corrupta eliminada, reiniciando cliente');
          await initializeWithRetry(5);
          return;
        }
        // Para otros motivos (p.ej. navegación), reintentar sin borrar sesión
        logger.info('Reintentando inicialización sin borrar sesión...');
        await initializeWithRetry(5);
      } catch (err) {
        logger.error('Error al eliminar sesión corrupta:', err);
      }
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('Fallo de autenticación en WhatsApp:', msg);
      alertService.alert(`Fallo de autenticación: ${msg}`);
    });

    await initializeWithRetry(5);
  }

  async sendMessage(to, text) {
    const chatId = to.includes('@') ? to : `whatsapp:${to}`;
    
    // Registrar el hash del mensaje del bot ANTES de enviarlo
    const messageHash = this.createMessageHash(chatId, text);
    this.botMessages.add(messageHash);
    
    // Limpiar hashes antiguos para evitar crecimiento excesivo
    if (this.botMessages.size > 1000) {
      const hashArray = Array.from(this.botMessages);
      // Eliminar los primeros 500 hashes más antiguos
      for (let i = 0; i < 500; i++) {
        this.botMessages.delete(hashArray[i]);
      }
    }
    
    logger.debug(`Enviando mensaje del bot (hash: ${messageHash}): ${text.substring(0, 50)}...`);
    await this.client.sendMessage(chatId, text);
  }

}

module.exports = WhatsAppIntegration;
