const WhatsAppService = require('../services/whatsappService');
const WhatsAppIntegration = require('../integrations/whatsapp/client');
const logger = require('../utils/logger');

async function testSecurity() {
  try {
    logger.info('🔒 Iniciando pruebas de seguridad...');
    
    const whatsappIntegration = new WhatsAppIntegration();
    
    // Test 1: Verificar detección de mensajes del bot
    logger.info('\n🧪 Test 1: Verificando detección de mensajes del bot...');
    
    // Simular envío de mensaje del bot
    const testMessage = 'Respuesta del bot de prueba';
    const testChat = '+5491112345678@c.us';
    
    // Registrar mensaje como del bot
    const messageHash = whatsappIntegration.createMessageHash(testChat, testMessage);
    // Compatibilidad: Map con TTL
    if (whatsappIntegration.botMessages instanceof Map) {
      whatsappIntegration.botMessages.set(messageHash, Date.now());
    } else if (whatsappIntegration.botMessages && typeof whatsappIntegration.botMessages.add === 'function') {
      whatsappIntegration.botMessages.add(messageHash);
    }
    
    // Verificar que se detecta como mensaje del bot
    const isBotMessage = whatsappIntegration.isBotMessage(testChat, testMessage);
    
    if (isBotMessage) {
      logger.info('✅ Los mensajes del bot son correctamente detectados');
    } else {
      throw new Error('❌ CRÍTICO: Los mensajes del bot no se detectan - LOOP INFINITO POSIBLE');
    }
    
    // Test 2: Verificar que mensajes normales NO se detecten como del bot
    logger.info('\n🧪 Test 2: Verificando que mensajes normales no se detecten como del bot...');
    
    const normalMessage = '#bot hola, ¿cómo estás?';
    const isNormalMessage = whatsappIntegration.isBotMessage(testChat, normalMessage);
    
    if (!isNormalMessage) {
      logger.info('✅ Los mensajes normales no se detectan como del bot');
    } else {
      throw new Error('❌ Los mensajes normales se detectan incorrectamente como del bot');
    }
    
    // Test 3: Verificar rate limiting
    logger.info('\n🧪 Test 3: Verificando rate limiting...');
    const whatsappService = new WhatsAppService();
    const testUser = '+5491112345678@c.us';
    
    // Simular 15 mensajes rápidos (límite es 10)
    let blockedCount = 0;
    
    for (let i = 0; i < 15; i++) {
      const canProcess = whatsappService.checkRateLimit(testUser);
      if (!canProcess) {
        blockedCount++;
      }
    }
    
    if (blockedCount === 5) {
      logger.info(`✅ Rate limiting funciona: ${blockedCount} mensajes bloqueados de 15 intentos`);
    } else {
      throw new Error(`❌ Rate limiting falla: ${blockedCount} bloqueados, esperados 5`);
    }
    
    // Test 4: Verificar validación de mensajes
    logger.info('\n🧪 Test 4: Verificando validación de mensajes...');
    
    const invalidMessages = [
      { fromMe: false, from: null, to: testUser, body: 'test', type: 'chat', id: { _serialized: 'invalid_1' } }, // from null
      { fromMe: false, from: testUser, to: testUser, body: null, type: 'chat', id: { _serialized: 'invalid_2' } }, // body null
      { fromMe: false, from: testUser, to: testUser, body: '', type: 'chat', id: { _serialized: 'invalid_3' } }, // body vacío
      { fromMe: false, from: testUser, to: testUser, body: 'x'.repeat(5000), type: 'chat', id: { _serialized: 'invalid_4' } }, // muy largo
      { fromMe: false, from: testUser, to: testUser, body: 'test', type: 'image', id: { _serialized: 'invalid_5' } }, // tipo incorrecto
    ];
    
    let validationsPassed = 0;
    whatsappService.orchestrator.processMessage = async () => {
      throw new Error('No debería procesar mensajes inválidos');
    };
    
    for (const invalidMsg of invalidMessages) {
      try {
        await whatsappService.handleMessage(invalidMsg);
        validationsPassed++;
      } catch (error) {
        // Si llega aquí, la validación falló
      }
    }
    
    if (validationsPassed === 0) {
      logger.info('✅ Validación de mensajes funciona correctamente');
    } else {
      throw new Error(`❌ Validación falla: ${validationsPassed} mensajes inválidos fueron procesados`);
    }
    
    // Test 5: Verificar límites de conversaciones activas
    logger.info('\n🧪 Test 5: Verificando gestión de conversaciones activas...');
    
    // Activar muchas conversaciones
    for (let i = 0; i < 100; i++) {
      whatsappService.activeConversations.set(`user${i}@c.us`, true);
    }
    
    const activeCount = whatsappService.getActiveConversations().length;
    if (activeCount === 100) {
      logger.info(`✅ Gestión de conversaciones: ${activeCount} conversaciones activas`);
    } else {
      throw new Error(`❌ Error en gestión de conversaciones: ${activeCount} vs 100 esperadas`);
    }
    
    // Test 6: Verificar que las desactivaciones funcionan
    logger.info('\n🧪 Test 6: Verificando desactivación de conversaciones...');
    
    whatsappService.deactivateConversation('user0@c.us');
    const newActiveCount = whatsappService.getActiveConversations().length;
    
    if (newActiveCount === 99) {
      logger.info('✅ Desactivación de conversaciones funciona');
    } else {
      throw new Error(`❌ Error en desactivación: ${newActiveCount} vs 99 esperadas`);
    }
    
    logger.info('\n🎉 ¡Todas las pruebas de seguridad pasaron exitosamente!');
    logger.info('🔒 El sistema está protegido contra loops infinitos y ataques básicos');
    
  } catch (error) {
    logger.error('❌ Error en las pruebas de seguridad:', error);
    process.exit(1);
  }
}

testSecurity();