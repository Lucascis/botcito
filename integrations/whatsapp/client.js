const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../../utils/logger');
const alertService = require('../../services/alertService');
const MessageValidator = require('../../utils/messageValidator');
const config = require('../../config');
const WhatsAppSessionManager = require('../../services/session/WhatsAppSessionManager');

class WhatsAppIntegration {
  constructor() {
    this.sessionPath = path.resolve(__dirname, '../../session_data');
    this.processedMessageIds = new Set(); // Almacena IDs de mensajes ya procesados
    this.botMessages = new Map(); // hash -> timestamp, para TTL
    // QR throttling simplificado
    this.lastQrHash = null;
    this.lastQrPrintTs = 0;
    this.suppressQr = false; // Dejar de imprimir QR cuando comienza el login
    this.QR_PRINT_INTERVAL_MS = Number(process.env.QR_PRINT_INTERVAL_MS || 30000); // 30 segundos
    
    // Watchdog backoff exponencial para logs
    this.watchdogLogCount = 0;
    this.lastWatchdogLogTs = 0;
    this.WATCHDOG_LOG_BASE_INTERVAL = 5 * 60 * 1000; // 5 minutos base
    this.initializing = false;
    this.destroying = false;
    this.lastEventTs = Date.now();
    this.clientId = process.env.WPP_CLIENT_ID || 'main';
    this.watchdogFailCount = 0;

    // Gestor de sesiones persistentes
    this.sessionManager = new WhatsAppSessionManager();
    this.currentSessionId = null;
    this.currentUserPhone = null;
    this.lastWatchdogWarnTs = 0;
    this.watchdogInterval = null;
    // Detectar ejecutable de Chromium/Chrome portable (sin parámetros externos)
    let chromiumExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    const isLinux = process.platform === 'linux';
    const isMac = process.platform === 'darwin';
    const isDocker = fs.existsSync('/.dockerenv'); // no confiar en env variables

    // Si viene por env pero es incompatible, ignorar
    if (chromiumExecutable) {
      const looksLikeLinuxChromium = chromiumExecutable === '/usr/bin/chromium';
      if (!fs.existsSync(chromiumExecutable) || (isMac && looksLikeLinuxChromium)) {
        logger.warn(`PUPPETEER_EXECUTABLE_PATH inválido para este entorno (${chromiumExecutable}). Se usará autodetección.`);
        chromiumExecutable = null;
      }
    }

    try {
      if (!chromiumExecutable) {
        // 1) Docker Linux con chromium del sistema
        if (isDocker && isLinux && fs.existsSync('/usr/bin/chromium')) {
          chromiumExecutable = '/usr/bin/chromium';
        } else {
          // 2) Binario portable de Puppeteer (Chrome for Testing)
          try {
            const puppeteer = require('puppeteer');
            const p = typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null;
            if (p && fs.existsSync(p)) chromiumExecutable = p;
          } catch (_) { /* ignore */ }
          // 3) macOS: usar Chrome del sistema si aún no hay path
          if (!chromiumExecutable && isMac) {
            const candidates = [
              '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
              '/Applications/Chromium.app/Contents/MacOS/Chromium'
            ];
            for (const p of candidates) { if (fs.existsSync(p)) { chromiumExecutable = p; break; } }
          }
        }
      }
    } catch (_) { /* ignore */ }

    // Modo headless por defecto SIEMPRE, salvo que HEADFUL=true explícito
    const headfulRequested = String(process.env.HEADFUL || '').toLowerCase() === 'true';
    const headlessMode = headfulRequested ? false : 'new';

    // Limpiar locks en el directorio de LocalAuth para evitar ProcessSingleton
    try {
      const clientId = process.env.WPP_CLIENT_ID || 'main';
      const localAuthDir = path.join(this.sessionPath, `session-${clientId}`);
      fs.mkdirSync(localAuthDir, { recursive: true });
      const files = fs.readdirSync(localAuthDir);
      for (const f of files) {
        if (f.startsWith('Singleton')) {
          try { fs.unlinkSync(path.join(localAuthDir, f)); } catch (_) { /* ignore */ }
        }
      }
    } catch (e) {
      logger.warn(`No se pudo limpiar locks de LocalAuth: ${e?.message || e}`);
    }

    logger.info(`Puppeteer executable: ${chromiumExecutable || 'auto (package default)'}`);

    const pinnedWebVersion = '2.3000.1025719073';

    // Construir args de Puppeteer y aplicar headless solo cuando corresponde
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-crashpad',
      '--no-zygote',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-features=TranslateUI',
      '--window-size=1280,720'
    ];
    if (headlessMode !== false) {
      baseArgs.push('--headless=new');
    }

