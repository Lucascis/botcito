const AudioService = require('../services/audioService');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function testAudioService() {
  try {
    logger.info('🎤 Iniciando pruebas del AudioService...');
    
    const audioService = new AudioService();
    
    // Prueba 1: Verificar inicialización
    logger.info('\n📝 Prueba 1: Verificando inicialización del servicio...');
    const stats = audioService.getStats();
    
    if (stats.isWorking) {
      logger.info('✅ AudioService inicializado correctamente');
      logger.info(`📁 Directorio temporal: ${stats.tempDir}`);
      logger.info(`📄 Archivos temporales: ${stats.tempFiles}`);
    } else {
      throw new Error('AudioService no se inicializó correctamente');
    }
    
    // Prueba 2: Verificar tipos MIME válidos
    logger.info('\n📝 Prueba 2: Verificando validación de tipos MIME...');
    const validTypes = ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
    const invalidTypes = ['video/mp4', 'image/jpeg', 'text/plain'];
    
    validTypes.forEach(type => {
      if (audioService.isValidAudioType(type)) {
        logger.info(`✅ Tipo válido reconocido: ${type}`);
      } else {
        throw new Error(`Tipo válido no reconocido: ${type}`);
      }
    });
    
    invalidTypes.forEach(type => {
      if (!audioService.isValidAudioType(type)) {
        logger.info(`✅ Tipo inválido rechazado: ${type}`);
      } else {
        throw new Error(`Tipo inválido aceptado incorrectamente: ${type}`);
      }
    });
    
    // Prueba 3: Verificar extensiones de archivo
    logger.info('\n📝 Prueba 3: Verificando extensiones de archivo...');
    const extensionTests = [
      { mimetype: 'audio/ogg', expected: 'ogg' },
      { mimetype: 'audio/mpeg', expected: 'mp3' },
      { mimetype: 'audio/mp4', expected: 'm4a' },
      { mimetype: 'audio/wav', expected: 'wav' },
      { mimetype: 'audio/unknown', expected: 'ogg' } // fallback
    ];
    
    extensionTests.forEach(test => {
      const extension = audioService.getAudioExtension(test.mimetype);
      if (extension === test.expected) {
        logger.info(`✅ Extensión correcta para ${test.mimetype}: ${extension}`);
      } else {
        throw new Error(`Extensión incorrecta para ${test.mimetype}: esperado ${test.expected}, obtenido ${extension}`);
      }
    });
    
    // Prueba 4: Simulación de guardado de archivo
    logger.info('\n📝 Prueba 4: Simulando guardado de archivo...');
    
    // Crear un archivo de audio de prueba (simulado)
    const testData = Buffer.from('fake audio data for testing', 'utf8').toString('base64');
    const mockMedia = {
      data: testData,
      mimetype: 'audio/ogg'
    };
    
    const testFrom = '+5491112345678';
    const savedPath = await audioService.saveAudioFile(mockMedia, testFrom);
    
    if (fs.existsSync(savedPath)) {
      logger.info(`✅ Archivo guardado correctamente: ${savedPath}`);
      
      // Verificar contenido
      const savedContent = fs.readFileSync(savedPath, 'base64');
      if (savedContent === testData) {
        logger.info('✅ Contenido del archivo verificado');
      } else {
        throw new Error('Contenido del archivo no coincide');
      }
      
      // Limpiar archivo de prueba
      audioService.cleanupFile(savedPath);
      
      if (!fs.existsSync(savedPath)) {
        logger.info('✅ Archivo de prueba limpiado correctamente');
      } else {
        logger.warn('⚠️ Archivo de prueba no se eliminó completamente');
      }
    } else {
      throw new Error('Archivo no se guardó correctamente');
    }
    
    // Prueba 5: Verificar configuración de OpenAI (sin hacer llamada real)
    logger.info('\n📝 Prueba 5: Verificando configuración de OpenAI...');
    
    if (process.env.OPENAI_API_KEY) {
      logger.info('✅ OPENAI_API_KEY configurada');
      
      // Verificar que el cliente OpenAI se puede instanciar
      if (audioService.openai) {
        logger.info('✅ Cliente OpenAI inicializado');
      } else {
        throw new Error('Cliente OpenAI no inicializado');
      }
    } else {
      logger.warn('⚠️ OPENAI_API_KEY no configurada - las transcripciones reales fallarán');
    }
    
    // Prueba 6: Estadísticas finales
    logger.info('\n📝 Prueba 6: Estadísticas finales del servicio...');
    const finalStats = audioService.getStats();
    logger.info(`📊 Estado final: ${JSON.stringify(finalStats, null, 2)}`);
    
    logger.info('\n🎉 ¡Todas las pruebas del AudioService completadas exitosamente!');
    logger.info('🚀 El servicio está listo para procesar audios de WhatsApp');
    
    logger.info('\n📱 Para probar con WhatsApp:');
    logger.info('1. Asegúrate de que el bot esté ejecutándose');
    logger.info('2. Envía un audio con el comando "#bot" al inicio');
    logger.info('3. El audio será transcrito y procesado como texto');
    logger.info('4. Recibirás la transcripción y la respuesta del bot');
    
  } catch (error) {
    logger.error('❌ Error en las pruebas del AudioService:', error);
    process.exit(1);
  }
}

// Verificar que estamos en el directorio correcto
if (!fs.existsSync('package.json')) {
  logger.error('❌ Ejecuta este script desde la raíz del proyecto');
  process.exit(1);
}

testAudioService();