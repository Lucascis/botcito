const { openaiClient } = require('./openaiClient');
const fs = require('fs');
const logger = require('../utils/logger');
const { sanitizeText } = require('../utils/sanitizer');
const { MAX_AUDIO_MB } = require('../utils/constants');
const FileStorageService = require('./storage/FileStorageService');
const fileCircuitBreaker = require('../utils/fileCircuitBreaker');

class AudioService {
  constructor() {
    this.storage = new FileStorageService();
    // Compatibilidad con tests que verifican existencia de cliente
    this.openai = openaiClient;
  }

  /**
   * Transcribe audio usando Whisper
   * @param {string} audioPath - Ruta del archivo de audio
   * @param {string} language - Idioma del audio (opcional)
   * @returns {Promise<string|null>} - Texto transcrito o null si hay error
   */
  async transcribeAudio(audioPath, language = 'es') {
    try {
      logger.info(`Transcribiendo audio: ${audioPath}`);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(audioPath)) {
        logger.error(`Archivo de audio no encontrado: ${audioPath}`);
        return null;
      }

      const transcription = await openaiClient.audioTranscriptionsCreate({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        language: language,
        response_format: "text",
        temperature: 0.0 // Para mayor precisión
      });

      const text = sanitizeText(String(transcription || ''));
      logger.info(`Audio transcrito exitosamente: "${text.substring(0, 100)}..."`);
      return text || null;

    } catch (error) {
      logger.error('Error transcribiendo audio:', error);
      return null;
    }
  }

  /**
   * Guarda archivo de audio desde media de WhatsApp
   * @param {Object} media - Objeto media de WhatsApp
   * @param {string} fromNumber - Número del remitente
   * @returns {Promise<string>} - Ruta del archivo guardado
   */
  async saveAudioFile(media, fromNumber) {
    return fileCircuitBreaker.execute(async () => {
      try {
        // Validar tamaño antes de guardar
        const sizeCheck = this.checkAudioSize(media);
        if (!sizeCheck.isValid) {
          throw new Error(`Audio muy grande: ${sizeCheck.sizeMB}MB > ${sizeCheck.maxSizeMB}MB`);
        }
        const extension = this.getAudioExtension(media.mimetype);
        const filePath = this.storage.saveBase64File({
          base64Data: media.data,
          fromId: fromNumber,
          prefix: 'audio_',
          extension
        });
        return filePath;

      } catch (error) {
        logger.error('Error guardando archivo de audio:', error);
        throw error;
      }
    }, 'save audio file');
  }

  /**
   * Obtiene la extensión del archivo según el mimetype
   * @param {string} mimetype - Tipo MIME del archivo
   * @returns {string} - Extensión del archivo
   */
  getAudioExtension(mimetype) {
    if (!mimetype || typeof mimetype !== 'string') {
      return 'ogg';
    }
    
    // Extraer solo el tipo base (antes del ';' si existe)
    const baseType = mimetype.split(';')[0].trim().toLowerCase();
    
    const extensions = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm'
    };
    
    return extensions[baseType] || 'ogg'; // WhatsApp usa OGG por defecto
  }

  /**
   * Verifica el tamaño máximo permitido del audio
   * @param {Object} media - Objeto media con data base64
   * @returns {{isValid:boolean,size:number,maxSize:number,sizeMB:string,maxSizeMB:number}}
   */
  checkAudioSize(media) {
    const maxSize = MAX_AUDIO_MB * 1024 * 1024; // configurable
    const size = Buffer.byteLength(media?.data || '', 'base64');
    return {
      isValid: size <= maxSize,
      size,
      maxSize,
      sizeMB: (size / (1024 * 1024)).toFixed(2),
      maxSizeMB: (maxSize / (1024 * 1024))
    };
  }

  /**
   * Limpia archivo temporal
   * @param {string} filePath - Ruta del archivo a eliminar
   */
  cleanupFile(filePath) {
    this.storage.cleanupFile(filePath);
  }

  /**
   * Verifica si un tipo MIME es de audio válido
   * @param {string} mimetype - Tipo MIME a verificar
   * @returns {boolean} - True si es audio válido
   */
  isValidAudioType(mimetype) {
    if (!mimetype || typeof mimetype !== 'string') {
      return false;
    }
    
    // Extraer solo el tipo base (antes del ';' si existe)
    const baseType = mimetype.split(';')[0].trim().toLowerCase();
    
    const validTypes = [
      'audio/ogg',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/webm'
    ];
    
    return validTypes.includes(baseType);
  }

  /**
   * Obtiene estadísticas del servicio de audio
   * @returns {Object} - Estadísticas del servicio
   */
  getStats() {
    try {
      const tempDir = this.storage.getTempDir();
      const tempFiles = fs.readdirSync(tempDir).filter(file => file.startsWith('audio_'));
      
      return {
        tempFiles: tempFiles.length,
        tempDir,
        isWorking: true
      };
    } catch (error) {
      return {
        tempFiles: 0,
        tempDir: this.storage.getTempDir(),
        isWorking: false,
        error: error.message
      };
    }
  }
}

module.exports = AudioService;