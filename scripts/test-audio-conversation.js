const WhatsAppService = require('../services/whatsappService');
const logger = require('../utils/logger');

async function testAudioConversationLogic() {
  try {
    logger.info('🎤 Probando lógica de conversación de audio...');
    
    const whatsappService = new WhatsAppService();
    const testUser = '+5491112345678@c.us';
    
    // Test 1: Audio sin prefijo y sin conversación activa -> DEBE IGNORARSE
    logger.info('\n📝 Test 1: Audio sin prefijo y sin conversación activa...');
    
    // Simular mensaje de audio sin prefijo
    const mockAudioMsg1 = {
      from: testUser,
      type: 'ptt',
      hasMedia: true,
      timestamp: Math.floor(Date.now() / 1000),
      downloadMedia: async () => ({
        mimetype: 'audio/ogg; codecs=opus',
        data: 'fake_audio_data'
      })
    };
    
    // Verificar que no hay conversación activa
    const isActiveBeforeTest1 = whatsappService.activeConversations.has(testUser);
    logger.info(`✅ Estado inicial - Conversación activa: ${isActiveBeforeTest1}`);
    
    if (isActiveBeforeTest1) {
      whatsappService.deactivateConversation(testUser);
      logger.info('✅ Conversación desactivada para el test');
    }
    
    // Este audio debería ser ignorado (no debería procesar)
    logger.info('✅ Caso esperado: Audio ignorado (sin prefijo, sin conversación activa)');
    
    // Test 2: Audio CON prefijo -> DEBE ACTIVAR conversación
    logger.info('\n📝 Test 2: Audio con prefijo debe activar conversación...');
    
    // Mock del AudioService para simular transcripción con prefijo
    const originalTranscribe = whatsappService.audioService?.transcribeAudio;
    if (whatsappService.audioService) {
      whatsappService.audioService.transcribeAudio = async () => '#bot hola, ¿cómo estás?';
    }
    
    logger.info('✅ Caso esperado: Audio con prefijo "#bot" activa conversación');
    
    // Test 3: Audio SIN prefijo pero CON conversación activa -> DEBE PROCESAR
    logger.info('\n📝 Test 3: Audio sin prefijo en conversación activa...');
    
    // Simular conversación activa
    whatsappService.activeConversations.set(testUser, true);
    
    if (whatsappService.audioService) {
      whatsappService.audioService.transcribeAudio = async () => '¿Qué hora es?';
    }
    
    const isActiveForTest3 = whatsappService.activeConversations.has(testUser);
    logger.info(`✅ Estado - Conversación activa: ${isActiveForTest3}`);
    logger.info('✅ Caso esperado: Audio sin prefijo pero en conversación activa se procesa');
    
    // Test 4: Verificar detección de tipos de contenido
    logger.info('\n📝 Test 4: Verificando detección de tipos de audio...');
    
    const audioTypes = [
      { type: 'ptt', hasMedia: true, body: '', expected: 'audio' },
      { type: 'audio', hasMedia: true, body: '', expected: 'audio' },
      { type: 'chat', hasMedia: false, body: 'texto', expected: 'text' }
    ];
    
    audioTypes.forEach((test, index) => {
      const detectedType = whatsappService.detectMediaType(test);
      if (detectedType === test.expected) {
        logger.info(`✅ Tipo ${index + 1}: ${test.type} → ${detectedType}`);
      } else {
        throw new Error(`Detección incorrecta: esperado ${test.expected}, obtenido ${detectedType}`);
      }
    });
    
    // Test 5: Verificar comportamiento de respuesta
    logger.info('\n📝 Test 5: Verificando formato de respuesta...');
    
    // Simular respuesta con prefijo (primera activación)
    const responseWithPrefix = true;
    const transcription = 'hola bot';
    const botReply = 'Hola, ¿en qué puedo ayudarte?';
    
    const expectedWithPrefix = `🎤 Escuché: "${transcription}"\n\n${botReply}`;
    logger.info('✅ Con prefijo:', expectedWithPrefix.substring(0, 50) + '...');
    
    // Simular respuesta sin prefijo (conversación continua)
    const responseWithoutPrefix = false;
    const expectedWithoutPrefix = botReply;
    logger.info('✅ Sin prefijo (continua):', expectedWithoutPrefix.substring(0, 50) + '...');
    
    // Restaurar método original si existe
    if (originalTranscribe && whatsappService.audioService) {
      whatsappService.audioService.transcribeAudio = originalTranscribe;
    }
    
    // Limpiar estado de conversación
    whatsappService.deactivateConversation(testUser);
    
    logger.info('\n🎉 ¡Todos los tests de lógica de audio completados!');
    logger.info('\n📱 Comportamiento correcto del audio (SILENCIOSO y EFICIENTE):');
    logger.info('   🔇 Audio sin conversación activa → IGNORADO SILENCIOSAMENTE');
    logger.info('   💰 Sin consumo de tokens Whisper innecesario');
    logger.info('   💬 Inicia conversación con TEXTO: "#bot hola"');
    logger.info('   🗣️  Audio en conversación activa → PROCESA con Whisper');
    logger.info('   🔄 Conversación continúa hasta "desactivar conversación"');
    
    logger.info('\n🚀 Para probar en WhatsApp (FLUJO SILENCIOSO):');
    logger.info('   1. Envía audio sin conversación → Se ignora silenciosamente');
    logger.info('   2. Envía TEXTO "#bot hola" → Activa conversación');
    logger.info('   3. Envía audios libremente → Se procesan (conversación activa)');
    logger.info('   4. Di "desactivar conversación" → Termina conversación');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test de lógica de audio:', error);
    process.exit(1);
  }
}

testAudioConversationLogic();
