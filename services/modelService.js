const logger = require('../utils/logger');

class ModelService {
  constructor() {
    // Configuración de modelos disponibles
    this.models = {
      // Modelos de texto
      'gpt-4o-mini': {
        type: 'text',
        cost: 'low',
        speed: 'fast',
        capability: 'basic',
        maxTokens: 128000,
        description: 'Modelo rápido y económico para tareas básicas de texto'
      },
      'gpt-4o': {
        type: 'multimodal',
        cost: 'high',
        speed: 'medium',
        capability: 'advanced',
        maxTokens: 128000,
        supportsVision: true,
        description: 'Modelo avanzado con capacidades multimodales (texto + imágenes)'
      },
      'whisper-1': {
        type: 'audio',
        cost: 'low',
        speed: 'fast',
        capability: 'specialized',
        description: 'Modelo especializado en transcripción de audio'
      }
    };

    // Configuración de estrategias de selección
    this.strategies = {
      cost_optimized: 'Prioriza el menor costo',
      performance_optimized: 'Prioriza el mejor rendimiento',
      balanced: 'Balance entre costo y rendimiento'
    };

    // Estrategia actual
    this.currentStrategy = 'balanced';
    
    // Estadísticas de uso
    this.usageStats = {
      totalRequests: 0,
      modelUsage: {},
      costSavings: 0
    };
  }

  /**
   * Selecciona el modelo óptimo para el tipo de contenido
   * @param {string} contentType - Tipo de contenido: 'text', 'image', 'audio', 'mixed'
   * @param {Object} options - Opciones adicionales
   * @returns {string} - Nombre del modelo seleccionado
   */
  selectOptimalModel(contentType, options = {}) {
    try {
      let selectedModel;
      const { hasImages = false, complexity = 'medium', maxTokens = null } = options;

      logger.debug(`Seleccionando modelo para tipo: ${contentType}, opciones: ${JSON.stringify(options)}`);

      switch (contentType) {
        case 'audio':
          selectedModel = 'whisper-1';
          break;

        case 'image':
        case 'mixed':
          selectedModel = 'gpt-4o'; // Siempre usar gpt-4o para imágenes
          break;

        case 'text':
          selectedModel = this.selectTextModel(complexity, maxTokens);
          break;

        default:
          logger.warn(`Tipo de contenido desconocido: ${contentType}, usando modelo por defecto`);
          selectedModel = 'gpt-4o-mini';
      }

      // Actualizar estadísticas
      this.updateUsageStats(selectedModel, contentType);

      logger.info(`Modelo seleccionado: ${selectedModel} para ${contentType} (estrategia: ${this.currentStrategy})`);
      return selectedModel;

    } catch (error) {
      logger.error('Error seleccionando modelo:', error);
      return 'gpt-4o-mini'; // Fallback seguro
    }
  }

  /**
   * Selecciona el modelo de texto óptimo según la complejidad
   * @param {string} complexity - Complejidad: 'low', 'medium', 'high'
   * @param {number} maxTokens - Máximo número de tokens requeridos
   * @returns {string} - Modelo seleccionado
   */
  selectTextModel(complexity, maxTokens = null) {
    switch (this.currentStrategy) {
      case 'cost_optimized':
        // Siempre usar el modelo más barato
        return 'gpt-4o-mini';

      case 'performance_optimized':
        // Usar el modelo más capaz para todas las tareas
        return 'gpt-4o';

      case 'balanced':
      default:
        // Balance entre costo y rendimiento
        if (complexity === 'high' || (maxTokens && maxTokens > 50000)) {
          return 'gpt-4o';
        }
        return 'gpt-4o-mini';
    }
  }

