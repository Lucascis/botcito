// services/session/ChatSessionManager.js
const { RATE_LIMIT_PER_MINUTE, CONVERSATION_TTL_MS, RATE_LIMIT_ENTRY_TTL_MS } = require('../../utils/constants');

class ChatSessionManager {
  constructor({ maxMessagesPerMinute = RATE_LIMIT_PER_MINUTE } = {}) {
    this.activeConversations = new Map(); // chatId -> lastActivatedTs
    this.rateLimiter = new Map(); // userNumber -> { messages: number[], lastSeen: number }
    this.maxMessagesPerMinute = maxMessagesPerMinute;
  }

  activateConversation(chatId) {
    this.activeConversations.set(chatId, Date.now());
  }

  deactivateConversation(chatId) {
    this.activeConversations.delete(chatId);
  }

  isConversationActive(chatId) {
    const ts = this.activeConversations.get(chatId);
    if (!ts) return false;
    if (Date.now() - ts > CONVERSATION_TTL_MS) {
      this.activeConversations.delete(chatId);
      return false;
    }
    return true;
  }

  getActiveConversations() {
    return Array.from(this.activeConversations.keys());
  }

  checkRateLimit(userNumber) {
    const now = Date.now();
    
    // Obtener bucket existente o crear nuevo
    let bucket = this.rateLimiter.get(userNumber);
    if (!bucket) {
      bucket = { messages: [], lastSeen: now };
      this.rateLimiter.set(userNumber, bucket);
    }
    
    // Purga por minuto (atomica para evitar race conditions)
    const cutoffTime = now - 60000;
    bucket.messages = bucket.messages.filter((t) => t > cutoffTime);
    
    // TTL de entrada para evitar crecimiento indefinido
    if (now - bucket.lastSeen > RATE_LIMIT_ENTRY_TTL_MS) {
      bucket.messages = [];
    }
    
    // Verificar limite antes de agregar
    if (bucket.messages.length >= this.maxMessagesPerMinute) {
      return false;
    }
    
    // Agregar mensaje atomicamente
    bucket.messages.push(now);
    bucket.lastSeen = now;
    
    return true;
  }
}

module.exports = ChatSessionManager;


