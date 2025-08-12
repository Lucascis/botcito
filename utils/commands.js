// utils/commands.js

// Regex unificada para detectar desactivación de conversación
// Incluye variantes comunes: "desactiva" (imperativo), "terminar", etc.
const DEACTIVATE_REGEX = /\b(desactivar|desactiva|detener|terminar|salir|stop|exit|chau)\s*(conversaci[oó]n|bot|chat)?\b/i;

function shouldDeactivate(text) {
  if (!text || typeof text !== 'string') return false;
  return DEACTIVATE_REGEX.test(text);
}

module.exports = { DEACTIVATE_REGEX, shouldDeactivate };


