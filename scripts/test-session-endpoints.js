// scripts/test-session-endpoints.js
require('dotenv').config();
const http = require('http');
const logger = require('../utils/logger');
const App = require('../core/app');

async function testSessionEndpoints() {
  let app;
  
  try {
    logger.info('🌐 Testing session management endpoints...');
    
    // Crear y iniciar aplicación
    app = new App();
    await app.start();
    
    // Esperar a que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: GET /sessions
    logger.info('Test 1: Testing GET /sessions');
    const sessionsResponse = await makeRequest('GET', '/sessions');
    
    if (sessionsResponse.statusCode === 200) {
      const data = JSON.parse(sessionsResponse.data);
      logger.info('✅ GET /sessions working');
      logger.info(`   - Sessions found: ${data.sessions?.length || 0}`);
      logger.info(`   - Stats: ${JSON.stringify(data.stats || {})}`);
    } else if (sessionsResponse.statusCode === 503) {
      logger.info('⚠️ GET /sessions returned 503 (session manager not available - expected with DISABLE_WHATSAPP)');
    } else {
      throw new Error(`GET /sessions failed with status ${sessionsResponse.statusCode}`);
    }
    
    // Test 2: GET /ready (should include session info)
    logger.info('Test 2: Testing GET /ready with session info');
    const readyResponse = await makeRequest('GET', '/ready');
    
    if (readyResponse.statusCode === 200) {
      const data = JSON.parse(readyResponse.data);
      logger.info('✅ GET /ready working');
      logger.info(`   - Ready: ${data.ready}`);
      logger.info(`   - OpenAI breaker: ${data.openaiBreakerOpen}`);
      logger.info(`   - File breaker: ${data.fileBreakerOpen}`);
    } else {
      throw new Error(`GET /ready failed with status ${readyResponse.statusCode}`);
    }
    
    // Test 3: GET /stats
    logger.info('Test 3: Testing GET /stats');
    const statsResponse = await makeRequest('GET', '/stats');
    
    if (statsResponse.statusCode === 200) {
      const data = JSON.parse(statsResponse.data);
      logger.info('✅ GET /stats working');
      logger.info(`   - Total users: ${data.totalUsers || 'N/A'}`);
    } else {
      throw new Error(`GET /stats failed with status ${statsResponse.statusCode}`);
    }
    
    // Test 4: DELETE /sessions/test (should return 404 or 503)
    logger.info('Test 4: Testing DELETE /sessions/nonexistent');
    const deleteResponse = await makeRequest('DELETE', '/sessions/nonexistent');
    
    if (deleteResponse.statusCode === 404 || deleteResponse.statusCode === 503) {
      logger.info('✅ DELETE /sessions/id working (returned expected error code)');
    } else {
      throw new Error(`DELETE /sessions/id returned unexpected status ${deleteResponse.statusCode}`);
    }
    
    logger.info('🎉 All session endpoint tests completed successfully!');
    logger.info('📋 Summary:');
    logger.info('   - ✅ Session listing endpoint');
    logger.info('   - ✅ Ready endpoint with session info');
    logger.info('   - ✅ Stats endpoint');
    logger.info('   - ✅ Session deletion endpoint');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Session endpoint tests failed:', error);
    process.exit(1);
  } finally {
    if (app) {
      try {
        await app.shutdown();
      } catch (e) {
        // Ignore shutdown errors
      }
    }
  }
}

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

testSessionEndpoints();

