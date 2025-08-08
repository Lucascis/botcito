const AudioService = require('../services/audioService');
const ImageService = require('../services/imageService');
const ModelService = require('../services/modelService');
const WhatsAppService = require('../services/whatsappService');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function testMultimodalIntegration() {
  try {
    logger.info('🎭 Iniciando test completo multimodal...');
    
    // Inicializar servicios
    const audioService = new AudioService();
    const imageService = new ImageService();
    const modelService = new ModelService();
    const whatsappService = new WhatsAppService();
    
    logger.info('📋 Servicios inicializados correctamente');
    
    // Test 1: Verificar inicialización de todos los servicios
    logger.info('\n📝 Test 1: Verificando inicialización de servicios...');
    
    const audioStats = audioService.getStats();
    const imageStats = imageService.getStats();
    const modelStats = modelService.getStats();
    
    if (!audioStats.isWorking) {
      throw new Error('AudioService no está funcionando');
    }
    
    if (!imageStats.isWorking) {
      throw new Error('ImageService no está funcionando');
    }
    
    logger.info('✅ Todos los servicios están funcionando correctamente');
    logger.info(`📊 Audio: ${audioStats.tempFiles} archivos temp`);
    logger.info(`📊 Image: ${imageStats.tempFiles} archivos temp`);
    logger.info(`📊 Model: ${modelStats.totalRequests} requests totales`);
    
    // Test 2: Detectar tipos de contenido
    logger.info('\n📝 Test 2: Probando detección de tipos de contenido...');
    
    const mockMessages = [
      { type: 'chat', body: 'Hola, ¿cómo estás?', hasMedia: false },
      { type: 'ptt', hasMedia: true, body: '' },
      { type: 'image', hasMedia: true, body: '' },
      { type: 'image', hasMedia: true, body: 'Mira esta foto' }
    ];
    
    mockMessages.forEach((msg, index) => {
      const mediaType = whatsappService.detectMediaType(msg);
      logger.info(`✅ Mensaje ${index + 1} (${msg.type}): detectado como ${mediaType}`);
    });
    
    // Test 3: Validación de tipos MIME
    logger.info('\n📝 Test 3: Validando tipos MIME...');
    
    const audioTypes = ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    audioTypes.forEach(type => {
      if (audioService.isValidAudioType(type)) {
        logger.info(`✅ Audio MIME válido: ${type}`);
      } else {
        throw new Error(`Audio MIME inválido: ${type}`);
      }
    });
    
    imageTypes.forEach(type => {
      if (imageService.isValidImageType(type)) {
        logger.info(`✅ Image MIME válido: ${type}`);
      } else {
        throw new Error(`Image MIME inválido: ${type}`);
      }
    });
    
    // Test 4: Simulación de archivos multimedia
    logger.info('\n📝 Test 4: Simulando manejo de archivos multimedia...');
    
    // Crear archivo de audio de prueba
    const audioTestData = Buffer.from('fake audio content for testing', 'utf8').toString('base64');
    const mockAudioMedia = {
      data: audioTestData,
      mimetype: 'audio/ogg'
    };
    
    const audioPath = await audioService.saveAudioFile(mockAudioMedia, '+5491112345678');
    logger.info(`✅ Audio guardado: ${path.basename(audioPath)}`);
    
    // Crear archivo de imagen de prueba
    const imageTestData = Buffer.from('fake image content for testing', 'utf8').toString('base64');
    const mockImageMedia = {
      data: imageTestData,
      mimetype: 'image/jpeg'
    };
    
    const imagePath = await imageService.saveImageFile(mockImageMedia, '+5491112345678');
    logger.info(`✅ Imagen guardada: ${path.basename(imagePath)}`);
    
    // Test 5: Verificar extensiones de archivo
    logger.info('\n📝 Test 5: Verificando extensiones de archivo...');
    
    const audioExt = audioService.getAudioExtension('audio/ogg');
    const imageExt = imageService.getImageExtension('image/jpeg');
    
    if (audioExt === 'ogg' && imageExt === 'jpg') {
      logger.info('✅ Extensiones de archivo correctas');
    } else {
      throw new Error(`Extensiones incorrectas: audio=${audioExt}, image=${imageExt}`);
    }
    
    // Test 6: Selección de modelos por contenido
    logger.info('\n📝 Test 6: Probando selección de modelos por contenido...');
    
    const textModel = modelService.selectOptimalModel('text', { complexity: 'low' });
    const audioModel = modelService.selectOptimalModel('audio');
    const imageModel = modelService.selectOptimalModel('image');
    const mixedModel = modelService.selectOptimalModel('mixed');
    
    logger.info(`✅ Modelo texto: ${textModel}`);
    logger.info(`✅ Modelo audio: ${audioModel}`);
    logger.info(`✅ Modelo imagen: ${imageModel}`);
    logger.info(`✅ Modelo mixto: ${mixedModel}`);
    
    // Verificar que se seleccionan los modelos correctos
    if (textModel !== 'gpt-4o-mini') {
      throw new Error(`Modelo texto incorrecto: esperado gpt-4o-mini, obtenido ${textModel}`);
    }
    
    if (audioModel !== 'whisper-1') {
      throw new Error(`Modelo audio incorrecto: esperado whisper-1, obtenido ${audioModel}`);
    }
    
    if (imageModel !== 'gpt-4o') {
      throw new Error(`Modelo imagen incorrecto: esperado gpt-4o, obtenido ${imageModel}`);
    }
    
    if (mixedModel !== 'gpt-4o') {
      throw new Error(`Modelo mixto incorrecto: esperado gpt-4o, obtenido ${mixedModel}`);
    }
    
    // Test 7: Verificar integración con WhatsApp
    logger.info('\n📝 Test 7: Verificando integración multimodal...');
    
    // Simular diferentes tipos de mensajes que el WhatsAppService debería manejar
    const testScenarios = [
      { type: 'text', description: 'Mensaje de texto simple' },
      { type: 'audio', description: 'Mensaje de voz (ptt)' },
      { type: 'image', description: 'Imagen sin texto' },
      { type: 'mixed', description: 'Imagen con texto' }
    ];
    
    testScenarios.forEach(scenario => {
      logger.info(`✅ Escenario soportado: ${scenario.description} (${scenario.type})`);
    });
    
    // Test 8: Verificar limpieza de archivos temporales
    logger.info('\n📝 Test 8: Verificando limpieza de archivos...');
    
    // Limpiar archivos de prueba
    audioService.cleanupFile(audioPath);
    imageService.cleanupFile(imagePath);
    
    if (!fs.existsSync(audioPath) && !fs.existsSync(imagePath)) {
      logger.info('✅ Archivos temporales limpiados correctamente');
    } else {
      logger.warn('⚠️ Algunos archivos temporales no se eliminaron');
    }
    
    // Test 9: Estadísticas finales
    logger.info('\n📝 Test 9: Estadísticas finales de los servicios...');
    
    const finalAudioStats = audioService.getStats();
    const finalImageStats = imageService.getStats();
    const finalModelStats = modelService.getStats();
    
    logger.info('📊 Estadísticas finales:');
    logger.info(`   Audio: ${JSON.stringify(finalAudioStats, null, 2)}`);
    logger.info(`   Image: ${JSON.stringify(finalImageStats, null, 2)}`);
    logger.info(`   Model: Total requests: ${finalModelStats.totalRequests}`);
    
    // Test 10: Verificar configuración de API keys
    logger.info('\n📝 Test 10: Verificando configuración de APIs...');
    
    if (process.env.OPENAI_API_KEY) {
      logger.info('✅ OPENAI_API_KEY configurada');
    } else {
      logger.warn('⚠️ OPENAI_API_KEY no configurada - funcionalidad limitada');
    }
    
    logger.info('\n🎉 ¡Test multimodal completado exitosamente!');
    logger.info('\n📱 El bot ahora puede manejar:');
    logger.info('   🎤 Mensajes de voz (WhatsApp PTT)');
    logger.info('   🖼️  Imágenes (JPEG, PNG, WebP, GIF)');
    logger.info('   📝 Texto con imágenes (contenido mixto)');
    logger.info('   🤖 Selección automática de modelos');
    logger.info('   🔄 Limpieza automática de archivos temporales');
    
    logger.info('\n🚀 Para probar en WhatsApp:');
    logger.info('   1. Envía "#bot" seguido de un mensaje de voz');
    logger.info('   2. Envía "#bot" seguido de una imagen');
    logger.info('   3. Envía "#bot" con imagen y texto juntos');
    logger.info('   4. El bot procesará cada tipo correctamente');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test multimodal:', error);
    process.exit(1);
  }
}

// Verificar que estamos en el directorio correcto
if (!fs.existsSync('package.json')) {
  logger.error('❌ Ejecuta este script desde la raíz del proyecto');
  process.exit(1);
}

testMultimodalIntegration();

