const WhatsAppIntegration = require('../integrations/whatsapp/client');
const OrchestratorService = require('./orchestrator/OrchestratorService');
const AudioService = require('./audioService');
const ImageService = require('./imageService');
const logger = require('../utils/logger');
const { botPrefix, allowedNumbers } = require('../config');

/**
 * Servicio que envuelve la integración con WhatsApp y añade registros.
 */
class WhatsAppService {
  constructor() {
    this.integration = new WhatsAppIntegration();
    this.orchestrator = new OrchestratorService();
    this.audioService = new AudioService();
    this.imageService = new ImageService();
    this.activeConversations = new Map(); // Mantener conversaciones activas
    this.rateLimiter = new Map(); // Rate limiting por usuario
    this.maxMessagesPerMinute = 10; // Máximo 10 mensajes por minuto por usuario
  }

  /**
   * Inicia la conexión con WhatsApp Web.
   */
  async start() {
    if (this._started) {
      logger.debug('WhatsAppService.start() llamado más de una vez. Ignorando.');
      return;
    }
    this._started = true;
    await this.integration.start(this.handleMessage.bind(this));
    logger.info('Integración WhatsApp iniciada con orquestador multi-usuario');
  }

  /**
   * Verifica rate limiting por usuario
   * @param {string} from Número del usuario
   * @returns {boolean} true si puede procesar, false si está limitado
   */
  /**
   * Obtiene el ID único del chat
   * @param {Object} msg Mensaje de WhatsApp
   * @returns {string} ID único del chat
   */
  getChatId(msg) {
    // WhatsApp Web.js proporciona diferentes formas de obtener el chatId
    // Priorizar chatId oficial, luego usar lógica correcta según fromMe
    if (msg.chatId) {
      return msg.chatId;
    }
    
    // Si tenemos los datos del ID del mensaje, usarlos
    if (msg._data?.id?.remote) {
      return msg._data.id.remote;
    }
    
    if (msg.id?.remote) {
      return msg.id.remote;
    }
    
    // Fallback: usar 'to' para mensajes que enviamos, 'from' para mensajes que recibimos
    // Esto asegura que obtengamos el ID del chat correcto
    return msg.fromMe ? msg.to : msg.from;
  }

  /**
   * Obtiene el número del usuario que envía el mensaje
   * @param {Object} msg Mensaje de WhatsApp
   * @returns {string} Número del usuario (limpio, sin @c.us)
   */
  getUserNumber(msg) {
    // SIEMPRE obtener el número del que ENVÍA el mensaje (from)
    // No importa si es fromMe=true o false, siempre queremos validar quién lo envía
    const rawNumber = msg.from;
    // Extraer solo el número, removiendo @c.us y otros sufijos, y normalizar
    const numberPart = rawNumber.split('@')[0];
    // Remover + y otros caracteres para normalizar
    return numberPart.replace(/[\s\+\-\(\)]/g, '');
  }

  checkRateLimit(userNumber) {
    const now = Date.now();
    const userLimits = this.rateLimiter.get(userNumber) || { messages: [], lastReset: now };
    
    // Limpiar mensajes más antiguos de 1 minuto
    userLimits.messages = userLimits.messages.filter(time => now - time < 60000);
    
    // Verificar si excede el límite
    if (userLimits.messages.length >= this.maxMessagesPerMinute) {
      logger.warn(`Rate limit excedido para ${userNumber}: ${userLimits.messages.length} mensajes en el último minuto`);
      return false;
    }
    
    // Agregar mensaje actual
    userLimits.messages.push(now);
    this.rateLimiter.set(userNumber, userLimits);
    
    return true;
  }

  /**
   * Detecta el tipo de contenido del mensaje
   * @param {Object} msg Mensaje de WhatsApp
   * @returns {string} Tipo de contenido: 'audio', 'image', 'text', 'mixed'
   */
  detectMediaType(msg) {
    const hasAudio = msg.hasMedia && (msg.type === 'audio' || msg.type === 'ptt');
    const hasImage = msg.hasMedia && msg.type === 'image';
    const hasText = msg.body && msg.body.trim();

    if (hasAudio) return 'audio';
    if (hasImage && hasText) return 'mixed';
    if (hasImage) return 'image';
    return 'text';
  }

