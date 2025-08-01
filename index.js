require('dotenv').config();
const App = require('./core/app');
const logger = require('./utils/logger');

// Capturar errores no manejados y excepciones para evitar salidas silenciosas
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

// Punto de entrada principal
(async () => {
  try {
    const app = new App();
    await app.start();
  } catch (err) {
    logger.error('Error iniciando la aplicación:', err);
    process.exit(1);
  }
})();
