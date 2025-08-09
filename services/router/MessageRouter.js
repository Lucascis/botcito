// services/router/MessageRouter.js

class MessageRouter {
  static detectMediaType(msg) {
    const hasAudio = msg.hasMedia && (msg.type === 'audio' || msg.type === 'ptt');
    const hasImage = msg.hasMedia && msg.type === 'image';
    const hasText = msg.body && typeof msg.body === 'string' && msg.body.trim();
    if (hasAudio) return 'audio';
    if (hasImage && hasText) return 'mixed';
    if (hasImage) return 'image';
    return 'text';
  }
}

module.exports = MessageRouter;


