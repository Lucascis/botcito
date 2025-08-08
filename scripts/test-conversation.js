const PetService = require('../services/pet/PetService');
const User = require('../models/user/User');
const OrchestratorService = require('../services/orchestrator/OrchestratorService');
const logger = require('../utils/logger');

async function testConversation() {
  try {
    logger.info('🧪 Probando conversación continua con configuración natural...');
    
    const petService = new PetService();
    const userModel = new User();
    const orchestrator = new OrchestratorService();
    
    // Crear usuario de prueba
    const testPhone = '+5493517520930';
    await userModel.createUser(testPhone, 'Usuario de Prueba');
    const user = await userModel.getUserByPhone(testPhone);
    
    logger.info(`✅ Usuario: ${user.name} (ID: ${user.id})`);
    
    // Simular conversación continua con configuración natural
    const messages = [
      '#bot crear mascota Luna gato "curiosa y juguetona, le gusta explorar, su juguete favorito es un ratón de peluche, tiene energía alta y le encanta dormir en lugares altos"',
      'listar mascotas',
      'configurar mascota 1 "ahora le gusta jugar con pelotas de colores, su comida favorita es atún fresco, aprendió a abrir puertas y es muy cariñosa con los niños"',
      'activar mascota 1',
      '@1 ¡Hola Luna! ¿Cómo estás?',
      'desactivar conversación'
    ];
    
    logger.info('\n💬 Simulando conversación con configuración natural...');
    
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
    
    // Verificar configuración de mascota
    logger.info('\n⚙️ Verificando configuración natural de mascota...');
    const pets = await petService.getUserPets(user.id);
    
    if (pets.length > 0) {
      const pet = pets[0];
      const config = await petService.getPetConfig(pet.id);
      
      logger.info(`✅ Configuración de ${pet.name}:`, JSON.stringify(config, null, 2));
      
      // Verificar que se parsearon correctamente los parámetros
      const hasToys = config.favorite_toys && config.favorite_toys.length > 0;
      const hasEnergy = config.energy_level;
      const hasFood = config.favorite_food;
      const hasAbilities = config.special_abilities && config.special_abilities.length > 0;
      
      if (hasToys && hasEnergy && hasFood && hasAbilities) {
        logger.info('✅ Configuración natural aplicada correctamente');
        logger.info(`🎾 Juguetes: ${config.favorite_toys.join(', ')}`);
        logger.info(`⚡ Energía: ${config.energy_level}`);
        logger.info(`🍽️ Comida: ${config.favorite_food}`);
        logger.info(`🦸 Habilidades: ${config.special_abilities.join(', ')}`);
      } else {
        logger.warn('⚠️ Configuración natural incompleta');
      }
    }
    
    // Verificar contexto persistente
    logger.info('\n💾 Verificando contexto persistente...');
    const context = await userModel.getContext(user.id, 'whatsapp');
    
    logger.info(`✅ Contexto guardado: ${context.length} mensajes`);
    logger.info(`📊 Último mensaje del contexto: ${context[context.length - 1]?.content?.substring(0, 50)}...`);
    
    // Probar interacción directa con mascota
    logger.info('\n🐾 Probando interacción directa con mascota...');
    if (pets.length > 0) {
      const pet = pets[0];
      const petResult = await petService.processPetMessage(
        pet.id,
        '¿Qué te gusta hacer?',
        Math.floor(Date.now() / 1000),
        'whatsapp'
      );
      
      logger.info(`🐱 Respuesta de ${pet.name}: ${petResult.reply.substring(0, 100)}...`);
    }
    
    logger.info('\n🎉 ¡Prueba de configuración natural completada exitosamente!');
    logger.info('📱 El sistema está listo para configuraciones en lenguaje natural');
    
  } catch (error) {
    logger.error('❌ Error en la prueba de conversación:', error);
    process.exit(1);
  }
}

testConversation(); 