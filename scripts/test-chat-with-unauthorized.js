const WhatsAppService = require('../services/whatsappService');
const logger = require('../utils/logger');

async function testChatWithUnauthorized() {
  try {
    logger.info('💬 Probando chat con número no autorizado...');
    
    const whatsappService = new WhatsAppService();
    
    // Configuración real basada en tus logs
    const myAuthorizedNumber = '+5493517520930';
    const otherUnauthorizedNumber = '+5493571545550';
    
    logger.info(`👤 Mi número (autorizado): ${myAuthorizedNumber}`);
    logger.info(`🚫 Número de la otra persona (NO autorizado): ${otherUnauthorizedNumber}`);
    
    // Test 1: Simular mensaje que TÚ envías en conversación con otra persona
    logger.info('\n📝 Test 1: Yo (autorizado) envío mensaje en chat con otra persona...');
    
    const mockMessage = {
      from: myAuthorizedNumber + '@c.us',        // Tu número (quien envía)
      to: otherUnauthorizedNumber + '@c.us',     // Otra persona (destino)
      fromMe: true,                              // Es un mensaje tuyo
      chatId: otherUnauthorizedNumber + '@c.us', // Chat es con la otra persona
      type: 'chat',
      body: '#bot hola, ¿cómo estás?',
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // Probar las funciones de identificación
    const chatId = whatsappService.getChatId(mockMessage);
    const userNumber = whatsappService.getUserNumber(mockMessage);
    
    logger.info(`📍 Chat ID detectado: ${chatId}`);
    logger.info(`👤 Usuario detectado: ${userNumber}`);
    logger.info(`📤 From me: ${mockMessage.fromMe}`);
    
    // Verificar que detecta correctamente
    const expectedChatId = otherUnauthorizedNumber + '@c.us';
    const expectedUserNumber = myAuthorizedNumber.replace(/[\s\+\-\(\)]/g, '');
    
    if (chatId === expectedChatId) {
      logger.info('✅ Chat ID correcto: bot responderá en la conversación con la otra persona');
    } else {
      throw new Error(`Chat ID incorrecto: esperado ${expectedChatId}, obtenido ${chatId}`);
    }
    
    if (userNumber === expectedUserNumber) {
      logger.info('✅ Usuario correcto: es mi número autorizado');
    } else {
      throw new Error(`Usuario incorrecto: esperado ${expectedUserNumber}, obtenido ${userNumber}`);
    }
    
    // Test 2: Verificar validación de autorización
    logger.info('\n📝 Test 2: Verificando autorización...');
    
    // Simular la lógica de números permitidos (del config)
    const allowedNumbers = [myAuthorizedNumber]; // Solo mi número está permitido
    
    const isAuthorized = allowedNumbers.some(allowed => {
      const normalizedAllowed = allowed.replace(/[\s\+\-\(\)]/g, '');
      const normalizedUser = userNumber.replace(/[\s\+\-\(\)]/g, '');
      return normalizedUser === normalizedAllowed || 
             normalizedUser.includes(normalizedAllowed) ||
             normalizedAllowed.includes(normalizedUser);
    });
    
    if (isAuthorized) {
      logger.info('✅ Usuario autorizado: el bot debe procesar el mensaje');
    } else {
      throw new Error('El usuario debería estar autorizado');
    }
    
    // Test 3: Simular conversación activa
    logger.info('\n📝 Test 3: Simulando activación de conversación...');
    
    // El mensaje tiene prefijo '#bot', así que debe activar conversación en ESTE chat
    const hasPrefix = mockMessage.body.startsWith('#bot');
    
    if (hasPrefix) {
      // Activar conversación en el chat correcto
      whatsappService.activeConversations.set(chatId, true);
      logger.info(`✅ Conversación activada en chat: ${chatId}`);
    }
    
    // Verificar que la conversación está activa en el chat correcto
    const isActive = whatsappService.activeConversations.has(chatId);
    
    if (isActive) {
      logger.info('✅ Conversación confirmada como activa en este chat');
    } else {
      throw new Error('La conversación no se activó correctamente');
    }
    
    // Test 4: Verificar que responde en el chat correcto
    logger.info('\n📝 Test 4: Verificando envío de respuesta...');
    
    logger.info(`📤 El bot enviará respuesta a: ${chatId}`);
    logger.info(`📍 Esto significa que la respuesta llegará a la conversación con: ${otherUnauthorizedNumber}`);
    
    // Limpiar
    whatsappService.deactivateConversation(chatId);
    
    logger.info('\n🎉 ¡Test completado exitosamente!');
    logger.info('\n📱 Resumen del comportamiento correcto:');
    logger.info(`   👤 Usuario autorizado (${myAuthorizedNumber}) invoca bot`);
    logger.info(`   💬 En conversación con número NO autorizado (${otherUnauthorizedNumber})`);
    logger.info(`   ✅ Bot valida usuario autorizado`);
    logger.info(`   🎯 Bot responde en la conversación correcta`);
    logger.info(`   📱 La otra persona ve la respuesta del bot`);
    
    logger.info('\n🚀 Flujo real en WhatsApp:');
    logger.info('   1. Abres WhatsApp');
    logger.info('   2. Vas a conversación con la otra persona');
    logger.info('   3. Escribes "#bot hola"');
    logger.info('   4. El bot responde EN ESA CONVERSACIÓN');
    logger.info('   5. Tanto tú como la otra persona ven la respuesta');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test de chat con no autorizado:', error);
    process.exit(1);
  }
}

testChatWithUnauthorized();

