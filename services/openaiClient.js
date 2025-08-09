// services/openaiClient.js
const OpenAI = require('openai');
const logger = require('../utils/logger');
const { openaiKey, openaiOrgId } = require('../config');

// Configuración de timeout y reintentos
const DEFAULT_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 30000);
const MAX_RETRIES = Number(process.env.OPENAI_MAX_RETRIES || 3);

// Circuit breaker simple
let failureTimestamps = [];
let breakerOpenUntil = 0;
const FAILURE_WINDOW_MS = 60 * 1000;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60 * 1000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promiseFactory, timeoutMs = DEFAULT_TIMEOUT_MS, operation = 'generic') {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`OpenAI request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const start = Date.now();
    const result = await Promise.race([promiseFactory(), timeoutPromise]);
    const { metrics } = require('../utils/metrics');
    if (metrics && typeof metrics.recordOpenAICall === 'function') {
      metrics.recordOpenAICall(operation, Date.now() - start, true);
    }
    return result;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function retry(fn, { maxRetries = MAX_RETRIES, baseDelayMs = 500 } = {}) {
  // Si el breaker está abierto, fallar rápido
  if (Date.now() < breakerOpenUntil) {
    const ms = breakerOpenUntil - Date.now();
    throw new Error(`OpenAI breaker open. Retry after ${ms}ms`);
  }
  let attempt = 0;
  let lastError;
  while (attempt <= maxRetries) {
    try {
      const res = await fn();
      // éxito: limpiar failures antiguos
      failureTimestamps = failureTimestamps.filter(ts => Date.now() - ts < FAILURE_WINDOW_MS);
      return res;
    } catch (error) {
      lastError = error;
      const { metrics } = require('../utils/metrics');
      if (metrics && typeof metrics.recordOpenAICall === 'function') {
        metrics.recordOpenAICall('generic', 0, false);
      }
      const isRetryable =
        (error.status && (error.status >= 500 || error.status === 429)) ||
        /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(error.message || '');

      if (!isRetryable || attempt === maxRetries) {
        // registrar fallo para breaker
        const now = Date.now();
        failureTimestamps.push(now);
        failureTimestamps = failureTimestamps.filter(ts => now - ts < FAILURE_WINDOW_MS);
        if (failureTimestamps.length >= FAILURE_THRESHOLD) {
          breakerOpenUntil = now + COOLDOWN_MS;
          logger.error(`OpenAI breaker OPEN for ${COOLDOWN_MS}ms (failures in last ${FAILURE_WINDOW_MS}ms: ${failureTimestamps.length})`);
          try {
            const { metrics } = require('../utils/metrics');
            if (metrics && typeof metrics.setOpenAIBreaker === 'function') metrics.setOpenAIBreaker(true);
          } catch (e) { /* ignore metrics error */ }
        }
        break;
      }
      const waitMs = Math.min(5000, baseDelayMs * Math.pow(2, attempt));
      logger.warn(`OpenAI call failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${waitMs}ms: ${error.message}`);
      await delay(waitMs);
      attempt++;
    }
  }
  throw lastError;
}

// Exponer estado del breaker (para readiness opcional)
function isBreakerOpen() {
  const open = Date.now() < breakerOpenUntil;
  try {
    const { metrics } = require('../utils/metrics');
    if (metrics && typeof metrics.setOpenAIBreaker === 'function') { metrics.setOpenAIBreaker(open); }
  } catch (e) { /* ignore metrics error */ }
  return open;
}

let client;
let orgEnabled = Boolean(openaiOrgId);

function createClient() {
  client = new OpenAI({
    apiKey: openaiKey,
    organization: orgEnabled ? openaiOrgId : undefined
  });
}

createClient();

function isOrgMismatchError(error) {
  const msg = (error && (error.message || error.toString())) || '';
  return error?.status === 401 && /OpenAI-Organization header should match/i.test(msg);
}

async function callWithOrgFallback(operation, execFn) {
  try {
    return await execFn();
  } catch (err) {
    if (isOrgMismatchError(err) && orgEnabled) {
      logger.warn('OPENAI_ORGANIZATION_ID parece no coincidir con la API key. Reintentando sin cabecera de organización...');
      orgEnabled = false;
      createClient();
      // Reintentar una vez sin organización
      return await execFn();
    }
    throw err;
  }
}

const openaiClient = {
  chatCompletionsCreate: async (params) =>
    retry(() => withTimeout(() => callWithOrgFallback('chat_completions', () => client.chat.completions.create(params)), DEFAULT_TIMEOUT_MS, 'chat_completions')),

  responsesCreate: async (params) =>
    retry(() => withTimeout(() => callWithOrgFallback('responses', () => client.responses.create(params)), DEFAULT_TIMEOUT_MS, 'responses')),

  audioTranscriptionsCreate: async (params) =>
    retry(() => withTimeout(() => callWithOrgFallback('audio_transcriptions', () => client.audio.transcriptions.create(params)), DEFAULT_TIMEOUT_MS, 'audio_transcriptions')),
};

module.exports = { openaiClient, isBreakerOpen };


