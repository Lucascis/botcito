const User = require('../models/user/User');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('Iniciando migraciones de base de datos...');
    
    // Crear instancia del modelo de usuario (esto inicializará la base de datos)
    const userModel = new User();
    
    // Esperar un momento para que se complete la inicialización
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('Migraciones completadas exitosamente');
    logger.info('Base de datos inicializada en ./data/users.db');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error durante las migraciones:', error);
    process.exit(1);
  }
}

runMigrations(); 