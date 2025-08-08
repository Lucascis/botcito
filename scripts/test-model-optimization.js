const ModelService = require('../services/modelService');
const logger = require('../utils/logger');

async function testModelOptimization() {
  try {
    logger.info('⚡ Iniciando pruebas de optimización de modelos...');
    
    const modelService = new ModelService();
    
    // Prueba 1: Verificar inicialización
    logger.info('\n📝 Prueba 1: Verificando inicialización del servicio...');
    const stats = modelService.getStats();
    
    if (stats.currentStrategy && stats.availableModels > 0) {
      logger.info('✅ ModelService inicializado correctamente');
      logger.info(`🎯 Estrategia actual: ${stats.currentStrategy}`);
      logger.info(`📊 Modelos disponibles: ${stats.availableModels}`);
      logger.info(`💰 Ahorros acumulados: $${stats.costSavings}`);
    } else {
      throw new Error('ModelService no se inicializó correctamente');
    }
    
    // Prueba 2: Verificar análisis de complejidad de texto
    logger.info('\n📝 Prueba 2: Verificando análisis de complejidad...');
    const complexityTests = [
      { text: 'Hola', expected: 'low' },
      { text: 'Por favor, ayúdame con mi tarea de matemáticas sobre funciones cuadráticas', expected: 'medium' },
      { text: 'Necesito que analices detalladamente este código Python y me expliques cada función, sus parámetros, valores de retorno, y me proporciones ejemplos de uso para cada una de las clases definidas en el módulo, incluyendo posibles mejoras de rendimiento y optimizaciones', expected: 'high' },
      { text: '', expected: 'low' },
      { text: 'Explica código Python', expected: 'medium' } // Contiene palabra clave de complejidad media
    ];
    
    complexityTests.forEach(test => {
      const result = modelService.analyzeTextComplexity(test.text);
      if (result === test.expected) {
        logger.info(`✅ Complejidad correcta para "${test.text.substring(0, 30)}...": ${result}`);
      } else {
        throw new Error(`Complejidad incorrecta para "${test.text}": esperado ${test.expected}, obtenido ${result}`);
      }
    });
    
    // Prueba 3: Verificar selección de modelos por tipo de contenido
    logger.info('\n📝 Prueba 3: Verificando selección de modelos por tipo...');
    const modelSelectionTests = [
      { contentType: 'text', options: { complexity: 'low' }, expectedModel: 'gpt-4o-mini' },
      { contentType: 'text', options: { complexity: 'high' }, expectedModel: 'gpt-4o' },
      { contentType: 'image', options: {}, expectedModel: 'gpt-4o' },
      { contentType: 'audio', options: {}, expectedModel: 'whisper-1' },
      { contentType: 'mixed', options: {}, expectedModel: 'gpt-4o' }
    ];
    
    modelSelectionTests.forEach(test => {
      const selectedModel = modelService.selectOptimalModel(test.contentType, test.options);
      if (selectedModel === test.expectedModel) {
        logger.info(`✅ Modelo correcto para ${test.contentType}: ${selectedModel}`);
      } else {
        throw new Error(`Modelo incorrecto para ${test.contentType}: esperado ${test.expectedModel}, obtenido ${selectedModel}`);
      }
    });
    
    // Prueba 4: Verificar cambio de estrategias
    logger.info('\n📝 Prueba 4: Verificando cambio de estrategias...');
    const strategies = ['cost_optimized', 'performance_optimized', 'balanced'];
    
    strategies.forEach(strategy => {
      modelService.setStrategy(strategy);
      const currentStats = modelService.getStats();
      
      if (currentStats.currentStrategy === strategy) {
        logger.info(`✅ Estrategia cambiada correctamente a: ${strategy}`);
        
        // Probar selección de modelo con nueva estrategia
        const textModel = modelService.selectTextModel('medium');
        logger.info(`  Modelo para texto medio con ${strategy}: ${textModel}`);
      } else {
        throw new Error(`Error cambiando estrategia a: ${strategy}`);
      }
    });
    
    // Restaurar estrategia balanced
    modelService.setStrategy('balanced');
    
    // Prueba 5: Verificar análisis de tipo de contenido
    logger.info('\n📝 Prueba 5: Verificando análisis de tipo de contenido...');
    const contentAnalysisTests = [
      {
        message: { body: 'Hola mundo', hasMedia: false, type: 'chat' },
        expected: { type: 'text', hasText: true, hasAudio: false, hasImage: false }
      },
      {
        message: { body: '', hasMedia: true, type: 'audio' },
        expected: { type: 'audio', hasText: false, hasAudio: true, hasImage: false }
      },
      {
        message: { body: '', hasMedia: true, type: 'image' },
        expected: { type: 'image', hasText: false, hasAudio: false, hasImage: true }
      },
      {
        message: { body: 'Descripción de imagen', hasMedia: true, type: 'image' },
        expected: { type: 'mixed', hasText: true, hasAudio: false, hasImage: true }
      }
    ];
    
    contentAnalysisTests.forEach((test, index) => {
      const analysis = modelService.analyzeContentType(test.message);
      
      let testPassed = true;
      Object.keys(test.expected).forEach(key => {
        if (analysis[key] !== test.expected[key]) {
          testPassed = false;
        }
      });
      
      if (testPassed) {
        logger.info(`✅ Análisis correcto para mensaje ${index + 1}: tipo ${analysis.type}`);
      } else {
        throw new Error(`Análisis incorrecto para mensaje ${index + 1}: esperado ${JSON.stringify(test.expected)}, obtenido ${JSON.stringify(analysis)}`);
      }
    });
    
    // Prueba 6: Verificar información de modelos
    logger.info('\n📝 Prueba 6: Verificando información de modelos...');
    const availableModels = modelService.getAvailableModels();
    
    if (availableModels.length >= 3) {
      logger.info(`✅ ${availableModels.length} modelos disponibles:`);
      availableModels.forEach(model => {
        logger.info(`  - ${model.name}: ${model.description}`);
      });
    } else {
      throw new Error('Número insuficiente de modelos disponibles');
    }
    
    // Prueba 7: Simular uso y verificar estadísticas
    logger.info('\n📝 Prueba 7: Simulando uso y verificando estadísticas...');
    
    // Simular múltiples selecciones de modelo
    for (let i = 0; i < 10; i++) {
      modelService.selectOptimalModel('text', { complexity: 'low' });
      modelService.selectOptimalModel('text', { complexity: 'high' });
      modelService.selectOptimalModel('image');
      modelService.selectOptimalModel('audio');
    }
    
    const finalStats = modelService.getStats();
    
    if (finalStats.totalRequests === 40) {
      logger.info(`✅ Estadísticas actualizadas: ${finalStats.totalRequests} solicitudes procesadas`);
      logger.info(`💰 Ahorros estimados: $${finalStats.costSavings}`);
      
      Object.keys(finalStats.modelUsage).forEach(model => {
        const usage = finalStats.modelUsage[model];
        logger.info(`  - ${model}: ${usage.count} usos (${usage.percentage}%)`);
      });
    } else {
      throw new Error(`Estadísticas incorrectas: esperado 40 solicitudes, obtenido ${finalStats.totalRequests}`);
    }
    
    // Prueba 8: Verificar recomendaciones
    logger.info('\n📝 Prueba 8: Verificando recomendaciones de optimización...');
    const recommendations = modelService.getOptimizationRecommendations();
    
    if (Array.isArray(recommendations)) {
      logger.info(`✅ ${recommendations.length} recomendaciones generadas:`);
      recommendations.forEach(rec => {
        logger.info(`  - ${rec.type}: ${rec.message} (impacto: ${rec.impact})`);
      });
    } else {
      throw new Error('Las recomendaciones no se generaron correctamente');
    }
    
    // Prueba 9: Reiniciar estadísticas
    logger.info('\n📝 Prueba 9: Verificando reinicio de estadísticas...');
    modelService.resetStats();
    const resetStats = modelService.getStats();
    
    if (resetStats.totalRequests === 0 && resetStats.costSavings === '0.00') {
      logger.info('✅ Estadísticas reiniciadas correctamente');
    } else {
      throw new Error('Error reiniciando estadísticas');
    }
    
    logger.info('\n🎉 ¡Todas las pruebas de optimización de modelos completadas exitosamente!');
    logger.info('🚀 El servicio está listo para optimizar el uso de modelos');
    
    logger.info('\n📊 Beneficios de la optimización:');
    logger.info('• Reducción de costos usando modelos apropiados para cada tarea');
    logger.info('• Mejor rendimiento con selección inteligente de modelos');
    logger.info('• Estadísticas detalladas para análisis de uso');
    logger.info('• Estrategias configurables según necesidades');
    logger.info('• Recomendaciones automáticas de optimización');
    
  } catch (error) {
    logger.error('❌ Error en las pruebas de optimización de modelos:', error);
    process.exit(1);
  }
}

// Verificar que estamos en el directorio correcto
if (!require('fs').existsSync('package.json')) {
  logger.error('❌ Ejecuta este script desde la raíz del proyecto');
  process.exit(1);
}

testModelOptimization();
