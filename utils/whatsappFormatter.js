const logger = require('./logger');

/**
 * Utilidades para formatear mensajes para WhatsApp
 * Soporta formato de texto enriquecido compatible con WhatsApp
 */
class WhatsAppFormatter {
  
  /**
   * Formatea un mensaje general con emojis y estructura clara
   */
  static formatMessage(content, options = {}) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    let formatted = content;
    
    // Aplicar formato básico si está habilitado
    if (options.enhanceFormat !== false) {
      formatted = this.enhanceTextFormat(formatted);
    }
    
    // Agregar separadores si es necesario
    if (options.addSeparators) {
      formatted = this.addSeparators(formatted);
    }
    
    return formatted;
  }

  // (Removido) formatPetResponse, formatPetList

  /**
   * Formatea mensajes de confirmación
   */
  static formatSuccess(title, message, details = null) {
    let formatted = `✅ *${title}*\n\n${message}`;
    
    if (details) {
      formatted += "\n\n📋 *Detalles:*\n";
      if (typeof details === 'object') {
        Object.entries(details).forEach(([key, value]) => {
          formatted += `• ${key}: ${value}\n`;
        });
      } else {
        formatted += details;
      }
    }
    
    return formatted;
  }

  /**
   * Formatea mensajes de error
   */
  static formatError(title, message, suggestion = null) {
    let formatted = `❌ *${title}*\n\n${message}`;
    
    if (suggestion) {
      formatted += `\n\n💡 *Sugerencia:*\n${suggestion}`;
    }
    
    return formatted;
  }

  /**
   * Formatea resultados de búsqueda web
   */
  static formatWebSearchResult(query, result) {
    const header = `🔍 *Búsqueda: "${query}"*\n\n`;
    const content = this.enhanceTextFormat(result);
    const footer = "\n\n🌐 *Información obtenida de internet*";
    
    return header + content + footer;
  }

  /**
   * Mejora el formato de texto con emojis y estructura
   */
  static enhanceTextFormat(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let enhanced = text;
    
    // Convertir texto en negrita (markdown to WhatsApp)
    enhanced = enhanced.replace(/\*\*(.*?)\*\*/g, '*$1*');
    
    // Mejorar listas
    enhanced = enhanced.replace(/^- /gm, '• ');
    enhanced = enhanced.replace(/^\* /gm, '• ');
    
    // Agregar espacios después de títulos
    enhanced = enhanced.replace(/^(#{1,3})\s*(.+)$/gm, '*$2*\n');
    
    // Mejorar párrafos largos
    enhanced = enhanced.replace(/\n\n+/g, '\n\n');
    
    return enhanced;
  }

  /**
   * Agrega separadores visuales
   */
  static addSeparators(text) {
    const separator = "─".repeat(25);
    return `${separator}\n${text}\n${separator}`;
  }

  // (Removido) getPetEmoji

  /**
   * Formatea estadísticas del sistema
   */
  static formatStats(stats) {
    let formatted = "📊 *Estadísticas del Sistema*\n\n";
    
    if (stats.users) {
      formatted += "👥 *Usuarios:*\n";
      formatted += `• Total: ${stats.users.totalUsers || 0}\n`;
      formatted += `• Activos: ${stats.users.activeUsers || 0}\n`;
      formatted += `• Recientes: ${stats.users.recentUsers || 0}\n\n`;
    }
    
    // Sección de mascotas eliminada
    
    if (stats.system) {
      formatted += "⚙️ *Sistema:*\n";
      if (stats.system.uptime) {
        formatted += `• Tiempo activo: ${stats.system.uptime}\n`;
      }
      if (stats.system.totalMessages) {
        formatted += `• Mensajes totales: ${stats.system.totalMessages}\n`;
      }
      if (stats.system.avgMessagesPerUser) {
        formatted += `• Promedio por usuario: ${stats.system.avgMessagesPerUser}\n`;
      }
    }
    
    return formatted;
  }

  /**
   * Trunca texto si es muy largo para WhatsApp
   */
  static truncateIfNeeded(text, maxLength = require('./constants').MAX_TEXT_CHARS) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    const truncated = text.substring(0, maxLength - 100);
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = lastNewline > maxLength - 200 ? lastNewline : truncated.length;
    
    return truncated.substring(0, cutPoint) + 
           '\n\n✂️ *Mensaje truncado por longitud*\n' +
           `📏 Total: ${text.length} caracteres`;
  }
}

module.exports = WhatsAppFormatter;