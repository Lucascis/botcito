const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const logLevel = process.env.LOG_LEVEL || 'info';

function maskPII(message) {
  if (typeof message !== 'string') return message;
  // Enmascarar números largos (teléfonos) dejando últimos 4 dígitos
  return message.replace(/\+?\d{6,}/g, (match) => {
    const last4 = match.slice(-4);
    return `***${last4}`;
  });
}

const isProduction = process.env.NODE_ENV === 'production';

const baseFormats = isProduction
  ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
  : format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.printf(({ timestamp, level, message, stack }) => {
        const safeMessage = maskPII(message);
        if (stack) {
          return `${timestamp} [${level}] ${safeMessage} \n${stack}`;
        }
        return `${timestamp} [${level}] ${safeMessage}`;
      })
    );

const logger = createLogger({
  level: logLevel,
  format: baseFormats,
  transports: isProduction
    ? [
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '10m',
          maxFiles: '14d'
        })
      ]
    : [new transports.Console()]
});

module.exports = logger;
