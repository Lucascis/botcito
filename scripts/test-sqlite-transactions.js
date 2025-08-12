// scripts/test-sqlite-transactions.js
require('dotenv').config();
const logger = require('../utils/logger');
const User = require('../models/user/User');

async function testSQLiteTransactions() {
  try {
    logger.info('🗄️ Testing SQLite transactions...');
    
    const userModel = new User();
    const testPhone = '+5491199887766';
    
    // Test 1: Transacción básica - crear usuario con contexto
    logger.info('Test 1: Creating user with context in transaction');
    
    const result1 = await userModel.createUserWithContext(
      testPhone,
      'Test Transaction User',
      'whatsapp',
      { testKey: 'testValue', timestamp: Date.now() }
    );
    
    if (result1.contextCreated) {
      logger.info('✅ Transaction test 1 passed: User and context created');
    } else {
      throw new Error('Context was not created in transaction');
    }
    
    // Test 2: Transacción de actualización - actividad y contexto
    logger.info('Test 2: Updating user activity and context in transaction');
    
    const result2 = await userModel.updateUserActivityAndContext(
      result1.id,
      'whatsapp',
      { updated: true, newData: 'transaction test', timestamp: Date.now() }
    );
    
    if (result2.updated) {
      logger.info('✅ Transaction test 2 passed: User activity and context updated');
    } else {
      throw new Error('User activity/context update failed');
    }
    
    // Test 3: Verificar integridad - el contexto debe estar actualizado
    logger.info('Test 3: Verifying transaction integrity');
    
    const user = await userModel.getUserByPhone(testPhone);
    const context = await userModel.getContext(user.id, 'whatsapp');
    
    if (context && context.updated && context.newData === 'transaction test') {
      logger.info('✅ Transaction test 3 passed: Data integrity verified');
    } else {
      throw new Error('Transaction integrity check failed');
    }
    
    // Test 4: Transacción custom usando executeTransaction
    logger.info('Test 4: Custom transaction operations');
    
    const customResult = await userModel.executeTransaction((db, callback) => {
      // Operación compleja: crear usuario temporal y luego eliminarlo
      db.run(
        'INSERT INTO users (phone_number, name) VALUES (?, ?)',
        ['+5491100000000', 'Temp User'],
        function(err) {
          if (err) return callback(err);
          
          const tempUserId = this.lastID;
          
          // Inmediatamente eliminar el usuario temporal
          db.run(
            'DELETE FROM users WHERE id = ?',
            [tempUserId],
            function(deleteErr) {
              if (deleteErr) return callback(deleteErr);
              callback(null, { tempUserId, deleted: this.changes > 0 });
            }
          );
        }
      );
    });
    
    if (customResult.deleted) {
      logger.info('✅ Transaction test 4 passed: Custom transaction completed');
    } else {
      throw new Error('Custom transaction failed');
    }
    
    logger.info('🎉 All SQLite transaction tests passed successfully!');
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ SQLite transaction test failed:', error);
    process.exit(1);
  }
}

testSQLiteTransactions();
