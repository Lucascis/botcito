/**
 * Sanitiza el texto recibido eliminando caracteres no imprimibles y limitando
 * su longitud para evitar abusos. Devuelve una cadena segura para procesar.
 *
 * @param {string} text Texto de entrada.
 * @returns {string} Texto limpio y seguro.
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  // Eliminar caracteres de control ASCII
  let cleaned = text.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '');
  // Recortar espacios y limitar a 500 caracteres
  cleaned = cleaned.trim().substring(0, 500);
  return cleaned;
}

module.exports = { sanitizeText };
