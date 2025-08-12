// utils/fileCircuitBreaker.js
const logger = require('./logger');

/**
 * Circuit breaker para operaciones de archivos
 * Previene fallos masivos en operaciones de I/O
 */
class FileCircuitBreaker {
  constructor() {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.isOpen = false;
    
    // Configuración
    this.FAILURE_THRESHOLD = 5; // Fallos antes de abrir
    this.RESET_TIMEOUT_MS = 60 * 1000; // 1 minuto
    this.HALF_OPEN_MAX_REQUESTS = 3; // Máximo requests en half-open
    this.halfOpenRequests = 0;
  }

  /**
   * Verifica si el circuit breaker está abierto
   * @returns {boolean}
   */
  isBreakerOpen() {
    if (!this.isOpen) return false;

    const now = Date.now();
    const timeSinceLastFailure = now - this.lastFailureTime;

    // Si ha pasado suficiente tiempo, ir a half-open
    if (timeSinceLastFailure >= this.RESET_TIMEOUT_MS) {
      this.isOpen = false;
      this.halfOpenRequests = 0;
      logger.info('File circuit breaker: transitioning to half-open state');
      return false;
    }

    return true;
  }

  /**
   * Registra un éxito en operación de archivos
   */
  onSuccess() {
    if (this.failures > 0 || this.isOpen) {
      logger.info('File circuit breaker: operation successful, resetting');
    }
    this.failures = 0;
    this.isOpen = false;
    this.halfOpenRequests = 0;
  }

  /**
   * Registra un fallo en operación de archivos
   * @param {Error} error - Error ocurrido
   */
  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.FAILURE_THRESHOLD) {
      if (!this.isOpen) {
        this.isOpen = true;
        logger.error(`File circuit breaker: OPENED after ${this.failures} failures. Last error: ${error.message}`);
      }
    } else {
      logger.warn(`File circuit breaker: failure ${this.failures}/${this.FAILURE_THRESHOLD}: ${error.message}`);
    }
  }

  /**
   * Verifica si se puede proceder con la operación en estado half-open
   * @returns {boolean}
   */
  canProceedInHalfOpen() {
    if (this.isOpen) return false;
    if (this.halfOpenRequests >= this.HALF_OPEN_MAX_REQUESTS) {
      logger.warn('File circuit breaker: half-open request limit reached');
      return false;
    }
    this.halfOpenRequests++;
    return true;
  }

  /**
   * Ejecuta una operación con circuit breaker
   * @param {Function} operation - Función async a ejecutar
   * @param {string} operationName - Nombre de la operación para logs
   * @returns {Promise} - Resultado de la operación
   */
  async execute(operation, operationName = 'file operation') {
    // Verificar si el circuit breaker está abierto
    if (this.isBreakerOpen()) {
      const error = new Error(`File circuit breaker is OPEN - ${operationName} rejected`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    // En estado half-open, verificar límite de requests
    if (this.failures > 0 && !this.canProceedInHalfOpen()) {
      const error = new Error(`File circuit breaker half-open limit exceeded - ${operationName} rejected`);
      error.code = 'CIRCUIT_BREAKER_HALF_OPEN_LIMIT';
      throw error;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del circuit breaker
   * @returns {Object} - Estadísticas
   */
  getStats() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      halfOpenRequests: this.halfOpenRequests,
      failureThreshold: this.FAILURE_THRESHOLD,
      resetTimeoutMs: this.RESET_TIMEOUT_MS
    };
  }
}

// Singleton instance
const fileCircuitBreaker = new FileCircuitBreaker();

module.exports = fileCircuitBreaker;

