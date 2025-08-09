const { cleanEnv, str, num, bool } = require('envalid');

const env = cleanEnv(process.env, {
  OPENAI_API_KEY: str(),
  OPENAI_ORGANIZATION_ID: str({ default: '' }),
  BOT_PREFIX: str({ default: '#bot' }),
  LOG_LEVEL: str({ default: 'info' }),
  PORT: num({ default: 3000 }),
  NODE_ENV: str({ default: 'development' }),
  DB_PATH: str({ default: './data/users.db' }),
  ALLOWED_NUMBERS: str({ default: '' }),
  RATE_LIMIT_PER_MINUTE: num({ default: 10 }),
  MAX_TEXT_CHARS: num({ default: 4000 }),
  HISTORY_LEN: num({ default: 20 }),
  WHATSAPP_FORMAT_ENHANCE: bool({ default: true }),
  WHATSAPP_ADD_SEPARATORS: bool({ default: false }),
  MODEL_SELECTION_STRATEGY: str({ default: 'balanced' }),
  OPENAI_TEXT_TEMPERATURE: num({ default: 0.7 }),
  OPENAI_TEXT_MAX_TOKENS: num({ default: 800 }),
  OPENAI_TEXT_TOP_P: num({ default: 1 }),
  OPENAI_TEXT_PRESENCE_PENALTY: num({ default: 0 }),
  OPENAI_TEXT_FREQUENCY_PENALTY: num({ default: 0 }),
  OPENAI_IMAGE_TEMPERATURE: num({ default: 0.7 }),
  OPENAI_IMAGE_MAX_TOKENS: num({ default: 600 })
});

const allowedNumbers = env.ALLOWED_NUMBERS
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  openaiKey: env.OPENAI_API_KEY,
  openaiOrgId: env.OPENAI_ORGANIZATION_ID || null,
  allowedNumbers,
  logLevel: env.LOG_LEVEL,
  botPrefix: env.BOT_PREFIX,
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  dbPath: env.DB_PATH,
  rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
  maxTextChars: env.MAX_TEXT_CHARS,
  historyLen: env.HISTORY_LEN,
  whatsappFormatEnhance: env.WHATSAPP_FORMAT_ENHANCE,
  whatsappAddSeparators: env.WHATSAPP_ADD_SEPARATORS,
  modelSelectionStrategy: env.MODEL_SELECTION_STRATEGY,
  defaults: {
    text: {
      temperature: env.OPENAI_TEXT_TEMPERATURE,
      max_tokens: env.OPENAI_TEXT_MAX_TOKENS,
      top_p: env.OPENAI_TEXT_TOP_P,
      presence_penalty: env.OPENAI_TEXT_PRESENCE_PENALTY,
      frequency_penalty: env.OPENAI_TEXT_FREQUENCY_PENALTY
    },
    image: {
      temperature: env.OPENAI_IMAGE_TEMPERATURE,
      max_tokens: env.OPENAI_IMAGE_MAX_TOKENS
    }
  }
};
