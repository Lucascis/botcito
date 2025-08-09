const { sanitizeText } = require('../utils/sanitizer');
const { DEACTIVATE_REGEX, shouldDeactivate } = require('../utils/commands');
const MessageRouter = require('../services/router/MessageRouter');
const FileStorageService = require('../services/storage/FileStorageService');
const ChatSessionManager = require('../services/session/ChatSessionManager');
const { CONVERSATION_TTL_MS } = require('../utils/constants');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function run() {
  try {
    logger.info('🧪 Test utils: sanitizer');
    const input = '  \u0007Hola\u0008 Mundo  ';
    const cleaned = sanitizeText(input);
    if (cleaned !== 'Hola Mundo') throw new Error('sanitizeText falló');

    logger.info('🧪 Test utils: commands');
    const positives = [
      'desactivar conversación',
      'Detener chat',
      'salir',
      'stop bot',
      'exit'
    ];
    const negatives = ['hola', 'ayuda', 'activar'];
    positives.forEach(t => { if (!shouldDeactivate(t)) throw new Error(`shouldDeactivate debía ser true para: ${t}`); });
    negatives.forEach(t => { if (shouldDeactivate(t)) throw new Error(`shouldDeactivate debía ser false para: ${t}`); });
    if (!DEACTIVATE_REGEX.test('desactivar conversacion')) throw new Error('Regex no matchea sin acento');

    logger.info('🧪 Test utils: MessageRouter');
    const cases = [
      { msg: { type: 'ptt', hasMedia: true, body: '' }, expected: 'audio' },
      { msg: { type: 'image', hasMedia: true, body: '' }, expected: 'image' },
      { msg: { type: 'image', hasMedia: true, body: 'texto' }, expected: 'mixed' },
      { msg: { type: 'chat', hasMedia: false, body: 'hola' }, expected: 'text' }
    ];
    cases.forEach(({ msg, expected }) => {
      const type = MessageRouter.detectMediaType(msg);
      if (type !== expected) throw new Error(`MessageRouter: esperado ${expected}, obtenido ${type}`);
    });

    logger.info('🧪 Test utils: FileStorageService');
    const storage = new FileStorageService();
    const tempDir = storage.getTempDir();
    const b64 = Buffer.from('data de prueba').toString('base64');
    const filePath = storage.saveBase64File({ base64Data: b64, fromId: '+5491112345678', prefix: 'test_', extension: 'txt' });
    if (!fs.existsSync(filePath)) throw new Error('FileStorageService no guardó archivo');
    const content = fs.readFileSync(filePath, 'base64');
    if (content !== b64) throw new Error('Contenido del archivo no coincide');
    storage.cleanupFile(filePath);
    if (fs.existsSync(filePath)) throw new Error('FileStorageService no eliminó archivo');
    logger.info(`✅ FileStorageService OK (temp: ${tempDir})`);

    logger.info('🧪 Test utils: ChatSessionManager');
    const session = new ChatSessionManager({ maxMessagesPerMinute: 2 });
    const chatId = '123@c.us';
    session.activateConversation(chatId);
    if (!session.isConversationActive(chatId)) throw new Error('ChatSessionManager: isActive debería ser true');
    // Simular expiración de conversación
    session.activeConversations.set(chatId, Date.now() - (CONVERSATION_TTL_MS + 1000));
    if (session.isConversationActive(chatId)) throw new Error('ChatSessionManager: isActive debería expirar');
    // Rate limit
    const user = '5491112345678';
    if (!session.checkRateLimit(user)) throw new Error('Rate limit bloqueó antes de tiempo');
    if (!session.checkRateLimit(user)) throw new Error('Rate limit bloqueó antes de tiempo (2)');
    if (session.checkRateLimit(user)) throw new Error('Rate limit no bloqueó al exceder');

    logger.info('🎉 Todos los tests de utilidades pasaron');
    process.exit(0);
  } catch (e) {
    logger.error('❌ Error en tests de utilidades:', e);
    process.exit(1);
  }
}

run();


