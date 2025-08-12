// utils/messageValidator.js
const { MAX_TEXT_CHARS } = require('./constants');
const logger = require('./logger');

/**
 * Validador unificado de mensajes para WhatsApp
 */
class MessageValidator {
  /**
   * Valida un mensaje de WhatsApp
   * @param {Object} msg - Mensaje de WhatsApp
   * @param {boolean} throwErrors - Si debe lanzar errores o solo logearlos
   * @returns {Object} - { isValid: boolean, error?: string }
   */
  static validateMessage(msg, throwErrors = false) {
    const validation = { isValid: true, error: null };

    try {
      // Validación básica de estructura
      if (!msg || typeof msg !== 'object') {
        validation.isValid = false;
        validation.error = 'INVALID_MESSAGE: object required';
        return this._handleValidationResult(validation, throwErrors);
      }

      const typeEarly = msg.type;
      const hasMediaEarly = Boolean(msg.hasMedia);
      const bodyEarly = typeof msg.body === 'string' ? msg.body : '';
      
      // Validar tipos permitidos (agregamos document para manejar documentos)
      const allowedTypes = ['chat', 'image', 'audio', 'ptt', 'document', 'sticker'];
      if (!allowedTypes.includes(typeEarly)) {
        validation.isValid = false;
        validation.error = `INVALID_MESSAGE: unsupported type "${typeEarly}"`;
        return this._handleValidationResult(validation, throwErrors);
      }

      // Filtrar tipos que no deben procesarse (pero sí son válidos para no generar errores)
      const processableTypes = ['chat', 'image', 'audio', 'ptt', 'document'];
      if (!processableTypes.includes(typeEarly)) {
        validation.isValid = false;
        validation.error = `SKIP_MESSAGE: type "${typeEarly}" not processable`;
        return this._handleValidationResult(validation, false); // No generar error, solo skippear
      }

      // Validación específica por tipo
      if (typeEarly === 'chat') {
        if (!bodyEarly || !bodyEarly.trim()) {
          validation.isValid = false;
          validation.error = 'INVALID_MESSAGE: empty body';
          return this._handleValidationResult(validation, throwErrors);
        }
        
        if (bodyEarly.length > MAX_TEXT_CHARS) {
          validation.isValid = false;
          validation.error = 'INVALID_MESSAGE: body too long';
          return this._handleValidationResult(validation, throwErrors);
        }
      }

      // Para medios, validar que efectivamente tengan media
      if (['image', 'audio', 'ptt', 'document'].includes(typeEarly) && !hasMediaEarly) {
        validation.isValid = false;
        validation.error = 'INVALID_MESSAGE: media flag missing';
        return this._handleValidationResult(validation, throwErrors);
      }

      // Validar sender
      const userNumber = this._extractUserNumber(msg);
      if (!userNumber) {
        validation.isValid = false;
        validation.error = 'INVALID_MESSAGE: missing sender';
        return this._handleValidationResult(validation, throwErrors);
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.error = `VALIDATION_ERROR: ${error.message}`;
      return this._handleValidationResult(validation, throwErrors);
    }
  }

  /**
   * Extrae el número de usuario del mensaje
   * @param {Object} msg - Mensaje de WhatsApp
   * @returns {string|null} - Número de usuario o null
   */
  static _extractUserNumber(msg) {
    if (!msg.from || typeof msg.from !== 'string') return null;
    return msg.from.replace('@c.us', '');
  }

  /**
   * Maneja el resultado de validación según si debe lanzar errores o no
   * @param {Object} validation - Resultado de validación
   * @param {boolean} throwErrors - Si debe lanzar errores
   * @returns {Object} - Resultado de validación
   */
  static _handleValidationResult(validation, throwErrors) {
    if (!validation.isValid) {
      if (throwErrors) {
        throw new Error(validation.error);
      } else {
        logger.debug(`Mensaje inválido: ${validation.error}`);
      }
    }
    return validation;
  }

  /**
   * Validación rápida para filtros iniciales (sin logs)
   * @param {Object} msg - Mensaje de WhatsApp
   * @returns {boolean} - Si el mensaje es válido
   */
  static isValidMessage(msg) {
    const result = this.validateMessage(msg, false);
    return result.isValid;
  }
}

module.exports = MessageValidator;
