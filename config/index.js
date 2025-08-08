const {
  OPENAI_API_KEY,
  ALLOWED_NUMBERS,
  LOG_LEVEL,
  OPENAI_ORGANIZATION_ID,
  BOT_PREFIX,
  PORT,
  NODE_ENV,
  DB_PATH
} = process.env;

if (!OPENAI_API_KEY) {
  throw new Error('Falta OPENAI_API_KEY en el entorno. Copia env.example a .env y completa los valores.');
}

const allowedNumbers = (ALLOWED_NUMBERS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  openaiKey: OPENAI_API_KEY,
  openaiOrgId: OPENAI_ORGANIZATION_ID || null,
  allowedNumbers,
  logLevel: LOG_LEVEL || 'info',
  botPrefix: BOT_PREFIX || '#bot',
  port: PORT || 3000,
  nodeEnv: NODE_ENV || 'development',
  dbPath: DB_PATH || './data/users.db'
};
