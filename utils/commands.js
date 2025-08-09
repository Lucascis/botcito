// utils/commands.js

// Regex unificada para detectar desactivación de conversación
const DEACTIVATE_REGEX = /\b(desactivar|detener|salir|stop|exit|chau)\s*(conversaci[oó]n|bot|chat)?\b/i;

function shouldDeactivate(text) {
  if (!text || typeof text !== 'string') return false;
  return DEACTIVATE_REGEX.test(text);
}

module.exports = { DEACTIVATE_REGEX, shouldDeactivate };


