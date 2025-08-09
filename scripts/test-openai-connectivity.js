require('dotenv').config();
const { openaiClient } = require('../services/openaiClient');
const logger = require('../utils/logger');

(async () => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      const msg = '❌ OPENAI_API_KEY no está configurada. Configúrala en .env para ejecutar este test.';
      try { logger.error(msg); } catch (_) { /* ignore */ }
      console.error(msg);
      process.exit(1);
      return;
    }

    const model = process.env.OPENAI_TEST_MODEL || 'gpt-4o-mini';
    const startMsg = `🔌 Probando conectividad OpenAI con modelo: ${model}`;
    try { logger.info(startMsg); } catch (_) { /* ignore */ }
    console.log(startMsg);

    const start = Date.now();
    const resp = await openaiClient.chatCompletionsCreate({
      model,
      temperature: 0.0,
      max_tokens: 8,
      messages: [
        { role: 'system', content: 'You are a connectivity test runner.' },
        { role: 'user', content: 'Reply with exactly: PONG' }
      ]
    });

    const ms = Date.now() - start;
    const content = resp?.choices?.[0]?.message?.content?.trim() || '';
    if (content.toUpperCase().includes('PONG')) {
      const ok = `✅ Conectado a OpenAI. Respuesta: "${content}" (${ms}ms)`;
      try { logger.info(ok); } catch (_) { /* ignore */ }
      console.log(ok);
      process.exit(0);
    } else {
      const bad = `❌ Respuesta inesperada de OpenAI: "${content}"`;
      try { logger.error(bad); } catch (_) { /* ignore */ }
      console.error(bad);
      process.exit(1);
    }
  } catch (e) {
    try { logger.error('❌ Error verificando conectividad con OpenAI:', e); } catch (_) { /* ignore */ }
    console.error('❌ Error verificando conectividad con OpenAI:', e?.message || e);
    process.exit(1);
  }
})();


