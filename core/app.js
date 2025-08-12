const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { validateEnv } = require('../config/envSchema');
const { rateLimit } = require('express-rate-limit');
const cron = require('node-cron');
const { TEMP_CLEAN_CRON } = require('../utils/constants');

const logger = require('../utils/logger');
let promClient;
try { promClient = require('prom-client'); } catch (_) { promClient = null; }
const WhatsAppService = require('../services/whatsappService');

class App {
  constructor() {
    this.server = express();
    this.whatsappService = new WhatsAppService();

    this.server.disable('x-powered-by');
    this.server.use(helmet());
    this.server.use(express.json({ limit: '200kb' }));
    const env = validateEnv();
    const allowedOrigins = (env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const corsOptions = allowedOrigins.length > 0
      ? { origin: allowedOrigins, methods: ['GET', 'HEAD', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }
      : { origin: '*', methods: ['GET', 'HEAD', 'OPTIONS'] };
    this.server.use(cors(corsOptions));
    this.server.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false
      })
    );
    
    // Limpieza de archivos temporales cada 30 minutos (seguridad/ahorro de espacio)
    try {
      const TempCleanupService = require('../services/storage/TempCleanupService');
      const cleanupService = new TempCleanupService();
      // Ejecutar al inicio y luego según cron configurable
      cleanupService.runOnce();
      cron.schedule(TEMP_CLEAN_CRON, () => {
        try { cleanupService.runOnce(); } catch (e) { /* ya loguea internamente */ }
      });
    } catch (e) {
      logger.warn(`No se pudo inicializar limpieza de temporales: ${e.message}`);
    }
    
    // Endpoint de salud
    this.server.get('/health', (_req, res) => res.json({ status: 'ok' }));
    
    // Métricas Prometheus
    if (promClient) {
      try {
        const { metrics } = require('../utils/metrics');
        const register = metrics?.register;
        if (register) {
          this.server.get('/metrics', async (_req, res) => {
            try {
              res.setHeader('Content-Type', register.contentType);
              res.end(await register.metrics());
            } catch (e) {
              logger.error('Error generando métricas:', e);
              res.status(500).end();
            }
          });
        }
      } catch (e) {
        logger.warn('Métricas no disponibles:', e?.message || e);
      }
    }

    // Readiness: WhatsApp ready + DB (básico)
    this.server.get('/ready', async (_req, res) => {
      try {
        const wppReady = Boolean(this.whatsappService?.integration?.client?.info);
        // DB check liviano: lista usuarios
        const stats = await this.whatsappService.getStats();
        // Estado del breaker de OpenAI
        let openaiBreakerOpen = false;
        try {
          const { isBreakerOpen } = require('../services/openaiClient');
          openaiBreakerOpen = typeof isBreakerOpen === 'function' ? isBreakerOpen() : false;
        } catch (e) { openaiBreakerOpen = false; }
        
        // Estado del breaker de archivos
        let fileBreakerOpen = false;
        try {
          const fileCircuitBreaker = require('../utils/fileCircuitBreaker');
          fileBreakerOpen = fileCircuitBreaker.isBreakerOpen();
        } catch (e) { fileBreakerOpen = false; }
        
        res.json({ 
          ready: wppReady && !openaiBreakerOpen && !fileBreakerOpen, 
          users: stats.totalUsers ?? 0, 
          openaiBreakerOpen,
          fileBreakerOpen
        });
        } catch (e) { logger.warn('Readiness check falló:', e); res.status(503).json({ ready: false }); }
    });

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

    try {
      logger.debug('Registrando endpoints de sesiones...');

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

    // Endpoint de gestión de sesiones
    logger.debug('Registrando endpoint /sessions');
    this.server.get('/sessions', async (_req, res) => {
      try {
        const sessionManager = this.whatsappService?.integration?.sessionManager;
        if (!sessionManager) {
          return res.status(503).json({ error: 'Session manager not available' });
        }

        const activeSessions = await sessionManager.getActiveSessions();
        const stats = sessionManager.getSessionStats();
        
        res.json({
          sessions: activeSessions.map(session => ({
            sessionId: session.sessionId,
            userPhone: session.userPhone,
            status: session.status,
            createdAt: session.createdAt,
            lastActive: session.lastActive,
            expiresAt: session.expiresAt
          })),
          stats
        });
      } catch (error) {
        logger.error('Error obteniendo sesiones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });

    // Endpoint para invalidar una sesión específica
    this.server.delete('/sessions/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const sessionManager = this.whatsappService?.integration?.sessionManager;
        
        if (!sessionManager) {
          return res.status(503).json({ error: 'Session manager not available' });
        }

        const result = await sessionManager.invalidateSession(sessionId, 'manual_invalidation');
        
        if (result) {
          res.json({ success: true, sessionId, invalidated: true });
        } else {
          res.status(404).json({ error: 'Session not found or already invalid' });
        }
      } catch (error) {
        logger.error('Error invalidando sesión:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });

    logger.debug('Endpoints de sesiones registrados exitosamente');
    } catch (error) {
      logger.error('Error registrando endpoints de sesiones:', error);
      throw error;
    }
  }

  async start() {
    if (!this._started) {
      this._started = true;
      // Iniciar servicio de WhatsApp con orquestador integrado
      const disableWpp = String(process.env.DISABLE_WHATSAPP || '').toLowerCase();
      if (disableWpp === '1' || disableWpp === 'true') {
        logger.warn('WhatsAppService deshabilitado por DISABLE_WHATSAPP');
      } else {
        try {
          await this.whatsappService.start();
        } catch (e) {
          logger.error(`Error iniciando WhatsAppService (continuando sin WhatsApp): ${e?.message || e}`);
        }
      }
      this.server.listen(3000, () =>
        logger.info('Servidor escuchando en el puerto 3000')
      );
      logger.info('Plataforma multi-usuario iniciada correctamente');

      // Auto-limpieza de sesiones expiradas (cada 6 horas)
      setInterval(async () => {
        try {
          const sessionManager = this.whatsappService?.integration?.sessionManager;
          if (sessionManager) {
            await sessionManager.cleanupExpiredSessions();
          }
        } catch (error) {
          logger.error('Error en limpieza automática de sesiones:', error);
        }
      }, 6 * 60 * 60 * 1000).unref();

                // Señales de apagado limpio
          const shutdown = async (signal) => {
            try {
              logger.info(`Recibida señal ${signal}. Cerrando servicios...`);
              try { /* detener tareas cron si se guardan referencias en el futuro */ void 0; } catch (e) { void 0; }
              try { 
                if (this.whatsappService?.integration?.destroy) {
                  await this.whatsappService.integration.destroy();
                }
              } catch (e) { 
                logger.warn(`Error cerrando WhatsApp: ${e?.message}`); 
              }
              process.exit(0);
            } catch (e) {
              logger.error('Error en shutdown:', e);
              process.exit(1);
            }
          };
      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
    } else {
      logger.debug('App.start() llamado más de una vez. Ignorando.');
    }
  }
}

module.exports = App;
