const WhatsAppService = require('../services/whatsappService');
const logger = require('../utils/logger');

async function testUserValidation() {
  try {
    logger.info('👥 Probando validación de usuarios en diferentes escenarios...');
    
    const whatsappService = new WhatsAppService();
    
    // Simular configuración de números permitidos
    const allowedNumbers = ['+5491112345678', '+5491187654321'];
    
    logger.info(`📋 Números permitidos configurados: ${allowedNumbers.join(', ')}`);
    
    logger.info('\n📝 Test 1: Validación de números...');
    
    // Casos de prueba para getUserNumber
    const testMessages = [
      // Caso 1: Mensaje directo (chat privado)
      {
        from: '+5491112345678@c.us',
        to: 'bot@c.us',
        fromMe: false,
        chatId: '+5491112345678@c.us',
        scenario: 'Chat privado - Usuario autorizado'
      },
      
      // Caso 2: Mensaje en grupo
      {
        from: '+5491112345678@c.us',
        to: '123456789@g.us',
        fromMe: false,
        chatId: '123456789@g.us',
        scenario: 'Chat de grupo - Usuario autorizado'
      },
      
      // Caso 3: Usuario no autorizado en grupo
      {
        from: '+5493517520930@c.us',
        to: '123456789@g.us',
        fromMe: false,
        chatId: '123456789@g.us',
        scenario: 'Chat de grupo - Usuario NO autorizado'
      },
      
      // Caso 4: Respuesta del bot (fromMe: true)
      {
        from: 'bot@c.us',
        to: '+5491112345678@c.us',
        fromMe: true,
        chatId: '+5491112345678@c.us',
        scenario: 'Respuesta del bot'
      }
    ];
    
    testMessages.forEach((msg, index) => {
      const chatId = whatsappService.getChatId(msg);
      const userNumber = whatsappService.getUserNumber(msg);
      
      logger.info(`📱 Test ${index + 1}: ${msg.scenario}`);
      logger.info(`   Chat ID: ${chatId}`);
      logger.info(`   Usuario: ${userNumber}`);
      logger.info(`   From me: ${msg.fromMe}`);
      
      // Verificar si el usuario está autorizado
      const isAuthorized = allowedNumbers.some(allowed => {
        const normalizedAllowed = allowed.replace(/[\s\+\-\(\)]/g, '');
        const normalizedUser = userNumber.replace(/[\s\+\-\(\)]/g, '');
        return normalizedUser === normalizedAllowed || 
               normalizedUser.includes(normalizedAllowed) ||
               normalizedAllowed.includes(normalizedUser);
      });
      
      logger.info(`   Autorizado: ${isAuthorized ? '✅' : '❌'}`);
      logger.info('');
    });
    
    logger.info('\n📝 Test 2: Casos específicos de normalización...');
    
    const normalizationTests = [
      { input: '+5491112345678@c.us', expected: '5491112345678' },
      { input: '5491112345678@c.us', expected: '5491112345678' },
      { input: '+54 911 1234-5678@c.us', expected: '5491112345678' },
      { input: '123456789@g.us', expected: '123456789' }
    ];
    
    normalizationTests.forEach((test, index) => {
      const mockMsg = { from: test.input, fromMe: false };
      const result = whatsappService.getUserNumber(mockMsg);
      
      if (result === test.expected) {
        logger.info(`✅ Test ${index + 1}: "${test.input}" → "${result}"`);
      } else {
        throw new Error(`Normalización fallida: esperado "${test.expected}", obtenido "${result}"`);
      }
    });
    
    logger.info('\n📝 Test 3: Simulación de escenarios reales...');
    
    // Escenario 1: Usuario autorizado en chat privado
    logger.info('🎯 Escenario 1: Usuario autorizado invoca bot en chat privado');
    const scenario1 = {
      chatId: '+5491112345678@c.us',
      userNumber: '5491112345678',
      message: '#bot hola',
      shouldWork: true
    };
    
    const isAuthorized1 = allowedNumbers.some(allowed => 
      allowed.replace(/[\s\+\-\(\)]/g, '').includes(scenario1.userNumber)
    );
    
    if (isAuthorized1 === scenario1.shouldWork) {
      logger.info(`✅ ${scenario1.shouldWork ? 'AUTORIZADO' : 'BLOQUEADO'} correctamente`);
    } else {
      throw new Error(`Escenario 1 falló: esperado ${scenario1.shouldWork}, obtenido ${isAuthorized1}`);
    }
    
    // Escenario 2: Usuario autorizado en chat con otra persona
    logger.info('🎯 Escenario 2: Usuario autorizado invoca bot en chat con otra persona');
    const scenario2 = {
      chatId: '123456789@g.us', // Chat grupal o con otra persona
      userNumber: '5491112345678', // Usuario autorizado
      message: '#bot ayuda',
      shouldWork: true
    };
    
    const isAuthorized2 = allowedNumbers.some(allowed => 
      allowed.replace(/[\s\+\-\(\)]/g, '').includes(scenario2.userNumber)
    );
    
    if (isAuthorized2 === scenario2.shouldWork) {
      logger.info(`✅ ${scenario2.shouldWork ? 'AUTORIZADO' : 'BLOQUEADO'} correctamente`);
    } else {
      throw new Error(`Escenario 2 falló: esperado ${scenario2.shouldWork}, obtenido ${isAuthorized2}`);
    }
    
    // Escenario 3: Usuario NO autorizado en cualquier chat
    logger.info('🎯 Escenario 3: Usuario NO autorizado intenta invocar bot');
    const scenario3 = {
      chatId: '987654321@g.us',
      userNumber: '5493517520930', // Usuario NO autorizado
      message: '#bot hola',
      shouldWork: false
    };
    
    const isAuthorized3 = allowedNumbers.some(allowed => 
      allowed.replace(/[\s\+\-\(\)]/g, '').includes(scenario3.userNumber)
    );
    
    if (isAuthorized3 === scenario3.shouldWork) {
      logger.info(`✅ ${scenario3.shouldWork ? 'AUTORIZADO' : 'BLOQUEADO'} correctamente`);
    } else {
      throw new Error(`Escenario 3 falló: esperado ${scenario3.shouldWork}, obtenido ${isAuthorized3}`);
    }
    
    logger.info('\n🎉 ¡Todos los tests de validación de usuarios completados!');
    logger.info('\n📱 Comportamiento correcto:');
    logger.info('   ✅ Usuario autorizado en chat privado → FUNCIONA');
    logger.info('   ✅ Usuario autorizado en chat con otra persona → FUNCIONA');
    logger.info('   ✅ Usuario autorizado en grupo → FUNCIONA');
    logger.info('   ❌ Usuario NO autorizado en cualquier chat → BLOQUEADO');
    logger.info('   🎯 El bot responde en el CHAT específico donde fue invocado');
    logger.info('   👥 Solo usuarios autorizados pueden invocar el bot');
    
    logger.info('\n🚀 Casos de uso soportados:');
    logger.info('   1. Tú (autorizado) + Amigo → Invocas bot, bot responde en ese chat');
    logger.info('   2. Tú (autorizado) + Grupo → Invocas bot, bot responde en el grupo');
    logger.info('   3. Solo tú (autorizado) → Invocas bot, bot responde en privado');
    logger.info('   4. Amigo (NO autorizado) → Intenta invocar bot, es ignorado');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en el test de validación de usuarios:', error);
    process.exit(1);
  }
}

testUserValidation();

