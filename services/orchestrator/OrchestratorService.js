const OpenAI = require('openai');
const logger = require('../../utils/logger');
const { openaiKey, openaiOrgId } = require('../../config');
const User = require('../../models/user/User');
const ModelService = require('../modelService');
const WhatsAppFormatter = require('../../utils/whatsappFormatter');

class OrchestratorService {
  constructor() {
    this.client = new OpenAI({
      apiKey: openaiKey,
      organization: openaiOrgId || undefined
    });
    this.userModel = new User();
    this.modelService = new ModelService();
  }

  /**
   * Hace una llamada optimizada a OpenAI usando el modelo apropiado
   * @param {Object} params - Parámetros para la llamada a OpenAI
   * @param {string} contentType - Tipo de contenido: 'text', 'image', 'audio', 'mixed'
   * @param {Object} options - Opciones adicionales para la selección de modelo
   * @returns {Promise<Object>} - Respuesta de OpenAI
   */
  async callOpenAI(params, contentType = 'text', options = {}) {
    try {
      // Seleccionar modelo óptimo
      const optimalModel = this.modelService.selectOptimalModel(contentType, options);
      
      // Preparar parámetros con el modelo seleccionado
      const callParams = {
        ...params,
        model: optimalModel
      };

      logger.debug(`Llamada a OpenAI con modelo: ${optimalModel} para tipo: ${contentType}`);
      
      return await this.client.chat.completions.create(callParams);
    } catch (error) {
      logger.error('Error en llamada optimizada a OpenAI:', error);
      throw error;
    }
  }

