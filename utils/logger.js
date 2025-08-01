const { createLogger, format, transports } = require('winston');
const { logLevel } = require('../config');

// Configuración del logger. Incluye marca de tiempo y pila de errores.
const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return stack
        ? `${timestamp} [${level}] ${message} \n${stack}`
        : `${timestamp} [${level}] ${message}`;
    })
  ),
  transports: [new transports.Console()]
});

module.exports = logger;