  /**
   * Maneja mensajes de audio
   * @param {Object} msg Mensaje de WhatsApp con audio
   */
  async handleAudio(msg) {
    const { timestamp } = msg;
    const chatId = this.getChatId(msg);
    const userNumber = this.getUserNumber(msg);
    let audioPath = null;

    try {
      logger.info(`Mensaje de audio recibido de ${userNumber} en chat ${chatId}`);
      
      // PRIMERO: Verificar si hay conversación activa EN ESTE CHAT
      const isActive = this.activeConversations.get(chatId);
      
      if (!isActive) {
        // Si no hay conversación activa EN ESTE CHAT, ignorar el audio completamente
        // No consumir tokens de OpenAI innecesariamente
        logger.debug(`Audio ignorado de ${userNumber} en chat ${chatId}: no hay conversación activa`);
        return;
      }
      
      logger.info(`Procesando audio de ${userNumber} en chat ${chatId} (conversación activa)`);
      
      // Descargar y guardar audio
      const media = await msg.downloadMedia();
      
      // Verificar que sea un tipo de audio válido
      if (!this.audioService.isValidAudioType(media.mimetype)) {
        await this.sendMessage(chatId, '❌ Tipo de audio no válido. Envía un audio en formato compatible.');
        return;
      }
      
      audioPath = await this.audioService.saveAudioFile(media, userNumber);
      
      // Transcribir audio (solo si hay conversación activa)
      const transcription = await this.audioService.transcribeAudio(audioPath);
      
      if (!transcription) {
        await this.sendMessage(chatId, '❌ No pude procesar el audio. Intenta enviarlo de nuevo.');
        return;
      }

      logger.info(`Audio de ${userNumber} en chat ${chatId} transcrito: "${transcription}"`);

      // Procesar como mensaje de texto normal
      const result = await this.orchestrator.processMessage(
        userNumber,
        chatId,
        transcription,
        timestamp,
        'whatsapp'
      );

      // Enviar respuesta AL CHAT donde fue invocado
      if (result.reply) {
        await this.sendMessage(chatId, result.reply);
        logger.info(`Respuesta de audio enviada al chat ${chatId}`);
        
        // Verificar si debe desactivar conversación (respuesta del orquestador)
        if (result.shouldDeactivate) {
          this.deactivateConversation(chatId);
        }
      }

    } catch (error) {
      logger.error('Error procesando audio:', error);
      await this.sendMessage(chatId, '❌ Error procesando el audio. Intenta de nuevo.');
    } finally {
      // Limpiar archivo temporal
      if (audioPath) {
        this.audioService.cleanupFile(audioPath);
      }
    }
  }

  /**
   * Maneja mensajes de imagen
   * @param {Object} msg Mensaje de WhatsApp con imagen
   */
  async handleImage(msg) {
    const { from, timestamp } = msg;
    let imagePath = null;

    try {
      logger.info(`Procesando mensaje de imagen de ${from}`);

      // Solo usuarios autorizados pueden activar o interactuar
      if (allowedNumbers && allowedNumbers.length > 0) {
        const normalizedAllowed = allowedNumbers.map(n => n.replace(/[\s\+\-\(\)]/g, ''));
        const normalizedFrom = from.split('@')[0].replace(/[\s\+\-\(\)]/g, '');
        const isAllowed = normalizedAllowed.some(n => n === normalizedFrom || normalizedFrom.includes(n) || n.includes(normalizedFrom));
        if (!isAllowed) {
          logger.warn(`Imagen de número no autorizado: ${from}`);
          return; // Silencioso: no responder
        }
      }

      // Requiere conversación activa para procesar imágenes
      const chatId = this.getChatId(msg);
      const isActive = this.activeConversations.get(chatId);
      if (!isActive) {
        logger.debug(`Ignorando imagen en chat ${chatId}: no hay conversación activa`);
        return; // Silencioso
      }

      // Descargar y guardar imagen (validación básica local permitida)
      const media = await msg.downloadMedia();
      if (!this.imageService.isValidImageType(media.mimetype)) return;
      const sizeCheck = this.imageService.checkImageSize(media);
      if (!sizeCheck.isValid) return;

      imagePath = await this.imageService.saveImageFile(media, from);

      // Analizar imagen y tratar como contexto adicional
      const analysis = await this.imageService.analyzeImage(imagePath);
      if (!analysis) return;

      const userNumber = this.getUserNumber(msg);
      const contextMessage = `[El usuario envió una imagen. Análisis: ${analysis}]`;

      const result = await this.orchestrator.processMessage(
        userNumber,
        chatId,
        contextMessage,
        timestamp,
        'whatsapp'
      );

      if (result.reply) {
        await this.sendMessage(chatId, result.reply);
        if (result.shouldDeactivate) this.deactivateConversation(chatId);
      }

    } catch (error) {
      logger.error('Error procesando imagen:', error);
      await this.sendMessage(from, '❌ Error procesando la imagen. Intenta de nuevo.');
    } finally {
      // Limpiar archivo temporal
      if (imagePath) {
        this.imageService.cleanupFile(imagePath);
      }
    }
  }

