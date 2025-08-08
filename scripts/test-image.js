const ImageService = require('../services/imageService');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function testImageService() {
  try {
    logger.info('🖼️ Iniciando pruebas del ImageService...');
    
    const imageService = new ImageService();
    
    // Prueba 1: Verificar inicialización
    logger.info('\n📝 Prueba 1: Verificando inicialización del servicio...');
    const stats = imageService.getStats();
    
    if (stats.isWorking) {
      logger.info('✅ ImageService inicializado correctamente');
      logger.info(`📁 Directorio temporal: ${stats.tempDir}`);
      logger.info(`📄 Archivos temporales: ${stats.tempFiles}`);
      logger.info(`🎨 Formatos soportados: ${stats.supportedFormats.join(', ')}`);
      logger.info(`📊 Tamaño máximo: ${stats.maxSizeMB}MB`);
    } else {
      throw new Error('ImageService no se inicializó correctamente');
    }
    
    // Prueba 2: Verificar tipos MIME válidos
    logger.info('\n📝 Prueba 2: Verificando validación de tipos MIME...');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidTypes = ['video/mp4', 'audio/mpeg', 'text/plain'];
    
    validTypes.forEach(type => {
      if (imageService.isValidImageType(type)) {
        logger.info(`✅ Tipo válido reconocido: ${type}`);
      } else {
        throw new Error(`Tipo válido no reconocido: ${type}`);
      }
    });
    
    invalidTypes.forEach(type => {
      if (!imageService.isValidImageType(type)) {
        logger.info(`✅ Tipo inválido rechazado: ${type}`);
      } else {
        throw new Error(`Tipo inválido aceptado incorrectamente: ${type}`);
      }
    });
    
    // Prueba 3: Verificar extensiones de archivo
    logger.info('\n📝 Prueba 3: Verificando extensiones de archivo...');
    const extensionTests = [
      { mimetype: 'image/jpeg', expected: 'jpg' },
      { mimetype: 'image/jpg', expected: 'jpg' },
      { mimetype: 'image/png', expected: 'png' },
      { mimetype: 'image/webp', expected: 'webp' },
      { mimetype: 'image/gif', expected: 'gif' },
      { mimetype: 'image/unknown', expected: 'jpg' } // fallback
    ];
    
    extensionTests.forEach(test => {
      const extension = imageService.getImageExtension(test.mimetype);
      if (extension === test.expected) {
        logger.info(`✅ Extensión correcta para ${test.mimetype}: ${extension}`);
      } else {
        throw new Error(`Extensión incorrecta para ${test.mimetype}: esperado ${test.expected}, obtenido ${extension}`);
      }
    });
    
    // Prueba 4: Verificar tipos MIME por extensión
    logger.info('\n📝 Prueba 4: Verificando tipos MIME por extensión...');
    const mimeTypeTests = [
      { filePath: 'test.jpg', expected: 'image/jpeg' },
      { filePath: 'test.jpeg', expected: 'image/jpeg' },
      { filePath: 'test.png', expected: 'image/png' },
      { filePath: 'test.webp', expected: 'image/webp' },
      { filePath: 'test.gif', expected: 'image/gif' },
      { filePath: 'test.unknown', expected: 'image/jpeg' } // fallback
    ];
    
    mimeTypeTests.forEach(test => {
      const mimeType = imageService.getMimeType(test.filePath);
      if (mimeType === test.expected) {
        logger.info(`✅ MIME type correcto para ${test.filePath}: ${mimeType}`);
      } else {
        throw new Error(`MIME type incorrecto para ${test.filePath}: esperado ${test.expected}, obtenido ${mimeType}`);
      }
    });
    
    // Prueba 5: Simulación de guardado de archivo
    logger.info('\n📝 Prueba 5: Simulando guardado de archivo...');
    
    // Crear una imagen de prueba simple (1x1 pixel PNG)
    const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAG/8A0qgQAAAABJRU5ErkJggg==';
    const mockMedia = {
      data: pngData,
      mimetype: 'image/png'
    };
    
    const testFrom = '+5491112345678';
    const savedPath = await imageService.saveImageFile(mockMedia, testFrom);
    
    if (fs.existsSync(savedPath)) {
      logger.info(`✅ Archivo guardado correctamente: ${savedPath}`);
      
      // Verificar contenido
      const savedContent = fs.readFileSync(savedPath, 'base64');
      if (savedContent === pngData) {
        logger.info('✅ Contenido del archivo verificado');
      } else {
        throw new Error('Contenido del archivo no coincide');
      }
      
      // Limpiar archivo de prueba
      imageService.cleanupFile(savedPath);
      
      if (!fs.existsSync(savedPath)) {
        logger.info('✅ Archivo de prueba limpiado correctamente');
      } else {
        logger.warn('⚠️ Archivo de prueba no se eliminó completamente');
      }
    } else {
      throw new Error('Archivo no se guardó correctamente');
    }
    
    // Prueba 6: Verificar validación de tamaño
    logger.info('\n📝 Prueba 6: Verificando validación de tamaño...');
    
    // Imagen pequeña (válida)
    const smallImageCheck = imageService.checkImageSize({ data: pngData });
    if (smallImageCheck.isValid) {
      logger.info(`✅ Imagen pequeña válida: ${smallImageCheck.sizeMB}MB`);
    } else {
      throw new Error('Imagen pequeña incorrectamente marcada como inválida');
    }
    
    // Simular imagen grande (crear datos grandes)
    const largeData = Buffer.alloc(25 * 1024 * 1024).toString('base64'); // 25MB
    const largeImageCheck = imageService.checkImageSize({ data: largeData });
    if (!largeImageCheck.isValid) {
      logger.info(`✅ Imagen grande correctamente rechazada: ${largeImageCheck.sizeMB}MB > ${largeImageCheck.maxSize / (1024 * 1024)}MB`);
    } else {
      throw new Error('Imagen grande incorrectamente marcada como válida');
    }
    
    // Prueba 7: Verificar configuración de OpenAI (sin hacer llamada real)
    logger.info('\n📝 Prueba 7: Verificando configuración de OpenAI...');
    
    if (process.env.OPENAI_API_KEY) {
      logger.info('✅ OPENAI_API_KEY configurada');
      
      // Verificar que el cliente OpenAI se puede instanciar
      if (imageService.openai) {
        logger.info('✅ Cliente OpenAI inicializado');
      } else {
        throw new Error('Cliente OpenAI no inicializado');
      }
    } else {
      logger.warn('⚠️ OPENAI_API_KEY no configurada - el análisis de imágenes reales fallará');
    }
    
    // Prueba 8: Estadísticas finales
    logger.info('\n📝 Prueba 8: Estadísticas finales del servicio...');
    const finalStats = imageService.getStats();
    logger.info(`📊 Estado final: ${JSON.stringify(finalStats, null, 2)}`);
    
    logger.info('\n🎉 ¡Todas las pruebas del ImageService completadas exitosamente!');
    logger.info('🚀 El servicio está listo para procesar imágenes de WhatsApp');
    
    logger.info('\n📱 Para probar con WhatsApp:');
    logger.info('1. Asegúrate de que el bot esté ejecutándose');
    logger.info('2. Envía una imagen sola para análisis básico');
    logger.info('3. Envía una imagen con texto para análisis contextual');
    logger.info('4. Con conversación activa, las imágenes se procesan automáticamente');
    logger.info('5. Formatos soportados: JPG, PNG, WebP, GIF (máx. 20MB)');
    
  } catch (error) {
    logger.error('❌ Error en las pruebas del ImageService:', error);
    process.exit(1);
  }
}

// Verificar que estamos en el directorio correcto
if (!fs.existsSync('package.json')) {
  logger.error('❌ Ejecuta este script desde la raíz del proyecto');
  process.exit(1);
}

testImageService();

