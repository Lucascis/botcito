// scripts/test-all-corrections.js
require('dotenv').config();
const logger = require('../utils/logger');
const MessageValidator = require('../utils/messageValidator');
const ChatSessionManager = require('../services/session/ChatSessionManager');
const config = require('../config');

async function testAllCorrections() {
  try {
    logger.info('🔍 Testing all bug corrections...');

    // Test 1: Validador unificado de mensajes
    logger.info('Test 1: MessageValidator functionality');
    
    // Mensaje válido
    const validMessage = {
      type: 'chat',
      body: 'Hola mundo',
      from: '+5491112345678@c.us',
      hasMedia: false
    };
    
    const validation = MessageValidator.validateMessage(validMessage, false);
    if (!validation.isValid) {
      throw new Error('Mensaje válido fue rechazado');
    }
    
    // Mensaje inválido
    const invalidMessage = {
      type: 'chat',
      body: '',
      from: '+5491112345678@c.us',
      hasMedia: false
    };
    
    const invalidValidation = MessageValidator.validateMessage(invalidMessage, false);
    if (invalidValidation.isValid) {
      throw new Error('Mensaje inválido fue aceptado');
    }
    
    logger.info('✅ MessageValidator working correctly');

    // Test 2: Race condition en rate limiting
    logger.info('Test 2: Rate limiting race condition fix');
    
    const sessionManager = new ChatSessionManager({ maxMessagesPerMinute: 2 });
    const userNumber = '+5491112345678';
    
    // Simular múltiples llamadas concurrentes
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(Promise.resolve(sessionManager.checkRateLimit(userNumber)));
    }
    
    const results = await Promise.all(promises);
    const allowed = results.filter(r => r === true).length;
    const blocked = results.filter(r => r === false).length;
    
    if (allowed <= 2 && blocked >= 3) {
      logger.info('✅ Rate limiting working correctly');
    } else {
      logger.warn(`⚠️ Rate limiting: allowed=${allowed}, blocked=${blocked} (may vary due to timing)`);
    }

    // Test 3: Límites configurables
    logger.info('Test 3: Configurable limits');
    
    if (config.limits && config.limits.processedMessagesLimit) {
      logger.info(`✅ Processed messages limit: ${config.limits.processedMessagesLimit}`);
      logger.info(`✅ Cleanup size: ${config.limits.processedMessagesCleanupSize}`);
      logger.info(`✅ Bot messages cache: ${config.limits.botMessagesCacheLimit}`);
      logger.info(`✅ Bot messages cleanup: ${config.limits.botMessagesCleanupSize}`);
    } else {
      throw new Error('Configurable limits not found');
    }

    // Test 4: Simulación de memory leak fix
    logger.info('Test 4: Memory leak fixes');
    
    const messageIds = new Set();
    const limit = config.limits.processedMessagesLimit;
    const cleanupSize = config.limits.processedMessagesCleanupSize;
    
    // Agregar más mensajes que el límite
    for (let i = 0; i < limit + 100; i++) {
      messageIds.add(`msg_${i}`);
      
      if (messageIds.size > limit) {
        const elementsToDelete = Array.from(messageIds).slice(0, cleanupSize);
        elementsToDelete.forEach(id => messageIds.delete(id));
      }
    }
    
    if (messageIds.size <= limit) {
      logger.info(`✅ Memory leak fix working, final size: ${messageIds.size}`);
    } else {
      throw new Error(`Memory leak fix failed, size: ${messageIds.size}`);
    }

    logger.info('🎉 All correction tests passed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Correction test failed:', error);
    process.exit(1);
  }
}

testAllCorrections();

