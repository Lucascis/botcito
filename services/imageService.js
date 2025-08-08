const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ImageService {
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
   * Analiza una imagen usando GPT-4o Vision
   * @param {string} imagePath - Ruta del archivo de imagen
   * @param {string} prompt - Prompt adicional para el análisis
   * @param {string} userMessage - Mensaje del usuario (opcional)
   * @returns {Promise<string|null>} - Análisis de la imagen o null si hay error
   */
  async analyzeImage(imagePath, prompt = null, userMessage = null) {
    try {
      logger.info(`Analizando imagen: ${imagePath}`);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(imagePath)) {
        logger.error(`Archivo de imagen no encontrado: ${imagePath}`);
        return null;
      }

      // Leer y codificar la imagen en base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      // Construir el prompt
      let finalPrompt = 'Describe esta imagen de manera detallada y útil.';
      
      if (userMessage && userMessage.trim()) {
        finalPrompt = `El usuario envió esta imagen con el mensaje: "${userMessage}". ${finalPrompt} Responde de manera contextual al mensaje del usuario.`;
      }
      
      if (prompt && prompt.trim()) {
        finalPrompt = prompt;
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: finalPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high" // Usar alta calidad para mejor análisis
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const analysis = response.choices[0].message.content;
      logger.info(`Imagen analizada exitosamente: "${analysis.substring(0, 100)}..."`);
      return analysis.trim();

    } catch (error) {
      logger.error('Error analizando imagen:', error);
      return null;
    }
  }

  /**
   * Guarda archivo de imagen desde media de WhatsApp
   * @param {Object} media - Objeto media de WhatsApp
   * @param {string} fromNumber - Número del remitente
   * @returns {Promise<string>} - Ruta del archivo guardado
   */
  async saveImageFile(media, fromNumber) {
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = this.getImageExtension(media.mimetype);
      const fileName = `image_${fromNumber.replace(/\D/g, '')}_${timestamp}.${extension}`;
      const filePath = path.join(this.tempDir, fileName);

      // Guardar archivo desde base64
      fs.writeFileSync(filePath, media.data, 'base64');
      
      logger.info(`Archivo de imagen guardado: ${filePath}`);
      return filePath;

    } catch (error) {
      logger.error('Error guardando archivo de imagen:', error);
      throw error;
    }
  }

  /**
   * Obtiene la extensión del archivo según el mimetype
   * @param {string} mimetype - Tipo MIME del archivo
   * @returns {string} - Extensión del archivo
   */
  getImageExtension(mimetype) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    
    return extensions[mimetype] || 'jpg'; // JPG por defecto
  }

  /**
   * Obtiene el tipo MIME basado en la extensión del archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {string} - Tipo MIME
   */
  getMimeType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    
    return mimeTypes[extension] || 'image/jpeg';
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
   * Verifica si un tipo MIME es de imagen válido
   * @param {string} mimetype - Tipo MIME a verificar
   * @returns {boolean} - True si es imagen válida
   */
  isValidImageType(mimetype) {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    
    return validTypes.includes(mimetype);
  }

  /**
   * Verifica el tamaño del archivo de imagen
   * @param {Object} media - Objeto media de WhatsApp
   * @returns {Object} - {isValid: boolean, size: number, maxSize: number}
   */
  checkImageSize(media) {
    const maxSize = 20 * 1024 * 1024; // 20MB límite
    const imageSize = Buffer.byteLength(media.data, 'base64');
    
    return {
      isValid: imageSize <= maxSize,
      size: imageSize,
      maxSize: maxSize,
      sizeMB: (imageSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Procesa imagen con mensaje de texto adicional
   * @param {string} imagePath - Ruta de la imagen
   * @param {string} textMessage - Mensaje de texto que acompaña la imagen
   * @returns {Promise<string|null>} - Respuesta contextual
   */
  async processImageWithText(imagePath, textMessage) {
    try {
      const prompt = `
El usuario envió una imagen junto con este mensaje: "${textMessage}"

Por favor:
1. Describe la imagen de manera detallada
2. Responde específicamente al mensaje del usuario en relación con la imagen
3. Proporciona información útil y contextual

Sé conversacional y útil en tu respuesta.
      `.trim();

      return await this.analyzeImage(imagePath, prompt);
    } catch (error) {
      logger.error('Error procesando imagen con texto:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas del servicio de imagen
   * @returns {Object} - Estadísticas del servicio
   */
  getStats() {
    try {
      const tempFiles = fs.readdirSync(this.tempDir).filter(file => 
        file.startsWith('image_')
      );
      
      return {
        tempFiles: tempFiles.length,
        tempDir: this.tempDir,
        isWorking: true,
        supportedFormats: ['JPEG', 'PNG', 'WebP', 'GIF'],
        maxSizeMB: 20
      };
    } catch (error) {
      return {
        tempFiles: 0,
        tempDir: this.tempDir,
        isWorking: false,
        error: error.message,
        supportedFormats: ['JPEG', 'PNG', 'WebP', 'GIF'],
        maxSizeMB: 20
      };
    }
  }
}

module.exports = ImageService;

