const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const logger = require('../utils/logger');
const WhatsAppService = require('../services/whatsappService');
const OpenAIService = require('../services/openaiService');
const MessageController = require('../controllers/messageController');

class App {
  constructor() {
    this.server = express();
    this.whatsappService = new WhatsAppService();
    this.openaiService = new OpenAIService();
    this.messageController = new MessageController(
      this.whatsappService,
      this.openaiService
    );

    this.server.use(helmet());
    this.server.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false
      })
    );
    this.server.get('/health', (_req, res) => res.json({ status: 'ok' }));
  }

  async start() {
    await this.whatsappService.start((msg) =>
      this.messageController.handleMessage(msg)
    );
    this.server.listen(3000, () =>
      logger.info('Servidor escuchando en el puerto 3000')
    );
  }
}

module.exports = App;
