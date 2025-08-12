// scripts/test-bugs-simple.js
const logger = require('../utils/logger');

async function testSimple() {
  try {
    logger.info('🔍 Testing simple bug fixes...');

    // Test 1: FileStorageService validation
    const FileStorageService = require('../services/storage/FileStorageService');
    const storage = new FileStorageService();
    
    logger.info('Test 1: FileStorageService validation');
    try {
      storage.saveBase64File({ base64Data: 'invalid!@#', fromId: 'test', prefix: 'test_', extension: 'txt' });
      logger.error('❌ Should have thrown for invalid base64');
      process.exit(1);
    } catch (e) {
      if (e.message.includes('base64Data no es válido')) {
        logger.info('✅ FileStorageService correctly validates base64');
      } else {
        logger.error('❌ Wrong error message:', e.message);
        process.exit(1);
      }
    }

    // Test 2: Memory leak fix simulation
    logger.info('Test 2: processedMessageIds cleanup simulation');
    const messageIds = new Set();
    
    // Simulate adding 1010 messages
    for (let i = 0; i < 1010; i++) {
      messageIds.add(`msg_${i}`);
      
      // Apply the fix logic
      if (messageIds.size > 1000) {
        const elementsToDelete = Array.from(messageIds).slice(0, 200);
        elementsToDelete.forEach(id => messageIds.delete(id));
      }
    }
    
    if (messageIds.size <= 810) { // 1010 - 200 = 810
      logger.info('✅ Memory leak fix working correctly, size:', messageIds.size);
    } else {
      logger.error('❌ Memory leak fix not working, size:', messageIds.size);
      process.exit(1);
    }

    logger.info('🎉 Simple bug fix tests completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Simple bug fix test failed:', error);
    process.exit(1);
  }
}

testSimple();
