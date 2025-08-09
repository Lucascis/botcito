// services/storage/FileStorageService.js
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

class FileStorageService {
  constructor(tempDir = process.env.TEMP_DIR || '/tmp/botcito') {
    this.tempDir = tempDir;
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      logger.error('Error asegurando directorio temporal:', error);
      throw error;
    }
  }

  /**
   * Guarda un archivo base64 en el directorio temporal
   * @param {Object} params
   * @param {string} params.base64Data - Contenido base64 sin encabezado data URI
   * @param {string} params.fromId - Identificador del usuario (se normaliza a dígitos)
   * @param {string} params.prefix - Prefijo de nombre de archivo (ej. 'audio_', 'image_')
   * @param {string} params.extension - Extensión del archivo (sin punto)
   * @returns {string} - Ruta absoluta al archivo guardado
   */
  saveBase64File({ base64Data, fromId, prefix, extension }) {
    const safeId = String(fromId || '').replace(/\D/g, '') || 'unknown';
    const timestamp = Date.now();
    const fileName = `${prefix}${safeId}_${timestamp}.${extension}`;
    const filePath = path.join(this.tempDir, fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');
    logger.info(`Archivo guardado: ${filePath}`);
    return filePath;
  }

  /**
   * Elimina un archivo temporal de manera segura
   * @param {string} filePath
   */
  cleanupFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      logger.warn(`Error eliminando archivo temporal: ${error.message}`);
    }
  }

  getTempDir() {
    return this.tempDir;
  }
}

module.exports = FileStorageService;