    this.clientOptions = {
      authStrategy: new LocalAuth({ dataPath: this.sessionPath, clientId: process.env.WPP_CLIENT_ID || 'main' }),
      takeoverOnConflict: true,
      restartOnAuthFail: true,
      authTimeoutMs: 10 * 60 * 1000,
      puppeteer: {
        headless: headlessMode,
        executablePath: chromiumExecutable || undefined,
        args: baseArgs
      },
      // Usar versión remota estable; fallback dinámico a versión fija si hay problemas
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/waVersion.json'
      }
    };
    this.client = new Client(this.clientOptions);
  }

  cleanupLocalAuthLocks() {
    try {
      const localAuthDir = path.join(this.sessionPath, `session-${this.clientId}`);
      fs.mkdirSync(localAuthDir, { recursive: true });
      for (const f of fs.readdirSync(localAuthDir)) {
        if (f.startsWith('Singleton')) {
          try { fs.unlinkSync(path.join(localAuthDir, f)); } catch (_) { /* ignore */ }
        }
      }
    } catch (e) {
      logger.warn(`No se pudo limpiar locks de LocalAuth (pre-init): ${e?.message || e}`);
    }
  }

  async safeRemoveDir(targetDir, { retries = 5, delayMs = 500 } = {}) {
    for (let i = 0; i < retries; i++) {
      try {
        await fs.promises.rm(targetDir, { recursive: true, force: true });
        return true;
      } catch (e) {
        // ENOTEMPTY u otros errores transitorios por handles abiertos
        if (i === retries - 1) {
          logger.warn(`No se pudo eliminar directorio (${targetDir}) tras ${retries} reintentos: ${e?.message || e}`);
          return false;
        }
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    return false;
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
    // Purgar hashes expirados (TTL)
    const { BOT_MSG_TTL_MS } = require('../../utils/constants');
    for (const [hash, ts] of this.botMessages.entries()) {
      if (currentTime - ts > BOT_MSG_TTL_MS) {
        this.botMessages.delete(hash);
      }
    }
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

  /**
   * Determina si debe loguear una advertencia del watchdog basado en backoff exponencial
   * @param {number} now - Timestamp actual
   * @returns {boolean} - Si debe loguear
   */
  _shouldLogWatchdogWarning(now) {
    // Primer log siempre se permite
    if (this.watchdogLogCount === 0) {
      return true;
    }
    
    // Calcular intervalo según backoff exponencial
    const nextLogInterval = this._getNextLogInterval();
    const timeSinceLastLog = now - this.lastWatchdogLogTs;
    
    return timeSinceLastLog >= nextLogInterval;
  }

  /**
   * Calcula el próximo intervalo de log usando backoff exponencial
   * @returns {number} - Intervalo en milliseconds
   */
  _getNextLogInterval() {
    // Backoff exponencial: 5min, 10min, 20min, 40min, luego máximo 60min
    const maxInterval = 60 * 60 * 1000; // 60 minutos máximo
    const exponentialInterval = this.WATCHDOG_LOG_BASE_INTERVAL * Math.pow(2, this.watchdogLogCount);
    return Math.min(exponentialInterval, maxInterval);
  }

  async start(onMessage) {
    // Inicializar el gestor de sesiones
    await this.sessionManager.initialize();
    
    const initializeWithRetry = async (maxRetries = 5) => {
      if (this.initializing) return;
      this.initializing = true;
      let attempt = 0;
      let triedProfileCleanup = false;
      while (attempt < maxRetries) {
        try {
          // limpiar locks antes de intentar iniciar el navegador
          this.cleanupLocalAuthLocks();
          await this.client.initialize();
          this.lastEventTs = Date.now();
          this.initializing = false;
          return;
        } catch (err) {
          attempt++;
          const waitMs = Math.min(15000, 1000 * Math.pow(2, attempt));
          logger.warn(`Fallo al inicializar WhatsApp (intento ${attempt}/${maxRetries}): ${err?.message || err}`);
          const errMsg = String(err?.message || '');
          // Si falla por ProcessSingleton/SingletonLock, eliminar perfil y reintentar una vez
          if (!triedProfileCleanup && (errMsg.includes('ProcessSingleton') || errMsg.includes('SingletonLock'))) {
            try {
              const localAuthDir = path.join(this.sessionPath, `session-${this.clientId}`);
              await fs.promises.rm(localAuthDir, { recursive: true, force: true });
              logger.warn(`Perfil LocalAuth eliminado (${localAuthDir}). Reintentando inicialización limpia...`);
              triedProfileCleanup = true;
              continue;
            } catch (e) {
              logger.warn(`No se pudo eliminar perfil LocalAuth: ${e?.message || e}`);
            }
          }
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
    const registerHandlers = () => {
      this.client.on('qr', (qr) => {
        this.lastEventTs = Date.now();
        try {
          // No mostrar QR si está suprimido o en producción, salvo override explícito
          const allowProdQr = String(process.env.ALLOW_QR_LOG || process.env.SHOW_QR_IN_PRODUCTION || '').toLowerCase() === 'true';
          if (this.suppressQr || (process.env.NODE_ENV === 'production' && !allowProdQr)) {
            if (process.env.NODE_ENV === 'production') {
              logger.info('QR generado (oculto en producción)');
            }
            return;
          }

          const now = Date.now();
          const qrHash = crypto.createHash('md5').update(qr).digest('hex');
          
          // Throttling simple: mismo hash o intervalo muy reciente
          if (qrHash === this.lastQrHash || (now - this.lastQrPrintTs < this.QR_PRINT_INTERVAL_MS)) {
            logger.debug('QR throttled (duplicado o muy reciente)');
            return;
          }

          // Mostrar QR
          this.lastQrHash = qrHash;
          this.lastQrPrintTs = now;
          logger.info('Escanee el código QR para conectar WhatsApp');
          qrcode.generate(qr, { small: true });
        } catch (e) {
          logger.error('Error mostrando QR:', e);
        }
      });

      this.client.on('loading_screen', (percent, message) => {
        this.lastEventTs = Date.now();
        try {
          logger.info(`Cargando WhatsApp (${percent}%): ${message}`);
          if (percent >= 5) {
            this.suppressQr = true;
          }
        } catch (_) { /* ignore */ }
      });

      let authLogged = false;
      this.client.on('authenticated', async (session) => {
        this.lastEventTs = Date.now();
        if (!authLogged) {
          logger.info('Autenticación de WhatsApp exitosa');
          authLogged = true;
          this.suppressQr = true;
          
          // Obtener información del usuario para generar sessionId
          try {
            const info = this.client.info;
            if (info && info.wid && info.wid.user) {
              this.currentUserPhone = info.wid.user;
              this.currentSessionId = this.sessionManager.generateSessionId(this.currentUserPhone);
              
              // Guardar sesión en la base de datos
              await this.sessionManager.saveSession(
                this.currentSessionId,
                this.currentUserPhone,
                { 
                  authData: session,
                  clientInfo: info,
                  authenticatedAt: new Date().toISOString()
                },
                { source: 'authentication_event' }
              );
              
              logger.info(`Sesión guardada para usuario ${this.currentUserPhone} (ID: ${this.currentSessionId})`);
            }
          } catch (error) {
            logger.warn('Error guardando sesión después de autenticación:', error);
          }
        }
      });

      let readyLogged = false;
      this.client.on('ready', () => {
        this.lastEventTs = Date.now();
        if (!readyLogged) {
          logger.info('Cliente de WhatsApp listo');
          readyLogged = true;
        }
      });

      this.client.on('change_state', (state) => {
        this.lastEventTs = Date.now();
        logger.info(`Estado de WhatsApp cambiado: ${state}`);
      });

      const handler = async (msg) => {
        try {
          this.lastEventTs = Date.now();
          
          // Actualizar actividad de la sesión
          if (this.currentSessionId) {
            await this.sessionManager.updateSessionActivity(this.currentSessionId);
          }
          
          if (msg.fromMe && this.isBotMessage(msg.to, msg.body)) {
            logger.debug(`Ignorando respuesta del bot: ${msg.body?.substring(0, 50) || 'sin contenido'}`);
            return;
          }
          // Filtrar mensajes de status/broadcast automáticamente
          if (msg.from === 'status@broadcast' || msg.to?.includes('status@broadcast')) {
            return; // Ignorar estados de WhatsApp silenciosamente
          }

          // Usar validador unificado (modo silencioso)
          if (!MessageValidator.isValidMessage(msg)) {
            return; // El validador ya logueó el motivo
          }
          const messageId = msg.id?._serialized || msg.id;
          if (this.processedMessageIds.has(messageId)) return;
          this.processedMessageIds.add(messageId);
          const limit = config?.limits?.processedMessagesLimit || 1000;
          const cleanupSize = config?.limits?.processedMessagesCleanupSize || 200;
          if (this.processedMessageIds.size > limit) {
            // Eliminar elementos para evitar memory leak (configurable)
            const elementsToDelete = Array.from(this.processedMessageIds).slice(0, cleanupSize);
            elementsToDelete.forEach(id => this.processedMessageIds.delete(id));
          }
          const { from, to, fromMe, type, body } = msg;
          const bodyPreview = typeof body === 'string' ? body.substring(0, 100) : '';
          const messageOrigin = fromMe ? (this.isBotMessage(to, body) ? 'BOT_RESPONSE' : 'USER_SELF') : 'USER_OTHER';
          logger.info(`MSG -> origin=${messageOrigin} id=${messageId} from=${from} to=${to} fromMe=${fromMe} type=${type} body="${bodyPreview}"`);
          await onMessage(msg);
        } catch (err) {
          logger.error('Error en manejador de mensaje de WhatsApp:', err);
        }
      };
      this.client.on('message', handler);
      this.client.on('message_create', handler);

      this.client.on('disconnected', async (reason) => {
      logger.warn(`Desconectado de WhatsApp: ${reason}`);
      alertService.alert(`WhatsApp desconectado: ${reason}`);
      
      // Invalidar sesión en la base de datos
      if (this.currentSessionId && reason && (reason.includes('LOGOUT') || reason.includes('UNPAIRED') || reason.includes('DATA_SYNC'))) {
        try {
          await this.sessionManager.invalidateSession(this.currentSessionId, reason);
          logger.info(`Sesión ${this.currentSessionId} invalidada por ${reason}`);
          this.currentSessionId = null;
          this.currentUserPhone = null;
        } catch (error) {
          logger.warn('Error invalidando sesión:', error);
        }
      }
      
      try {
        this.cleanupLocalAuthLocks();
        // Solo borrar sesión si realmente hubo logout/invalidación
        if (reason && (reason.includes('LOGOUT') || reason.includes('UNPAIRED') || reason.includes('DATA_SYNC'))) {
          // Liberar handles del navegador y cliente antes de borrar
          try { await this.client.destroy(); } catch (_) { /* ignore */ }
          const localAuthDir = path.join(this.sessionPath, `session-${this.clientId}`);
          const removed = await this.safeRemoveDir(localAuthDir, { retries: 8, delayMs: 600 });
          if (removed) {
            logger.info(`Sesión eliminada (${localAuthDir}), reiniciando cliente`);
          } else {
            logger.warn(`No se pudo eliminar completamente la sesión (${localAuthDir}). Continuando con reinicio.`);
          }
          // Reset de flags de QR y reinstanciar cliente
          this.suppressQr = false;
          this.lastQrHash = null;
          this.lastQrPrintTs = 0;
          try { this.client.removeAllListeners(); } catch (_) { /* ignore */ }
          this.client = new Client(this.clientOptions);
          // re-registrar TODOS los handlers y reinicializar
          registerHandlers();
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
    };

    // Registrar handlers iniciales
    registerHandlers();

    // Watchdog con backoff exponencial para logs
    const watchdogIntervalMs = 5 * 60 * 1000; // cada 5 minutos
    const staleThresholdMs = Number(process.env.WPP_WATCHDOG_STALE_MS || (30 * 60 * 1000)); // 30 min threshold
    this.watchdogInterval = setInterval(() => {
      try {
        // No hacer nada si está inicializando o destruyendo
        if (this.initializing || this.destroying) {
          return;
        }

        const now = Date.now();
        const inactiveMs = now - this.lastEventTs;
        if (inactiveMs > staleThresholdMs) {
          // Calcular si debemos loguear basado en backoff exponencial
          const shouldLog = this._shouldLogWatchdogWarning(now);
          
          if (shouldLog) {
            const inactiveMinutes = Math.round(inactiveMs / 60000);
            const nextLogIn = this._getNextLogInterval();
            logger.warn(`WhatsApp lleva ${inactiveMinutes} minutos sin actividad. Próximo aviso en ${Math.round(nextLogIn / 60000)} min.`);
            this.lastWatchdogLogTs = now;
            this.watchdogLogCount++;
          }
          
          // No intentar ping si la sesión está cerrada o falló múltiples veces
          if (this.watchdogFailCount > 10) {
            logger.debug('Watchdog: demasiados fallos, pausando pings');
            return;
          }
        } else {
          // Reset del contador cuando hay actividad
          this.watchdogLogCount = 0;
          this.watchdogFailCount = 0;
        }
      } catch (e) {
        logger.debug(`Watchdog error: ${e?.message || e}`);
      }
    }, watchdogIntervalMs).unref();

    await initializeWithRetry(5);
  }

  async destroy() {
    try {
      this.destroying = true;
      
      // Limpiar watchdog
      if (this.watchdogInterval) {
        clearInterval(this.watchdogInterval);
        this.watchdogInterval = null;
      }
      
      // Destruir cliente
      if (this.client && typeof this.client.destroy === 'function') {
        await this.client.destroy();
      }
      
      logger.info('WhatsApp client destroyed');
    } catch (error) {
      logger.error('Error destroying WhatsApp client:', error);
    } finally {
      this.destroying = false;
    }
  }

  async sendMessage(to, text) {
    if (!to || typeof to !== 'string') {
      throw new Error('sendMessage requires a valid destination');
    }
    const chatId = to.includes('@') ? to : `whatsapp:${to}`;
    
    // Registrar el hash del mensaje del bot ANTES de enviarlo
    const messageHash = this.createMessageHash(chatId, text);
    this.botMessages.set(messageHash, Date.now());
    
    // Limpiar hashes antiguos para evitar crecimiento excesivo (configurable)
    const cacheLimit = config?.limits?.botMessagesCacheLimit || 2000;
    const cleanupSize = config?.limits?.botMessagesCleanupSize || 1000;
    if (this.botMessages.size > cacheLimit) {
      // Purga adicional por tamaño
      const entries = Array.from(this.botMessages.entries()).sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < cleanupSize; i++) {
        this.botMessages.delete(entries[i][0]);
      }
    }
    
    const preview = typeof text === 'string' ? text.substring(0, 50) : '';
    logger.debug(`Enviando mensaje del bot (hash: ${messageHash}): ${preview}...`);
    try {
      await this.client.sendMessage(chatId, text);
    } catch (e) {
      // Si la sesión de puppeteer se cerró, loguear y dejar que el watchdog/reinit actúe
      logger.error(`Fallo enviando mensaje a ${chatId}: ${e?.message || e}`);
      throw e;
    }
  }

}

module.exports = WhatsAppIntegration;
