const User = require('../models/user/User');
const OrchestratorService = require('../services/orchestrator/OrchestratorService');
const logger = require('../utils/logger');

async function testConversation() {
  try {
    logger.info('🧪 Probando conversación continua...');
    
    const userModel = new User();
    const orchestrator = new OrchestratorService();
    
    // Crear usuario de prueba
    const testPhone = '+5493517520930';
    await userModel.createUser(testPhone, 'Usuario de Prueba');
    const user = await userModel.getUserByPhone(testPhone);
    
    logger.info(`✅ Usuario: ${user.name} (ID: ${user.id})`);
    
    // Simular conversación continua
    const messages = [
      '#bot hola, ¿podés ayudarme con un resumen del clima en Buenos Aires?',
      'y recomendaciones para hoy',
      'contame un chiste corto',
      'buscá noticias de tecnología en Argentina',
      'gracias por la ayuda',
      'desactivar conversación'
    ];
    
    logger.info('\n💬 Simulando conversación...');
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const timestamp = Math.floor(Date.now() / 1000) + i;
      
      logger.info(`📝 Mensaje ${i + 1}: "${message}"`);
      
      try {
        const result = await orchestrator.processMessage(
          user.id,
          testPhone,
          message,
          timestamp,
          'whatsapp'
        );
        
        if (result.reply) {
          logger.info(`🤖 Respuesta: ${result.reply.substring(0, 100)}...`);
        }
        
        // Pequeña pausa entre mensajes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`❌ Error en mensaje ${i + 1}:`, error.message);
      }
    }
    
    // Verificar contexto persistente
    logger.info('\n💾 Verificando contexto persistente...');
    const context = await userModel.getContext(user.id, 'whatsapp');
    
    logger.info(`✅ Contexto guardado: ${context.length} mensajes`);
    logger.info(`📊 Último mensaje del contexto: ${context[context.length - 1]?.content?.substring(0, 50)}...`);
    
    logger.info('\n🎉 ¡Prueba de conversación completada exitosamente!');
    
  } catch (error) {
    logger.error('❌ Error en la prueba de conversación:', error);
    process.exit(1);
  }
}

testConversation(); 