  /**
   * Maneja mensajes mixtos (imagen con texto)
   * @param {Object} msg Mensaje de WhatsApp con imagen y texto
   */
  async handleMixed(msg) {
    const { from, body, timestamp } = msg;
    let imagePath = null;

    try {
      logger.info(`Procesando mensaje mixto (imagen + texto) de ${from}`);
      
      // Descargar y guardar imagen
      const media = await msg.downloadMedia();
      
      // Verificar que sea un tipo de imagen válido
      if (!this.imageService.isValidImageType(media.mimetype)) {
        await this.sendMessage(from, '❌ Tipo de imagen no válido. Envía una imagen en formato JPG, PNG, WebP o GIF.');
        return;
      }
      
      // Verificar tamaño de la imagen
      const sizeCheck = this.imageService.checkImageSize(media);
      if (!sizeCheck.isValid) {
        await this.sendMessage(from, `❌ Imagen muy grande (${sizeCheck.sizeMB}MB). El límite es ${sizeCheck.maxSize / (1024 * 1024)}MB.`);
        return;
      }
      
      imagePath = await this.imageService.saveImageFile(media, from);
      
      // Procesar imagen con el texto del usuario
      const analysis = await this.imageService.processImageWithText(imagePath, body);
      
      if (!analysis) {
        await this.sendMessage(from, '❌ No pude procesar la imagen con tu mensaje. Intenta de nuevo.');
        return;
      }

      logger.info(`Mensaje mixto de ${from} procesado exitosamente`);

      // Verificar si el texto contiene el prefijo del bot o si hay conversación activa
      const hasPrefix = body && body.toLowerCase().includes(botPrefix.toLowerCase());
      const chatId = this.getChatId(msg);
      const isActive = this.activeConversations.get(chatId);
      
      let textToProcess = body || '';
      
      if (hasPrefix) {
        // Remover el prefijo del texto
        textToProcess = body.replace(new RegExp(botPrefix, 'gi'), '').trim();
        
        // Activar conversación
        this.activeConversations.set(chatId, true);
        logger.info(`Conversación activada para ${chatId} via imagen+texto`);
      } else if (!isActive) {
        // Si no tiene conversación activa y no contiene el prefijo, mostrar análisis básico
        // Silencioso: no responder si no está activa
        return;
      }

      // Construir mensaje contextual para el orquestador
      const userNumber = this.getUserNumber(msg);
      const contextMessage = `${textToProcess} [El usuario envió una imagen con este mensaje. Análisis de la imagen: ${analysis}]`;

      // Procesar con el orquestador
      const result = await this.orchestrator.processMessage(
        userNumber,
        chatId,
        contextMessage,
        timestamp,
        'whatsapp'
      );

      // Enviar respuesta
      if (result.reply) {
        const response = `📷 "${body}"\n\n${result.reply}`;
        await this.sendMessage(chatId, response);
        logger.info(`Respuesta de mensaje mixto enviada a ${chatId}`);
        
        // Verificar si debe desactivar conversación (respuesta del orquestador)
        if (result.shouldDeactivate) {
          this.deactivateConversation(chatId);
        }
      }

    } catch (error) {
      logger.error('Error procesando mensaje mixto:', error);
      await this.sendMessage(from, '❌ Error procesando la imagen con tu mensaje. Intenta de nuevo.');
    } finally {
      // Limpiar archivo temporal
      if (imagePath) {
        this.imageService.cleanupFile(imagePath);
      }
    }
  }

