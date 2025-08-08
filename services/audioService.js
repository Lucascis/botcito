const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AudioService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Crear directorio temporal si no existe
    this.tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
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

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        language: language,
        response_format: "text",
        temperature: 0.0 // Para mayor precisión
      });

      logger.info(`Audio transcrito exitosamente: "${transcription.substring(0, 100)}..."`);
      return transcription.trim();

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
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = this.getAudioExtension(media.mimetype);
      const fileName = `audio_${fromNumber.replace(/\D/g, '')}_${timestamp}.${extension}`;
      const filePath = path.join(this.tempDir, fileName);

      // Guardar archivo desde base64
      fs.writeFileSync(filePath, media.data, 'base64');
      
      logger.info(`Archivo de audio guardado: ${filePath}`);
      return filePath;

    } catch (error) {
      logger.error('Error guardando archivo de audio:', error);
      throw error;
    }
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
   * Limpia archivo temporal
   * @param {string} filePath - Ruta del archivo a eliminar
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      logger.warn(`Error eliminando archivo temporal: ${error.message}`);
    }
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
      const tempFiles = fs.readdirSync(this.tempDir).filter(file => 
        file.startsWith('audio_')
      );
      
      return {
        tempFiles: tempFiles.length,
        tempDir: this.tempDir,
        isWorking: true
      };
    } catch (error) {
      return {
        tempFiles: 0,
        tempDir: this.tempDir,
        isWorking: false,
        error: error.message
      };
    }
  }
}

module.exports = AudioService;