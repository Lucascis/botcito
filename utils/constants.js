// utils/constants.js

const { maxTextChars, historyLen, rateLimitPerMinute } = (() => {
  try { return require('../config'); } catch (_) { return {}; }
})();

module.exports = {
  MAX_TEXT_CHARS: maxTextChars || 4000,
  MAX_IMAGE_MB: 20,
  MAX_AUDIO_MB: 25,
  HISTORY_LEN: historyLen || 20,
  RATE_LIMIT_PER_MINUTE: rateLimitPerMinute || 10,
  BOT_MSG_TTL_MS: 60 * 1000,
  CONVERSATION_TTL_MS: 6 * 60 * 60 * 1000,
  RATE_LIMIT_ENTRY_TTL_MS: 15 * 60 * 1000,
  TEMP_MAX_AGE_MS: 6 * 60 * 60 * 1000,
  TEMP_CLEAN_CRON: '*/30 * * * *'
};