  /**
   * Maneja los mensajes entrantes de WhatsApp
   * @param {Object} msg Mensaje de WhatsApp
   */
  async handleMessage(msg) {
    try {
      const { body, timestamp, type } = msg;
      const chatId = this.getChatId(msg);
      const userNumber = this.getUserNumber(msg);
      
      // CRÍTICO: Verificar rate limiting antes que nada (por usuario, no por chat)
      if (!this.checkRateLimit(userNumber)) {
        return; // Silenciosamente ignorar mensajes que exceden el límite
      }
      
      // Autorización temprana (aplica a TODAS las rutas)
      if (allowedNumbers && allowedNumbers.length > 0) {
        const isAllowed = allowedNumbers.some(allowed => {
          const normalizedAllowed = allowed.replace(/[\s\+\-\(\)]/g, '');
          const normalizedUser = userNumber.replace(/[\s\+\-\(\)]/g, '');
          return normalizedUser === normalizedAllowed || 
                 normalizedUser.includes(normalizedAllowed) ||
                 normalizedAllowed.includes(normalizedUser);
        });
        if (!isAllowed) {
          logger.warn(`Mensaje de número no autorizado: ${userNumber} (números permitidos: ${allowedNumbers.join(', ')})`);
          return;
        }
      }

      // Detectar tipo de contenido y enrutar apropiadamente
      const mediaType = this.detectMediaType(msg);
      
      switch (mediaType) {
        case 'audio':
          return await this.handleAudio(msg);
          
        case 'image':
          return await this.handleImage(msg);
          
        case 'mixed':
          return await this.handleMixed(msg);
          
        case 'text':
          // Continuar con el procesamiento normal de texto
          break;
          
        default:
          logger.warn(`Tipo de media no soportado: ${type}`);
          await this.sendMessage(chatId, '❌ Tipo de mensaje no soportado.');
          return;
      }
      
      // Validaciones de seguridad para mensajes de texto
      if (!userNumber || !body || typeof body !== 'string') {
        logger.warn('Mensaje de texto inválido: faltan datos requeridos');
        return;
      }

      // Sanitizar y validar contenido
      const sanitizedBody = body.trim();
      if (sanitizedBody.length === 0) {
        logger.debug('Ignorando mensaje vacío');
        return;
      }

      if (sanitizedBody.length > 4000) { // Límite de caracteres por mensaje
        logger.warn(`Mensaje muy largo (${sanitizedBody.length} caracteres) de ${userNumber} en chat ${chatId}`);
        await this.sendMessage(chatId, 'Lo siento, tu mensaje es muy largo. Por favor, envía mensajes más cortos.');
        return;
      }

      // (Autorización ya verificada arriba)

      // Eliminar comandos de mascotas (ya no soportado)

      // Verificar si el mensaje comienza con el prefijo del bot
      const hasPrefix = sanitizedBody.startsWith(botPrefix);
      let text = sanitizedBody;
      
      if (hasPrefix) {
        // Extraer el texto sin el prefijo
        text = sanitizedBody.substring(botPrefix.length).trim();
        if (!text) {
          return;
        }
        
        // Activar conversación para ESTE CHAT específico
        this.activeConversations.set(chatId, true);
        logger.info(`Conversación activada para chat ${chatId} por usuario ${userNumber}`);
      } else {
        // Verificar si hay conversación activa EN ESTE CHAT
        const isActive = this.activeConversations.get(chatId);
        if (!isActive) {
          // Si no tiene conversación activa EN ESTE CHAT, ignorar el mensaje
          return;
        }
      }

      logger.info(`Procesando mensaje de ${userNumber} en chat ${chatId}: "${text}"`);

      // Procesar mensaje normal con el orquestador
      const result = await this.orchestrator.processMessage(
        userNumber,
        chatId,
        text,
        timestamp,
        'whatsapp'
      );

      logger.info(`🔍 Resultado del orquestador: shouldDeactivate = ${result.shouldDeactivate}`);

      // Enviar respuesta AL CHAT donde fue invocado
      if (result.reply) {
        await this.sendMessage(chatId, result.reply);
        logger.info(`Respuesta enviada al chat ${chatId}`);
        
        // Verificar si debe desactivar conversación (respuesta del orquestador)
        if (result.shouldDeactivate) {
          logger.info(`🔴 Desactivando conversación para chat ${chatId}`);
          this.deactivateConversation(chatId);
        } else {
          logger.info(`🔵 No se desactiva conversación (shouldDeactivate = ${result.shouldDeactivate})`);
        }
      }

    } catch (error) {
      logger.error('Error procesando mensaje de WhatsApp:', error);
      
      // Enviar mensaje de error al chat
      try {
        const chatId = this.getChatId(msg);
        await this.sendMessage(chatId, 'Lo siento, hubo un error procesando tu mensaje. Inténtalo de nuevo.');
      } catch (sendError) {
        logger.error('Error enviando mensaje de error:', sendError);
      }
    }
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
      throw err;
    }
  }

  /**
   * Obtiene estadísticas de usuarios y servicios
   */
  async getStats() {
    const orchestratorStats = await this.orchestrator.getStats();
    const audioStats = this.audioService.getStats();
    const imageStats = this.imageService.getStats();
    
    return {
      ...orchestratorStats,
      audio: audioStats,
      image: imageStats,
      activeConversations: this.activeConversations.size,
      rateLimitedUsers: this.rateLimiter.size
    };
  }

  /**
   * Desactiva la conversación para un chat específico
   */
  deactivateConversation(chatId) {
    this.activeConversations.delete(chatId);
    logger.info(`Conversación desactivada para chat ${chatId}`);
  }

  /**
   * Obtiene el estado de las conversaciones activas
   */
  getActiveConversations() {
    return Array.from(this.activeConversations.keys());
  }
}

module.exports = WhatsAppService;