  /**
   * Procesa un mensaje de usuario y determina la acción a tomar
   * @param {string} userId - ID del usuario
   * @param {string} phoneNumber - Número de teléfono
   * @param {string} text - Mensaje del usuario
   * @param {number} timestampSec - Timestamp de WhatsApp
   * @param {string} channel - Canal de comunicación (whatsapp, discord, etc.)
   */
  async processMessage(userId, phoneNumber, text, timestampSec, channel = 'whatsapp') {
    try {
      // Crear o obtener usuario
      let user = await this.userModel.getUserByPhone(phoneNumber);
      if (!user) {
        await this.userModel.createUser(phoneNumber);
        user = await this.userModel.getUserByPhone(phoneNumber);
        logger.info(`Nuevo usuario creado: ${phoneNumber}`);
      } else {
        logger.debug(`Usuario existente: ${user.name || phoneNumber} (ID: ${user.id})`);
      }

      // Actualizar actividad del usuario
      await this.userModel.updateLastActive(user.id);
      
      // Flag para desactivación por intención del modelo
      let shouldDeactivateFlag = false;

      // DETECCIÓN DIRECTA de desactivación de conversación
      const shouldDeactivateNow = /\b(desactivar|detener|salir|stop|exit|chau)\s*(conversaci[oó]n|bot|chat)\b/i.test(text);
      logger.info(`🔍 Texto recibido: "${text}"`);
      logger.info(`🔍 Regex test result: ${shouldDeactivateNow}`);
      
      // Si debe desactivar, manejar directamente
      if (shouldDeactivateNow) {
        logger.info('✅ Desactivación detectada directamente por regex');
        
        const reply = 'Conversación desactivada. Usa "#bot" para reactivar.';
        
        // Marcar para desactivar SIN llamar a OpenAI
        const result = {
          reply: WhatsAppFormatter.formatMessage(reply, { enhanceFormat: true }),
          shouldDeactivate: true,
          userId: user.id,
          user: user
        };
        logger.info(`✅ Retornando con shouldDeactivate: ${result.shouldDeactivate}`);
        return result;
      }

      // Obtener contexto de conversación
      const history = await this.userModel.getContext(user.id, channel);

      // Convertir timestamp a fecha local
      const date = new Date(timestampSec * 1000);
      const timestampStr = date.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Construir mensajes para OpenAI
      const messages = [
        {
          role: 'system',
           content: `Eres un asistente inteligente que puede:
1. Responder preguntas generales
2. Realizar búsquedas web para obtener información actualizada
3. Mantener conversaciones contextuales

Responde siempre en el mismo idioma en que el usuario hace la consulta.
La fecha y hora actual es ${timestampStr} (America/Argentina/Buenos_Aires).
Usuario: ${user.name || phoneNumber}

Comandos disponibles:
- "desactivar conversación" - Dejar de responder automáticamente`
        },
        ...history,
        { role: 'user', content: text }
      ];

      // Definir funciones disponibles
      const functions = [
        {
          name: 'search_web',
          description: 'Realiza una búsqueda web para obtener información actualizada.',
          parameters: {
            type: 'object',
            properties: {
              query: { 
                type: 'string', 
                description: 'Término de búsqueda específico' 
              }
            },
            required: ['query']
          }
        },
        {
          name: 'deactivate_conversation',
          description: 'Llamar cuando el usuario exprese que desea finalizar, desactivar, despedirse o terminar la conversación.',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ];


      
      // Primera llamada: el modelo decide si invoca funciones
      const complexity = this.modelService.analyzeTextComplexity(text);
      let resp = await this.callOpenAI({
        messages,
        functions,
        function_call: 'auto'
      }, 'text', { complexity });

      let choice = resp.choices[0];

      // Si solicita una función
      if (choice.finish_reason === 'function_call') {
        const { name, arguments: args } = choice.message.function_call;
        const parsedArgs = JSON.parse(args);
        
        if (name === 'search_web') {
          const { query } = parsedArgs;
          
          // Usar Responses API con web_search_preview
          const searchRes = await this.client.responses.create({
            model: 'gpt-4o',
            tools: [{ type: 'web_search_preview' }],
            input: query
          });
          
          const searchInfo = (searchRes.output_text || '').trim() ||
                           'No se obtuvo información actualizada.';
          
          messages.push({
            role: 'assistant',
            content: null,
            function_call: { name, arguments: args }
          });
          
          // Formatear resultado de búsqueda para WhatsApp
          const formattedSearchInfo = channel === 'whatsapp' ? 
            WhatsAppFormatter.formatWebSearchResult(query, searchInfo) : 
            searchInfo;
            
          messages.push({
            role: 'function',
            name: 'search_web',
            content: formattedSearchInfo
          });
          
          // Segunda llamada con resultados de búsqueda
          resp = await this.callOpenAI({
            messages
          }, 'text', { complexity });
          choice = resp.choices[0];
        } else if (name === 'deactivate_conversation') {
          // Marcar desactivación y opcionalmente generar una despedida breve
          shouldDeactivateFlag = true;

          messages.push({
            role: 'assistant',
            content: null,
            function_call: { name, arguments: args }
          });

          messages.push({
            role: 'function',
            name: 'deactivate_conversation',
            content: JSON.stringify({ success: true })
          });

          // Hacer una segunda llamada SÓLO con messages para obtener una despedida natural
          try {
            resp = await this.callOpenAI({
              messages
            }, 'text', { complexity: 'low' });
            choice = resp.choices[0];
          } catch (e) {
            // Si falla, continuamos con respuesta por defecto
            choice = { message: { content: 'Entendido, desactivo la conversación. ¡Hasta luego!' } };
          }
        }
      }

      // Obtener respuesta final
      let reply = choice.message.content?.trim() || '';
      let shouldDeactivate = shouldDeactivateFlag;

      // Ya no necesitamos verificar funciones porque la desactivación se maneja arriba

      // Aplicar formato específico para WhatsApp
      if (channel === 'whatsapp' && reply) {
        reply = WhatsAppFormatter.formatMessage(reply, { enhanceFormat: true });
        reply = WhatsAppFormatter.truncateIfNeeded(reply);
      }

      // Actualizar historial de conversación
      const newHistory = history.concat(
        { role: 'user', content: text },
        { role: 'assistant', content: reply }
      );

      // Mantener solo los últimos 20 mensajes
      const trimmedHistory = newHistory.slice(-20);
      await this.userModel.saveContext(user.id, channel, trimmedHistory);

      return {
        reply,
        shouldDeactivate,
        userId: user.id,
        user: user
      };

    } catch (error) {
      logger.error('Error in OrchestratorService.processMessage:', error);
      throw error;
    }
  }

  /**
   * (Removido) Procesa un mensaje para una mascota específica
   */
  // processPetMessage removido

  /**
   * Obtiene estadísticas de usuarios activos
   */
  async getStats() {
    try {
      const users = await this.userModel.getAllUsers();
      const modelStats = this.modelService.getStats();
      
      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        recentUsers: users.filter(u => {
          const lastActive = new Date(u.last_active);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return lastActive > oneDayAgo;
        }).length,
        models: modelStats
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = OrchestratorService; 