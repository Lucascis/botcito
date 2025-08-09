const http = require('http');
const logger = require('../utils/logger');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 3000, path }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    logger.info('🔎 Probando endpoints /health, /ready, /metrics');
    const health = await get('/health');
    logger.info(`/health: ${health.status} ${health.data}`);
    const ready = await get('/ready');
    logger.info(`/ready: ${ready.status} ${ready.data.substring(0, 200)}...`);
    const metrics = await get('/metrics');
    logger.info(`/metrics: ${metrics.status} ${metrics.data.split('\n').slice(0, 5).join('\n')}...`);
    process.exit(0);
  } catch (e) {
    logger.error('❌ Error probando endpoints:', e);
    process.exit(1);
  }
})();


