/**
 * Servicio de alertas. En este ejemplo simplemente escribe a stderr, pero
 * podría integrarse con un servicio de correo electrónico, Slack u otra API.
 */
module.exports = {
  /**
   * Envía una alerta al canal configurado.
   * @param {string} msg Mensaje de alerta
   */
  alert: (msg) => {
    // Para este ejemplo, registrar en la salida de error
    console.error('[ALERTA]', msg);
    // Aquí se podría integrar con un webhook, email, etc.
  }
};
