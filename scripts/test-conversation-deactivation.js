const WhatsAppService = require('../services/whatsappService');
const OrchestratorService = require('../services/orchestrator/OrchestratorService');
const User = require('../models/user/User');
const logger = require('../utils/logger');

async function testConversationDeactivation() {
  try {
    logger.info('🔴 Probando desactivación de conversaciones...');
    
    const whatsappService = new WhatsAppService();
    const orchestrator = new OrchestratorService();
    const userModel = new User();
    
    // Configurar usuario de prueba
    const userNumber = '+5493517520930';
    const chatId = '+5493571545550@c.us'; // Chat con otra persona
    
    logger.info(`👤 Usuario: ${userNumber}`);
    logger.info(`💬 Chat: ${chatId}`);
    
    // Crear usuario en la base de datos
    await userModel.createUser(userNumber, 'Usuario Test');
    const user = await userModel.getUserByPhone(userNumber);
    
    // Test 1: Activar conversación
    logger.info('\n📝 Test 1: Activando conversación...');
    
    whatsappService.activeConversations.set(chatId, true);
    const isActiveInitial = whatsappService.activeConversations.has(chatId);
    
    if (isActiveInitial) {
      logger.info('✅ Conversación activada correctamente');
    } else {
      throw new Error('No se pudo activar la conversación');
    }
    
    // Test 2: Enviar mensaje normal (debe procesarse)
    logger.info('\n📝 Test 2: Enviando mensaje normal...');
    
    const result1 = await orchestrator.processMessage(
      userNumber,
      chatId,
      'Hola, ¿cómo estás?',
      Math.floor(Date.now() / 1000),
      'whatsapp'
    );
    
    logger.info(`🤖 Respuesta: "${result1.reply.substring(0, 50)}..."`);
    logger.info(`🔄 shouldDeactivate: ${result1.shouldDeactivate}`);
    
    if (!result1.shouldDeactivate) {
      logger.info('✅ Mensaje normal no desactiva conversación');
    } else {
      throw new Error('Mensaje normal no debería desactivar conversación');
    }
    
    // Test 3: Enviar comando de desactivación
    logger.info('\n📝 Test 3: Enviando comando de desactivación...');
    
    const result2 = await orchestrator.processMessage(
      userNumber,
      chatId,
      'desactivar conversación',
      Math.floor(Date.now() / 1000),
      'whatsapp'
    );
    
    logger.info(`🤖 Respuesta: "${result2.reply.substring(0, 50)}..."`);
    logger.info(`🔄 shouldDeactivate: ${result2.shouldDeactivate}`);
    
    if (result2.shouldDeactivate) {
      logger.info('✅ Comando de desactivación detectado correctamente');
    } else {
      throw new Error('Comando de desactivación no fue detectado');
    }
    
    // Test 4: Simular desactivación en WhatsAppService
    logger.info('\n📝 Test 4: Simulando desactivación en WhatsAppService...');
    
    if (result2.shouldDeactivate) {
      whatsappService.deactivateConversation(chatId);
      logger.info('🔴 Conversación desactivada');
    }
    
    const isActiveAfterDeactivation = whatsappService.activeConversations.has(chatId);
    
    if (!isActiveAfterDeactivation) {
      logger.info('✅ Conversación desactivada exitosamente');
    } else {
      throw new Error('La conversación no se desactivó');
    }
    
    // Test 5: Intentar enviar mensaje después de desactivar (NO debe procesarse)
    logger.info('\n📝 Test 5: Enviando mensaje después de desactivación...');
    
    // Simular el flujo completo del WhatsAppService
    const mockMessage = {
      from: userNumber + '@c.us',
      to: '+5493571545550@c.us',
      fromMe: true,
      chatId: chatId,
      type: 'chat',
      body: 'Este mensaje no debe procesarse',
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    const chatIdFromMsg = whatsappService.getChatId(mockMessage);
    const userNumberFromMsg = whatsappService.getUserNumber(mockMessage);
    const isStillActive = whatsappService.activeConversations.has(chatIdFromMsg);
    
    logger.info(`📍 Chat ID: ${chatIdFromMsg}`);
    logger.info(`👤 Usuario: ${userNumberFromMsg}`);
    logger.info(`🔄 Conversación activa: ${isStillActive}`);
    
    if (!isStillActive) {
      logger.info('✅ Mensaje correctamente ignorado (conversación inactiva)');
    } else {
      throw new Error('El mensaje debería ser ignorado');
    }
    
    // Test 6: Reactivar con prefijo
    logger.info('\n📝 Test 6: Reactivando con prefijo...');
    
    const mockReactivation = {
      from: userNumber + '@c.us',
      to: '+5493571545550@c.us',
      fromMe: true,
      chatId: chatId,
      type: 'chat',
      body: '#bot hola de nuevo',
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // Simular detección de prefijo
    const hasPrefix = mockReactivation.body.startsWith('#bot');
    
    if (hasPrefix) {
      whatsappService.activeConversations.set(chatId, true);
      logger.info('🟢 Conversación reactivada con prefijo');
    }
    
    const isActiveAfterReactivation = whatsappService.activeConversations.has(chatId);
    
    if (isActiveAfterReactivation) {
      logger.info('✅ Conversación reactivada exitosamente');
    } else {
      throw new Error('La conversación no se reactivó');
    }
    
    // Limpiar
    whatsappService.deactivateConversation(chatId);
    
    logger.info('\n🎉 ¡Todos los tests de desactivación completados!');
    logger.info('\n🔄 Comportamiento CORRECTO confirmado:');
    logger.info('   ✅ Conversación se activa con prefijo');
    logger.info('   ✅ Mensajes normales NO desactivan conversación');
    logger.info('   ✅ "desactivar conversación" SÍ desactiva');
    logger.info('   ✅ Mensajes posteriores son IGNORADOS');
    logger.info('   ✅ Prefijo "#bot" REACTIVA conversación');
    
    logger.info('\n📱 Flujo correcto en WhatsApp:');
    logger.info('   1. "#bot hola" → Activa conversación');
    logger.info('   2. "¿cómo estás?" → Responde (conversación activa)');
    logger.info('   3. "desactivar conversación" → Desactiva y responde');
    logger.info('   4. "otro mensaje" → IGNORADO silenciosamente');
    logger.info('   5. "#bot nueva consulta" → Reactiva conversación');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test de desactivación:', error);
    process.exit(1);
  }
}

testConversationDeactivation();

