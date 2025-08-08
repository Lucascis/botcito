const AudioService = require('../services/audioService');
const logger = require('../utils/logger');

async function testAudioMimeHandling() {
  try {
    logger.info('🎤 Probando manejo de tipos MIME de audio...');
    
    const audioService = new AudioService();
    
    // Test 1: Tipos MIME simples (sin parámetros)
    logger.info('\n📝 Test 1: Tipos MIME básicos...');
    const basicTypes = [
      'audio/ogg',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/webm'
    ];
    
    basicTypes.forEach(type => {
      const isValid = audioService.isValidAudioType(type);
      const extension = audioService.getAudioExtension(type);
      
      if (isValid) {
        logger.info(`✅ ${type} → ${extension}`);
      } else {
        throw new Error(`Tipo básico fallido: ${type}`);
      }
    });
    
    // Test 2: Tipos MIME con parámetros (como WhatsApp)
    logger.info('\n📝 Test 2: Tipos MIME con parámetros...');
    const parameterTypes = [
      'audio/ogg; codecs=opus',
      'audio/mpeg; boundary=something',
      'audio/mp4; codecs=aac',
      'audio/wav; encoding=pcm',
      'audio/webm; codecs=vorbis'
    ];
    
    parameterTypes.forEach(type => {
      const isValid = audioService.isValidAudioType(type);
      const extension = audioService.getAudioExtension(type);
      const baseType = type.split(';')[0].trim();
      
      if (isValid) {
        logger.info(`✅ ${type} → ${extension} (base: ${baseType})`);
      } else {
        throw new Error(`Tipo con parámetros fallido: ${type}`);
      }
    });
    
    // Test 3: Casos específicos de WhatsApp
    logger.info('\n📝 Test 3: Casos específicos de WhatsApp...');
    const whatsappTypes = [
      'audio/ogg; codecs=opus',           // Tipo real de WhatsApp voice
      'AUDIO/OGG; CODECS=OPUS',           // Mayúsculas
      '  audio/ogg ; codecs=opus  ',      // Espacios extra
      'audio/ogg;codecs=opus',            // Sin espacios
    ];
    
    whatsappTypes.forEach(type => {
      const isValid = audioService.isValidAudioType(type);
      const extension = audioService.getAudioExtension(type);
      
      if (isValid) {
        logger.info(`✅ WhatsApp: "${type}" → ${extension}`);
      } else {
        throw new Error(`Tipo WhatsApp fallido: ${type}`);
      }
    });
    
    // Test 4: Tipos inválidos
    logger.info('\n📝 Test 4: Tipos inválidos (deben rechazarse)...');
    const invalidTypes = [
      'video/mp4',
      'image/jpeg',
      'text/plain',
      'application/json',
      null,
      undefined,
      '',
      'audio/invalid'
    ];
    
    invalidTypes.forEach(type => {
      const isValid = audioService.isValidAudioType(type);
      
      if (!isValid) {
        logger.info(`✅ Rechazado correctamente: ${type === null ? 'null' : type === undefined ? 'undefined' : `"${type}"`}`);
      } else {
        throw new Error(`Tipo inválido aceptado incorrectamente: ${type}`);
      }
    });
    
    // Test 5: Verificar extensiones correctas
    logger.info('\n📝 Test 5: Verificando extensiones específicas...');
    const extensionTests = [
      { input: 'audio/ogg; codecs=opus', expected: 'ogg' },
      { input: 'audio/mpeg; bitrate=128', expected: 'mp3' },
      { input: 'audio/mp4; codecs=aac', expected: 'm4a' },
      { input: 'audio/wav; encoding=pcm', expected: 'wav' },
      { input: 'audio/webm; codecs=vorbis', expected: 'webm' },
    ];
    
    extensionTests.forEach(test => {
      const extension = audioService.getAudioExtension(test.input);
      
      if (extension === test.expected) {
        logger.info(`✅ "${test.input}" → .${extension}`);
      } else {
        throw new Error(`Extensión incorrecta para ${test.input}: esperado ${test.expected}, obtenido ${extension}`);
      }
    });
    
    logger.info('\n🎉 ¡Todos los tests de tipos MIME de audio pasaron exitosamente!');
    logger.info('\n📱 Ahora WhatsApp podrá enviar audios con:');
    logger.info('   🎤 audio/ogg; codecs=opus (mensajes de voz)');
    logger.info('   🎵 audio/mpeg; bitrate=128 (archivos MP3)');
    logger.info('   🔊 audio/mp4; codecs=aac (archivos M4A)');
    logger.info('   📻 Cualquier tipo MIME válido con parámetros');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test de tipos MIME de audio:', error);
    process.exit(1);
  }
}

testAudioMimeHandling();

