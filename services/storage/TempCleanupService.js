// services/storage/TempCleanupService.js
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { TEMP_MAX_AGE_MS } = require('../../utils/constants');

class TempCleanupService {
  constructor({ tempDir = process.env.TEMP_DIR || '/tmp/botcito', maxFileAgeMs = TEMP_MAX_AGE_MS } = {}) {
    this.tempDir = tempDir;
    this.maxFileAgeMs = maxFileAgeMs;
  }

  runOnce() {
    const now = Date.now();
    try {
      if (!fs.existsSync(this.tempDir)) return { deleted: 0, scanned: 0 };
      const entries = fs.readdirSync(this.tempDir).map(name => ({
        name,
        fullPath: path.join(this.tempDir, name)
      }));
      let deleted = 0;
      let scanned = 0;
      for (const entry of entries) {
        try {
          const stat = fs.statSync(entry.fullPath);
          scanned++;
          if (!stat.isFile()) continue;
          const age = now - stat.mtimeMs;
          if (age > this.maxFileAgeMs) {
            fs.unlinkSync(entry.fullPath);
            deleted++;
          }
        } catch (err) {
          logger.warn(`Error evaluando/eliminando temporal: ${entry.fullPath}: ${err.message}`);
        }
      }
      if (deleted > 0) {
        logger.info(`Limpieza de temporales: ${deleted} archivos eliminados (escaneados: ${scanned})`);
      } else {
        logger.debug(`Limpieza de temporales: 0 archivos eliminados (escaneados: ${scanned})`);
      }
      return { deleted, scanned };
    } catch (error) {
      logger.error('Error en limpieza de temporales:', error);
      return { deleted: 0, scanned: 0, error: error.message };
    }
  }
}

module.exports = TempCleanupService;


