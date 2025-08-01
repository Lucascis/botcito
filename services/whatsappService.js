const WhatsAppIntegration = require('../integrations/whatsapp/client');
const logger = require('../utils/logger');

/**
 * Servicio que envuelve la integración con WhatsApp y añade registros.
 */
class WhatsAppService {
  constructor() {
    this.integration = new WhatsAppIntegration();
  }

  /**
   * Inicia la conexión con WhatsApp Web.
   * @param {Function} onMessage Manejador de mensajes entrantes
   */
  async start(onMessage) {
    await this.integration.start(onMessage);
    logger.info('Integración WhatsApp iniciada');
  }

  /**
   * Envía un mensaje a un número de WhatsApp.
   * @param {string} to Número destino (con +).
   * @param {string} text Contenido del mensaje.
   */
  async sendMessage(to, text) {
    try {
      logger.debug(`Enviando mensaje a ${to}: "${text.substring(0, 100)}"`);
      await this.integration.sendMessage(to, text);
    } catch (err) {
      logger.error(`Error enviando mensaje a ${to}:`, err);
    }
  }
}

module.exports = WhatsAppService;
