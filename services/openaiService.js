// services/openaiService.js
const OpenAI = require('openai');
const logger = require('../utils/logger');
const { openaiKey, openaiOrgId } = require('../config');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: openaiKey,
      organization: openaiOrgId || undefined
    });
    this.sessions = {};
  }

  /**
   * @param {string} userId  Número de teléfono normalizado.
   * @param {string} text    Mensaje del usuario (sin prefijo).
   * @param {number} timestampSec  Timestamp de WhatsApp (segundos UTC).
   */
  async getReply(userId, text, timestampSec) {
    const history = this.sessions[userId] || [];

    // Convertir el timestamp de WhatsApp a fecha local (UTC-3)
    const date = new Date(timestampSec * 1000);
    const timestampStr = date.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year:   'numeric',
      month:  '2-digit',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Construir mensajes de sistema + historial + usuario
    const messages = [
      {
        role: 'system',
        content:
          'Responde siempre en el mismo idioma en que el usuario hace la consulta.'
      },
      {
        role: 'system',
        content:
          `La fecha y hora actual de la conversación es ${timestampStr} ` +
          `(America/Argentina/Buenos_Aires). Utiliza esta hora si es relevante.`
      },
      {
        role: 'system',
        content:
          `Responde siempre con enlaces si no muestras la informacion completa.`
       },
      ...history,
      { role: 'user', content: text }
    ];

    // Definir la función de búsqueda oficial
    const functions = [
      {
        name: 'search_web',
        description:
          'Realiza una búsqueda web para obtener información actualizada.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Término de búsqueda' }
          },
          required: ['query']
        }
      }
    ];

    // Primera llamada: el modelo decide si invoca search_web
    let resp = await this.client.chat.completions.create({
      model:         'gpt-4o',
      messages,
      functions,
      function_call: 'auto'
    });

    let choice = resp.choices[0];

    // Si solicita la función...
    if (choice.finish_reason === 'function_call') {
      const { name, arguments: args } = choice.message.function_call;
      if (name === 'search_web') {
        const { query } = JSON.parse(args);
        // Usar Responses API con web_search_preview
        const searchRes = await this.client.responses.create({
          model: 'gpt-4o',
          tools: [{ type: 'web_search_preview' }],
          input: query
        });
        const info = (searchRes.output_text || '').trim() ||
                     'No se obtuvo información actualizada.';
        messages.push({
          role: 'assistant',
          content: null,
          function_call: { name, arguments: args }
        });
        messages.push({
          role:     'function',
          name:     'search_web',
          content:  info
        });
        resp = await this.client.chat.completions.create({
          model: 'gpt-4o',
          messages
        });
        choice = resp.choices[0];
      }
    }

    // Obtener respuesta final
    const reply = choice.message.content?.trim() || '';

    // Actualizar historial (solo user + assistant)
    const newHist = history.concat(
      { role: 'user', content: text },
      { role: 'assistant', content: reply }
    );
    this.sessions[userId] = newHist.slice(-20);

    return reply || null;
  }
}

module.exports = OpenAIService;
