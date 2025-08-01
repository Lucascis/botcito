// controllers/messageController.js
const logger = require('../utils/logger');
const { sanitizeText } = require('../utils/sanitizer');
const { allowedNumbers, botPrefix } = require('../config');

class MessageController {
  constructor(whatsappService, openaiService) {
    this.whatsappService = whatsappService;
    this.openaiService = openaiService;
    this.sentResponses = {};
  }

  async handleMessage(msg) {
    try {
      const fromMe = Boolean(msg.fromMe);
      const jid    = fromMe ? msg.to : msg.from;
      const rawJid = jid || '';
      const phone  = rawJid.split('@')[0];
      const normalized = phone.startsWith('+') ? phone : `+${phone}`;

      if (!fromMe && !allowedNumbers.includes(normalized)) {
        logger.warn(`Número no permitido: ${normalized}. Ignorando.`);
        return;
      }

      let text = sanitizeText(msg.body || '');

      // Exigir prefijo
      if (botPrefix) {
        const lower = text.toLowerCase();
        if (!lower.startsWith(botPrefix.toLowerCase())) return;
        text = text.slice(botPrefix.length).trim();
        if (!text) return;
      }

      logger.info(`Mensaje recibido de ${normalized}: ${text}`);

      // Evitar bucles
      if (fromMe) {
        const seen = this.sentResponses[normalized] || [];
        if (seen.includes(text)) return;
      }

      // **Obtener el timestamp de WhatsApp** (en segundos)
      const ts = msg.timestamp || Math.floor(Date.now() / 1000);

      // Pasamos el timestamp a OpenAIService
      const reply = await this.openaiService.getReply(normalized, text, ts);
      if (reply) {
        // Registrar para no responder a nuestra propia respuesta
        this.sentResponses[normalized] = this.sentResponses[normalized] || [];
        this.sentResponses[normalized].push(reply);
        if (this.sentResponses[normalized].length > 5) {
          this.sentResponses[normalized].shift();
        }
        await this.whatsappService.sendMessage(rawJid, reply);
      }
    } catch (err) {
      logger.error('Error al procesar mensaje:', err);
    }
  }
}

module.exports = MessageController;
