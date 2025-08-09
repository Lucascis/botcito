/**
 * Sanitiza el texto recibido eliminando caracteres no imprimibles y limitando
 * su longitud para evitar abusos. Devuelve una cadena segura para procesar.
 *
 * @param {string} text Texto de entrada.
 * @returns {string} Texto limpio y seguro.
 */
const { MAX_TEXT_CHARS } = require('./constants');

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  // Eliminar caracteres de control ASCII
  // eslint-disable-next-line no-control-regex
  let cleaned = text.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '');
  // Recortar espacios y limitar a MAX_TEXT_CHARS
  cleaned = cleaned.trim().substring(0, MAX_TEXT_CHARS);
  return cleaned;
}

module.exports = { sanitizeText };
