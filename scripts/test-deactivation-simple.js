const logger = require('../utils/logger');

async function testDeactivationRegex() {
  try {
    logger.info('🔍 Probando regex de desactivación...');
    
    const testTexts = [
      'desactivar conversación',
      'desactivar conversacion',
      'DESACTIVAR CONVERSACIÓN',
      'Desactivar conversación',
      'detener conversación',
      'salir',
      'stop bot',
      'exit chat',
      'hola como estas',
      'buscar información',
      'crear mascota'
    ];
    
    const regex = /\b(desactivar|detener|salir|stop|exit)\s*(conversaci[oó]n|bot|chat)\b/i;
    
    testTexts.forEach(text => {
      const shouldDeactivate = regex.test(text);
      logger.info(`"${text}" → ${shouldDeactivate ? '✅ DESACTIVAR' : '❌ NO DESACTIVAR'}`);
    });
    
    // Test específico del problema
    logger.info('\n🎯 Test específico:');
    const problemText = 'desactivar conversación';
    const result = regex.test(problemText);
    logger.info(`"${problemText}" → ${result ? '✅ DETECTADO' : '❌ NO DETECTADO'}`);
    
    // Test individual de partes del regex
    logger.info('\n🔍 Análisis del regex:');
    logger.info(`Palabra clave: ${/\b(desactivar|detener|salir|stop|exit)\b/i.test(problemText)}`);
    logger.info(`Palabra objetivo: ${/\b(conversaci[oó]n|bot|chat)\b/i.test(problemText)}`);
    logger.info(`Espacio entre palabras: ${/\s*/.test(' ')}`);
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error en test de regex:', error);
    process.exit(1);
  }
}

testDeactivationRegex();

