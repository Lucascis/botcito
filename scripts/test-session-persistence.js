// scripts/test-session-persistence.js
require('dotenv').config();
const logger = require('../utils/logger');
const User = require('../models/user/User');
const WhatsAppSessionManager = require('../services/session/WhatsAppSessionManager');

async function testSessionPersistence() {
  try {
    logger.info('🔄 Testing WhatsApp session persistence...');
    
    const userModel = new User();
    const sessionManager = new WhatsAppSessionManager();
    
    // Test 1: Initialize session manager
    logger.info('Test 1: Initializing session manager');
    await sessionManager.initialize();
    logger.info('✅ Session manager initialized');
    
    // Test 2: Save a test session
    logger.info('Test 2: Saving test session');
    const testSessionId = 'test_session_' + Date.now();
    const testUserPhone = '+5491199887766';
    const testSessionData = {
      authData: { token: 'test_token_123' },
      clientInfo: { wid: { user: testUserPhone } },
      authenticatedAt: new Date().toISOString()
    };
    
    const saveResult = await sessionManager.saveSession(
      testSessionId,
      testUserPhone,
      testSessionData,
      { testSession: true }
    );
    
    if (saveResult) {
      logger.info('✅ Test session saved successfully');
    } else {
      throw new Error('Failed to save test session');
    }
    
    // Test 3: Retrieve the saved session
    logger.info('Test 3: Retrieving saved session');
    const retrievedSession = await sessionManager.getStoredSession(testSessionId);
    
    if (retrievedSession && retrievedSession.sessionId === testSessionId) {
      logger.info('✅ Session retrieved successfully');
      logger.info(`   - Session ID: ${retrievedSession.sessionId}`);
      logger.info(`   - User Phone: ${retrievedSession.userPhone}`);
      logger.info(`   - Status: ${retrievedSession.status}`);
    } else {
      throw new Error('Failed to retrieve test session');
    }
    
    // Test 4: Update session activity
    logger.info('Test 4: Updating session activity');
    await sessionManager.updateSessionActivity(testSessionId);
    logger.info('✅ Session activity updated');
    
    // Test 5: Get all active sessions
    logger.info('Test 5: Getting all active sessions');
    const activeSessions = await sessionManager.getActiveSessions();
    logger.info(`✅ Found ${activeSessions.length} active sessions`);
    
    const testSession = activeSessions.find(s => s.sessionId === testSessionId);
    if (testSession) {
      logger.info('✅ Test session found in active sessions list');
    } else {
      throw new Error('Test session not found in active sessions');
    }
    
    // Test 6: Session stats
    logger.info('Test 6: Getting session statistics');
    const stats = sessionManager.getSessionStats();
    logger.info(`✅ Session stats: ${JSON.stringify(stats)}`);
    
    // Test 7: Invalidate the test session
    logger.info('Test 7: Invalidating test session');
    const invalidateResult = await sessionManager.invalidateSession(testSessionId, 'test_cleanup');
    
    if (invalidateResult) {
      logger.info('✅ Test session invalidated successfully');
    } else {
      throw new Error('Failed to invalidate test session');
    }
    
    // Test 8: Verify session is no longer active
    logger.info('Test 8: Verifying session invalidation');
    const invalidatedSession = await sessionManager.getStoredSession(testSessionId);
    
    if (!invalidatedSession) {
      logger.info('✅ Session correctly invalidated (not found in active sessions)');
    } else {
      throw new Error('Session still active after invalidation');
    }
    
    // Test 9: Cleanup expired sessions
    logger.info('Test 9: Testing cleanup of expired sessions');
    const cleanupResult = await sessionManager.cleanupExpiredSessions();
    logger.info(`✅ Cleanup completed: ${cleanupResult} sessions removed`);
    
    // Test 10: Direct database operations
    logger.info('Test 10: Testing direct database operations');
    
    const testSessionId2 = 'test_session_direct_' + Date.now();
    await userModel.saveWhatsAppSession(
      testSessionId2,
      '+5491100000000',
      { direct: true },
      { testDirect: true }
    );
    
    const directSession = await userModel.getWhatsAppSession(testSessionId2);
    if (directSession) {
      logger.info('✅ Direct database operations working');
      
      // Cleanup
      await userModel.invalidateWhatsAppSession(testSessionId2, 'test_cleanup');
      await userModel.cleanupExpiredSessions();
    } else {
      throw new Error('Direct database operations failed');
    }
    
    logger.info('🎉 All session persistence tests passed successfully!');
    logger.info('📋 Summary:');
    logger.info('   - ✅ Session creation and storage');
    logger.info('   - ✅ Session retrieval and validation');
    logger.info('   - ✅ Session activity tracking');
    logger.info('   - ✅ Session listing and statistics');
    logger.info('   - ✅ Session invalidation');
    logger.info('   - ✅ Automatic cleanup');
    logger.info('   - ✅ Database integrity');
    logger.info('');
    logger.info('🚀 The session persistence system is ready for production!');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Session persistence test failed:', error);
    process.exit(1);
  }
}

testSessionPersistence();

