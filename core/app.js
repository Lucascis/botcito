const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const logger = require('../utils/logger');
const WhatsAppService = require('../services/whatsappService');

class App {
  constructor() {
    this.server = express();
    this.whatsappService = new WhatsAppService();

    this.server.use(helmet());
    this.server.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false
      })
    );
    
    // Endpoint de salud
    this.server.get('/health', (_req, res) => res.json({ status: 'ok' }));
    
    // Endpoint de estadísticas
    this.server.get('/stats', async (_req, res) => {
      try {
        const stats = await this.whatsappService.getStats();
        res.json(stats);
      } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });

    // Endpoint de conversaciones activas
    this.server.get('/conversations', (_req, res) => {
      try {
        const activeConversations = this.whatsappService.getActiveConversations();
        res.json({
          activeConversations,
          count: activeConversations.length
        });
      } catch (error) {
        logger.error('Error obteniendo conversaciones activas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });
  }

  async start() {
    if (!this._started) {
      this._started = true;
      // Iniciar servicio de WhatsApp con orquestador integrado
      await this.whatsappService.start();
      this.server.listen(3000, () =>
        logger.info('Servidor escuchando en el puerto 3000')
      );
      logger.info('Plataforma multi-usuario iniciada correctamente');
    } else {
      logger.debug('App.start() llamado más de una vez. Ignorando.');
    }
  }
}

module.exports = App;