  /**
   * Analiza la complejidad de un prompt de texto
   * @param {string} text - Texto a analizar
   * @returns {string} - Nivel de complejidad: 'low', 'medium', 'high'
   */
  analyzeTextComplexity(text) {
    if (!text || typeof text !== 'string') {
      return 'low';
    }

    const length = text.length;
    const wordCount = text.split(/\s+/).length;
    
    // Palabras clave que indican complejidad alta (solo las más específicas)
    const highComplexKeywords = [
      'analiza detalladamente', 'explica detalladamente', 'desarrolla un programa',
      'resumen extenso', 'código completo', 'diseñar sistema', 'planificar proyecto'
    ];

    // Palabras clave que indican complejidad media
    const mediumComplexKeywords = [
      'matemática', 'científico', 'explica', 'compara', 'evalúa',
      'traducir', 'redactar', 'crear', 'diseñar', 'código', 'programa'
    ];

    const hasHighComplexKeywords = highComplexKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    const hasMediumComplexKeywords = mediumComplexKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    // Criterios de complejidad
    if (hasHighComplexKeywords || length > 250 || wordCount > 50) {
      return 'high';
    } else if (hasMediumComplexKeywords || length > 100 || wordCount > 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determina el tipo de contenido de un mensaje
   * @param {Object} message - Mensaje a analizar
   * @returns {Object} - Información del tipo de contenido
   */
  analyzeContentType(message) {
    const analysis = {
      type: 'text',
      hasAudio: false,
      hasImage: false,
      hasText: false,
      complexity: 'medium'
    };

    // Verificar presencia de diferentes tipos de media
    if (message.hasMedia) {
      if (message.type === 'audio' || message.type === 'ptt') {
        analysis.hasAudio = true;
        analysis.type = 'audio';
      } else if (message.type === 'image') {
        analysis.hasImage = true;
        analysis.type = 'image';
      }
    }

    // Verificar presencia de texto
    if (message.body && message.body.trim()) {
      analysis.hasText = true;
      analysis.complexity = this.analyzeTextComplexity(message.body);
    }

    // Determinar tipo final
    if (analysis.hasImage && analysis.hasText) {
      analysis.type = 'mixed';
    } else if (analysis.hasAudio) {
      analysis.type = 'audio';
    } else if (analysis.hasImage) {
      analysis.type = 'image';
    } else {
      analysis.type = 'text';
    }

    return analysis;
  }

  /**
   * Actualiza las estadísticas de uso
   * @param {string} model - Modelo utilizado
   * @param {string} contentType - Tipo de contenido
   */
  updateUsageStats(model, contentType) {
    this.usageStats.totalRequests++;
    
    if (!this.usageStats.modelUsage[model]) {
      this.usageStats.modelUsage[model] = {
        count: 0,
        contentTypes: {}
      };
    }
    
    this.usageStats.modelUsage[model].count++;
    
    if (!this.usageStats.modelUsage[model].contentTypes[contentType]) {
      this.usageStats.modelUsage[model].contentTypes[contentType] = 0;
    }
    
    this.usageStats.modelUsage[model].contentTypes[contentType]++;

    // Calcular ahorro estimado (si se hubiera usado siempre gpt-4o)
    if (model === 'gpt-4o-mini') {
      this.usageStats.costSavings += 0.8; // Ahorro estimado por uso de modelo más barato
    }
  }

  /**
   * Cambia la estrategia de selección de modelos
   * @param {string} strategy - Nueva estrategia
   */
  setStrategy(strategy) {
    if (this.strategies[strategy]) {
      this.currentStrategy = strategy;
      logger.info(`Estrategia de modelos cambiada a: ${strategy} - ${this.strategies[strategy]}`);
    } else {
      logger.warn(`Estrategia desconocida: ${strategy}`);
    }
  }

  /**
   * Obtiene información sobre un modelo específico
   * @param {string} modelName - Nombre del modelo
   * @returns {Object} - Información del modelo
   */
  getModelInfo(modelName) {
    return this.models[modelName] || null;
  }

  /**
   * Obtiene la lista de modelos disponibles
   * @returns {Array} - Lista de modelos con su información
   */
  getAvailableModels() {
    return Object.keys(this.models).map(name => ({
      name,
      ...this.models[name]
    }));
  }

  /**
   * Obtiene estadísticas de uso del servicio
   * @returns {Object} - Estadísticas detalladas
   */
  getStats() {
    const modelPercentages = {};
    Object.keys(this.usageStats.modelUsage).forEach(model => {
      const count = this.usageStats.modelUsage[model].count;
      modelPercentages[model] = {
        count,
        percentage: ((count / this.usageStats.totalRequests) * 100).toFixed(1),
        contentTypes: this.usageStats.modelUsage[model].contentTypes
      };
    });

    return {
      currentStrategy: this.currentStrategy,
      totalRequests: this.usageStats.totalRequests,
      costSavings: this.usageStats.costSavings.toFixed(2),
      modelUsage: modelPercentages,
      availableStrategies: this.strategies,
      availableModels: Object.keys(this.models).length
    };
  }

  /**
   * Reinicia las estadísticas de uso
   */
  resetStats() {
    this.usageStats = {
      totalRequests: 0,
      modelUsage: {},
      costSavings: 0
    };
    logger.info('Estadísticas de uso reiniciadas');
  }

  /**
   * Obtiene recomendaciones de optimización
   * @returns {Array} - Lista de recomendaciones
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const stats = this.getStats();

    // Analizar uso de modelos
    if (stats.modelUsage['gpt-4o'] && stats.modelUsage['gpt-4o'].percentage > 70) {
      recommendations.push({
        type: 'cost_optimization',
        message: 'Considerar usar más gpt-4o-mini para tareas simples para reducir costos',
        impact: 'high'
      });
    }

    if (stats.totalRequests > 100 && stats.costSavings < 10) {
      recommendations.push({
        type: 'strategy_optimization',
        message: 'Cambiar a estrategia "cost_optimized" podría generar más ahorros',
        impact: 'medium'
      });
    }

    if (stats.totalRequests < 10) {
      recommendations.push({
        type: 'data_collection',
        message: 'Necesitas más datos de uso para optimizaciones precisas',
        impact: 'low'
      });
    }

    return recommendations;
  }
}

module.exports = ModelService;
