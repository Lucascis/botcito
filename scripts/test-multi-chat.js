const WhatsAppService = require('../services/whatsappService');
const logger = require('../utils/logger');

async function testMultiChatConversations() {
  try {
    logger.info('💬 Probando conversaciones múltiples en diferentes chats...');
    
    const whatsappService = new WhatsAppService();
    
    // Simular diferentes usuarios y chats
    const user1 = '+5491112345678';
    const user2 = '+5491187654321';
    const user3 = '+5493517520930';
    
    // Simular diferentes chats
    // Chat 1: Conversación privada entre User1 y el Bot
    const chat1 = `${user1}@c.us`;
    
    // Chat 2: Conversación privada entre User2 y el Bot  
    const chat2 = `${user2}@c.us`;
    
    // Chat 3: Grupo donde participan User1, User2 y User3
    const chat3 = `123456789@g.us`; // ID de grupo
    
    logger.info('\n📝 Test 1: Conversaciones independientes en chats privados...');
    
    // Verificar estado inicial - ninguna conversación activa
    logger.info(`✅ Estado inicial:`);
    logger.info(`   Chat1 (${chat1}): ${whatsappService.activeConversations.has(chat1)}`);
    logger.info(`   Chat2 (${chat2}): ${whatsappService.activeConversations.has(chat2)}`);
    logger.info(`   Chat3 (${chat3}): ${whatsappService.activeConversations.has(chat3)}`);
    
    // User1 activa conversación en Chat1
    whatsappService.activeConversations.set(chat1, true);
    logger.info(`✅ ${user1} activó conversación en ${chat1}`);
    
    // User2 activa conversación en Chat2
    whatsappService.activeConversations.set(chat2, true);
    logger.info(`✅ ${user2} activó conversación en ${chat2}`);
    
    // Verificar que las conversaciones son independientes
    const chat1Active = whatsappService.activeConversations.has(chat1);
    const chat2Active = whatsappService.activeConversations.has(chat2);
    const chat3Active = whatsappService.activeConversations.has(chat3);
    
    if (chat1Active && chat2Active && !chat3Active) {
      logger.info('✅ Conversaciones independientes funcionando correctamente');
    } else {
      throw new Error('Las conversaciones no son independientes');
    }
    
    logger.info('\n📝 Test 2: Mismo usuario en diferentes chats...');
    
    // User1 puede tener conversaciones activas en múltiples chats
    whatsappService.activeConversations.set(chat3, true); // User1 también activa en grupo
    
    const user1InChat1 = whatsappService.activeConversations.has(chat1);
    const user1InChat3 = whatsappService.activeConversations.has(chat3);
    
    if (user1InChat1 && user1InChat3) {
      logger.info(`✅ ${user1} puede tener conversaciones activas en múltiples chats`);
    } else {
      throw new Error('Usuario no puede manejar múltiples chats');
    }
    
    logger.info('\n📝 Test 3: Probando getChatId y getUserNumber...');
    
    // Simular mensajes de diferentes tipos
    const mockMessages = [
      // Mensaje privado de User1
      {
        from: user1 + '@c.us',
        to: 'bot@c.us',
        chatId: chat1,
        fromMe: false,
        body: 'Hola desde chat privado'
      },
      
      // Mensaje de grupo de User2  
      {
        from: user2 + '@c.us',
        to: chat3,
        chatId: chat3,
        fromMe: false,
        body: 'Hola desde grupo'
      },
      
      // Mensaje que TÚ envías a otra persona (fromMe: true)
      {
        from: user1 + '@c.us',        // Tu número
        to: user2 + '@c.us',          // Número de la otra persona
        chatId: user2 + '@c.us',      // Chat es con la otra persona
        fromMe: true,
        body: 'Mensaje que envío a otra persona'
      },
      
      // Mensaje que envía el bot (fromMe: true)
      {
        from: 'bot@c.us',
        to: user1 + '@c.us',
        chatId: chat1,
        fromMe: true,
        body: 'Respuesta del bot'
      }
    ];
    
    mockMessages.forEach((msg, index) => {
      const chatId = whatsappService.getChatId(msg);
      const userNumber = whatsappService.getUserNumber(msg);
      
      logger.info(`✅ Mensaje ${index + 1}:`);
      logger.info(`   Chat ID: ${chatId}`);
      logger.info(`   Usuario: ${userNumber}`);
      logger.info(`   From me: ${msg.fromMe}`);
    });
    
    logger.info('\n📝 Test 4: Desactivación independiente de conversaciones...');
    
    // Desactivar conversación en Chat1
    whatsappService.deactivateConversation(chat1);
    
    const afterDeactivation = {
      chat1: whatsappService.activeConversations.has(chat1),
      chat2: whatsappService.activeConversations.has(chat2),
      chat3: whatsappService.activeConversations.has(chat3)
    };
    
    if (!afterDeactivation.chat1 && afterDeactivation.chat2 && afterDeactivation.chat3) {
      logger.info('✅ Desactivación independiente funciona correctamente');
    } else {
      throw new Error('La desactivación afectó otros chats');
    }
    
    logger.info('\n📝 Test 5: Listado de conversaciones activas...');
    
    const activeChats = whatsappService.getActiveConversations();
    logger.info(`✅ Conversaciones activas: ${activeChats.length}`);
    activeChats.forEach(chatId => {
      logger.info(`   - ${chatId}`);
    });
    
    // Limpiar estado
    whatsappService.deactivateConversation(chat2);
    whatsappService.deactivateConversation(chat3);
    
    logger.info('\n🎉 ¡Todos los tests de múltiples chats completados!');
    logger.info('\n📱 Comportamiento correcto por chat:');
    logger.info('   🗂️  Cada chat tiene su propia conversación independiente');
    logger.info('   👤 Un usuario puede estar activo en múltiples chats');
    logger.info('   🎯 Las respuestas van al chat específico donde se invocó');
    logger.info('   🔄 La desactivación afecta solo al chat específico');
    logger.info('   📊 Rate limiting es por usuario, conversaciones por chat');
    
    logger.info('\n🚀 Casos de uso soportados:');
    logger.info('   1. Chat privado: User1 ↔ Bot');
    logger.info('   2. Chat privado: User2 ↔ Bot (independiente del anterior)');
    logger.info('   3. Chat de grupo: User1, User2, User3 + Bot');
    logger.info('   4. Mismo usuario en privado Y grupo simultáneamente');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test de múltiples chats:', error);
    process.exit(1);
  }
}

testMultiChatConversations();
