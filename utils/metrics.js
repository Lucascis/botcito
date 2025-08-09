let promClient;
try {
  promClient = require('prom-client');
} catch (_) {
  promClient = null;
}

const metrics = (() => {
  if (!promClient) {
    // No-op fallbacks if prom-client is not installed
    return {
      register: null,
      incMessageReceived: () => {},
      incMessageBlocked: () => {},
      incError: () => {},
      recordOpenAICall: () => {}
    };
  }

  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });

  const messagesReceived = new promClient.Counter({
    name: 'bot_messages_received_total',
    help: 'Mensajes recibidos por el bot',
    labelNames: ['channel', 'type']
  });
  const messagesBlocked = new promClient.Counter({
    name: 'bot_messages_blocked_total',
    help: 'Mensajes bloqueados por rate limit u otras políticas',
    labelNames: ['reason']
  });
  const errorsCounter = new promClient.Counter({
    name: 'bot_errors_total',
    help: 'Errores ocurridos en el sistema',
    labelNames: ['area']
  });
  const openaiCalls = new promClient.Counter({
    name: 'openai_calls_total',
    help: 'Cantidad de llamadas a OpenAI',
    labelNames: ['operation', 'status']
  });
  const openaiDuration = new promClient.Histogram({
    name: 'openai_call_duration_seconds',
    help: 'Duración de llamadas a OpenAI',
    labelNames: ['operation', 'status'],
    buckets: [0.05, 0.1, 0.3, 1, 3, 10, 30]
  });
  const openaiBreaker = new promClient.Gauge({
    name: 'openai_breaker_open',
    help: 'Estado del circuit breaker para OpenAI (1 abierto, 0 cerrado)'
  });
  const activeConversations = new promClient.Gauge({
    name: 'bot_active_conversations',
    help: 'Cantidad de conversaciones activas'
  });
  const handlerResults = new promClient.Counter({
    name: 'bot_handler_results_total',
    help: 'Resultados de handlers (audio/image/mixed/text)',
    labelNames: ['handler', 'result']
  });

  register.registerMetric(messagesReceived);
  register.registerMetric(messagesBlocked);
  register.registerMetric(errorsCounter);
  register.registerMetric(openaiCalls);
  register.registerMetric(openaiDuration);
  register.registerMetric(openaiBreaker);
  register.registerMetric(activeConversations);
  register.registerMetric(handlerResults);

  return {
    register,
    incMessageReceived: (channel = 'whatsapp', type = 'text') => {
      messagesReceived.labels(channel, type).inc();
    },
    incMessageBlocked: (reason = 'rate_limit') => {
      messagesBlocked.labels(reason).inc();
    },
    incError: (area = 'general') => {
      errorsCounter.labels(area).inc();
    },
    recordOpenAICall: (operation, ms, success) => {
      const status = success ? 'success' : 'error';
      openaiCalls.labels(operation, status).inc();
      openaiDuration.labels(operation, status).observe(ms / 1000);
    },
    setOpenAIBreaker: (isOpen) => {
      openaiBreaker.set(isOpen ? 1 : 0);
    },
    setActiveConversationsCount: (count) => {
      activeConversations.set(typeof count === 'number' ? count : 0);
    },
    incHandlerResult: (handler, result) => {
      handlerResults.labels(handler || 'unknown', result || 'unknown').inc();
    }
  };
})();

module.exports = { metrics };


