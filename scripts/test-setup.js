const User = require('../models/user/User');
const OrchestratorService = require('../services/orchestrator/OrchestratorService');
const logger = require('../utils/logger');

async function testSetup() {
  try {
    logger.info('🧪 Iniciando pruebas de configuración...');
    
    // Probar modelo de usuario
    logger.info('📊 Probando modelo de usuario...');
    const userModel = new User();
    
    // Crear un usuario de prueba
    const testPhone = '+5491112345678';
    await userModel.createUser(testPhone, 'Usuario de Prueba');
    
    // Obtener el usuario
    const user = await userModel.getUserByPhone(testPhone);
    if (!user) {
      throw new Error('No se pudo crear/obtener usuario de prueba');
    }
    logger.info(`✅ Usuario creado: ${user.name} (${user.phone_number})`);
    
    // Probar contexto
    logger.info('💬 Probando gestión de contexto...');
    const testContext = [
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?' }
    ];
    
    await userModel.saveContext(user.id, 'whatsapp', testContext);
    const retrievedContext = await userModel.getContext(user.id, 'whatsapp');
    
    if (retrievedContext.length !== testContext.length) {
      throw new Error('Error en la gestión de contexto');
    }
    logger.info('✅ Gestión de contexto funcionando correctamente');
    
    // Probar orquestador (solo si hay API key configurada y no se pide omitir llamadas reales)
    if (process.env.OPENAI_API_KEY && String(process.env.SKIP_OPENAI_CALLS).toLowerCase() !== 'true') {
      logger.info('🤖 Probando orquestador...');
      const orchestrator = new OrchestratorService();
      
      const result = await orchestrator.processMessage(
        user.id,
        testPhone,
        'Hola, ¿cómo estás?',
        Math.floor(Date.now() / 1000),
        'whatsapp'
      );
      
      if (result.reply) {
        logger.info(`✅ Orquestador funcionando. Respuesta: ${result.reply.substring(0, 50)}...`);
      } else {
        logger.warn('⚠️ Orquestador no generó respuesta');
      }
    } else {
      logger.warn('⚠️ OPENAI_API_KEY no configurada, saltando prueba del orquestador');
    }
    
    // Obtener estadísticas
    logger.info('📈 Probando estadísticas...');
    const stats = await userModel.getAllUsers();
    logger.info(`✅ Estadísticas: ${stats.length} usuarios en total`);
    
    logger.info('🎉 ¡Todas las pruebas completadas exitosamente!');
    logger.info('🚀 La plataforma está lista para usar');
    
  } catch (error) {
    logger.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

testSetup(); 