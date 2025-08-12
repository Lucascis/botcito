// services/session/WhatsAppSessionManager.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');
const User = require('../../models/user/User');

/**
 * Gestiona las sesiones persistentes de WhatsApp
 */
class WhatsAppSessionManager {
  constructor() {
    this.userModel = new User();
    this.sessionDir = path.resolve(__dirname, '../../session_data');
    this.activeSessions = new Map(); // sessionId -> sessionInfo
  }

  /**
   * Genera un ID único para la sesión basado en el número de teléfono
   * @param {string} userPhone - Número de teléfono del usuario
   * @returns {string} - ID único de la sesión
   */
  generateSessionId(userPhone) {
    const cleanPhone = userPhone.replace(/[^\d]/g, '');
    return `wpp_session_${cleanPhone}`;
  }

  /**
   * Recupera una sesión existente desde la base de datos
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<Object|null>} - Datos de la sesión o null si no existe
   */
  async getStoredSession(sessionId) {
    try {
      const session = await this.userModel.getWhatsAppSession(sessionId);
      if (session) {
        logger.info(`Sesión recuperada desde BD: ${sessionId} (usuario: ${session.userPhone})`);
        return session;
      }
      return null;
    } catch (error) {
      logger.error(`Error recuperando sesión ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Guarda una sesión en la base de datos
   * @param {string} sessionId - ID de la sesión
   * @param {string} userPhone - Teléfono del usuario
   * @param {Object} sessionData - Datos de la sesión
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<boolean>} - True si se guardó correctamente
   */
  async saveSession(sessionId, userPhone, sessionData, metadata = {}) {
    try {
      // Agregar información de la sesión
      const enhancedMetadata = {
        ...metadata,
        savedAt: new Date().toISOString(),
        userAgent: sessionData?.userAgent || 'unknown',
        browserVersion: sessionData?.browserVersion || 'unknown'
      };

      await this.userModel.saveWhatsAppSession(sessionId, userPhone, sessionData, enhancedMetadata);
      
      // Actualizar cache local
      this.activeSessions.set(sessionId, {
        sessionId,
        userPhone,
        sessionData,
        metadata: enhancedMetadata,
        lastActive: new Date()
      });

      logger.info(`Sesión guardada: ${sessionId} (usuario: ${userPhone})`);
      return true;
    } catch (error) {
      logger.error(`Error guardando sesión ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Invalida una sesión (por logout o corrupción)
   * @param {string} sessionId - ID de la sesión
   * @param {string} reason - Razón de la invalidación
   * @returns {Promise<boolean>} - True si se invalidó correctamente
   */
  async invalidateSession(sessionId, reason = 'manual') {
    try {
      await this.userModel.invalidateWhatsAppSession(sessionId, reason);
      
      // Remover del cache local
      this.activeSessions.delete(sessionId);
      
      // Limpiar archivos de sesión si existen
      await this.cleanupSessionFiles(sessionId);
      
      logger.info(`Sesión invalidada: ${sessionId} (razón: ${reason})`);
      return true;
    } catch (error) {
      logger.error(`Error invalidando sesión ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Actualiza la actividad de una sesión
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<void>}
   */
  async updateSessionActivity(sessionId) {
    try {
      await this.userModel.updateSessionActivity(sessionId);
      
      // Actualizar cache local
      if (this.activeSessions.has(sessionId)) {
        const session = this.activeSessions.get(sessionId);
        session.lastActive = new Date();
        this.activeSessions.set(sessionId, session);
      }
    } catch (error) {
      logger.error(`Error actualizando actividad de sesión ${sessionId}:`, error);
    }
  }

  /**
   * Obtiene todas las sesiones activas
   * @returns {Promise<Array>} - Array de sesiones activas
   */
  async getActiveSessions() {
    try {
      const sessions = await this.userModel.getActiveWhatsAppSessions();
      
      // Actualizar cache local
      sessions.forEach(session => {
        this.activeSessions.set(session.sessionId, {
          sessionId: session.sessionId,
          userPhone: session.userPhone,
          sessionData: session.sessionData,
          metadata: session.metadata,
          lastActive: new Date(session.lastActive)
        });
      });

      return sessions;
    } catch (error) {
      logger.error('Error obteniendo sesiones activas:', error);
      return [];
    }
  }

  /**
   * Limpia sesiones expiradas automáticamente
   * @returns {Promise<number>} - Número de sesiones limpiadas
   */
  async cleanupExpiredSessions() {
    try {
      const result = await this.userModel.cleanupExpiredSessions();
      
      if (result.deletedSessions > 0) {
        logger.info(`Limpieza automática: ${result.deletedSessions} sesiones expiradas eliminadas`);
        
        // Limpiar cache local de sesiones eliminadas
        const activeSessions = await this.getActiveSessions();
        const activeIds = new Set(activeSessions.map(s => s.sessionId));
        
        for (const [sessionId] of this.activeSessions) {
          if (!activeIds.has(sessionId)) {
            this.activeSessions.delete(sessionId);
          }
        }
      }

      return result.deletedSessions;
    } catch (error) {
      logger.error('Error en limpieza de sesiones:', error);
      return 0;
    }
  }

  /**
   * Limpia archivos de sesión del sistema de archivos
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<void>}
   */
  async cleanupSessionFiles(sessionId) {
    try {
      const sessionPath = path.join(this.sessionDir, sessionId);
      
      try {
        await fs.access(sessionPath);
        await fs.rmdir(sessionPath, { recursive: true });
        logger.debug(`Archivos de sesión eliminados: ${sessionPath}`);
      } catch (fsError) {
        // Los archivos no existen, no es un error
        logger.debug(`No hay archivos de sesión para limpiar: ${sessionPath}`);
      }
    } catch (error) {
      logger.warn(`Error limpiando archivos de sesión ${sessionId}:`, error);
    }
  }

  /**
   * Inicializa el gestor de sesiones
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Crear directorio de sesiones si no existe
      try {
        await fs.mkdir(this.sessionDir, { recursive: true });
      } catch (mkdirError) {
        // El directorio ya existe
      }

      // Cargar sesiones activas desde la base de datos
      const activeSessions = await this.getActiveSessions();
      logger.info(`Gestor de sesiones inicializado: ${activeSessions.length} sesiones activas cargadas`);

      // Ejecutar limpieza inicial
      await this.cleanupExpiredSessions();

    } catch (error) {
      logger.error('Error inicializando gestor de sesiones:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de las sesiones
   * @returns {Object} - Estadísticas
   */
  getSessionStats() {
    return {
      activeSessions: this.activeSessions.size,
      cacheSize: this.activeSessions.size,
      sessionDir: this.sessionDir
    };
  }
}

module.exports = WhatsAppSessionManager;

