const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../../utils/logger');
const alertService = require('../../services/alertService');

class WhatsAppIntegration {
  constructor() {
    this.sessionPath = path.resolve(__dirname, '../../session_data');
    this.processedMessageIds = new Set(); // Almacena IDs de mensajes ya procesados
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.sessionPath, clientId: 'main' }),
      takeoverOnConflict: true,
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-crashpad'
        ]
      }
    });
  }

  async start(onMessage) {
    this.client.on('qr', (qr) => {
      logger.info('Escanee el código QR para conectar WhatsApp');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.info('Cliente de WhatsApp listo');
    });

    this.client.on('change_state', (state) => {
      logger.info(`Estado de WhatsApp cambiado: ${state}`);
    });

    const handler = (msg) => {
      try {
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
        logger.debug(
          `Mensaje recibido/creado: id=${messageId}, from=${from}, to=${to}, fromMe=${fromMe}, type=${type}, body="${bodyPreview}"`
        );
        onMessage(msg);
      } catch (err) {
        logger.error('Error en manejador de mensaje de WhatsApp:', err);
      }
    };

    // Escuchamos ambos eventos para capturar mensajes entrantes y salientes
    this.client.on('message', handler);
    this.client.on('message_create', handler);

    this.client.on('disconnected', async (reason) => {
      logger.warn(`Desconectado de WhatsApp: ${reason}`);
      alertService.alert(`WhatsApp desconectado: ${reason}`);
      try {
        if (reason && (reason.includes('LOGOUT') || reason.includes('DATA_SYNC'))) {
          await fs.promises.rm(this.sessionPath, { recursive: true, force: true });
          logger.info('Sesión corrupta eliminada, reiniciando cliente');
          this.client.initialize();
        }
      } catch (err) {
        logger.error('Error al eliminar sesión corrupta:', err);
      }
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('Fallo de autenticación en WhatsApp:', msg);
      alertService.alert(`Fallo de autenticación: ${msg}`);
    });

    await this.client.initialize();
  }

  async sendMessage(to, text) {
    const chatId = to.includes('@') ? to : `whatsapp:${to}`;
    await this.client.sendMessage(chatId, text);
  }

}

module.exports = WhatsAppIntegration;
