// config/envSchema.js
const { cleanEnv, str, num, bool } = require('envalid');

function validateEnv(env = process.env) {
  return cleanEnv(env, {
    OPENAI_API_KEY: str(),
    OPENAI_ORGANIZATION_ID: str({ default: '' }),
    BOT_PREFIX: str({ default: '#bot' }),
    LOG_LEVEL: str({ default: 'info' }),
    PORT: num({ default: 3000 }),
    NODE_ENV: str({ default: 'development' }),
    DB_PATH: str({ default: './data/users.db' }),
    ALLOWED_NUMBERS: str({ default: '' }),
    TEMP_DIR: str({ default: '/tmp/botcito' }),
    OPENAI_TIMEOUT_MS: num({ default: 30000 }),
    OPENAI_MAX_RETRIES: num({ default: 3 }),
    PUPPETEER_EXECUTABLE_PATH: str({ default: '' }),
    CORS_ORIGIN: str({ default: '' }),
    // Conversación/limites
    RATE_LIMIT_PER_MINUTE: num({ default: 10 }),
    MAX_TEXT_CHARS: num({ default: 4000 }),
    HISTORY_LEN: num({ default: 10 }),
    // Estilo de salida WhatsApp
    WHATSAPP_FORMAT_ENHANCE: bool({ default: true }),
    WHATSAPP_ADD_SEPARATORS: bool({ default: false }),
    // Estrategia modelos
    MODEL_SELECTION_STRATEGY: str({ default: 'cost_optimized' }),
    // Defaults de LLM (texto)
    OPENAI_TEXT_TEMPERATURE: num({ default: 0.7 }),
    OPENAI_TEXT_MAX_TOKENS: num({ default: 512 }),
    OPENAI_TEXT_TOP_P: num({ default: 1 }),
    OPENAI_TEXT_PRESENCE_PENALTY: num({ default: 0 }),
    OPENAI_TEXT_FREQUENCY_PENALTY: num({ default: 0 }),
    // Defaults de LLM (imágenes)
    OPENAI_IMAGE_TEMPERATURE: num({ default: 0.7 }),
    OPENAI_IMAGE_MAX_TOKENS: num({ default: 600 }),
    // Límites configurables
    PROCESSED_MESSAGES_LIMIT: num({ default: 1000 }),
    PROCESSED_MESSAGES_CLEANUP_SIZE: num({ default: 200 }),
    BOT_MESSAGES_CACHE_LIMIT: num({ default: 2000 }),
    BOT_MESSAGES_CLEANUP_SIZE: num({ default: 1000 })
  });
}

module.exports = { validateEnv };


