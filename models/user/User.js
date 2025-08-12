const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../../utils/logger');
const { dbPath: configuredDbPath } = require('../../config');

class User {
  constructor() {
    this.dbPath = path.isAbsolute(configuredDbPath)
      ? configuredDbPath
      : path.resolve(path.join(__dirname, '../../'), configuredDbPath);
    this.initDatabase();
  }

  initDatabase() {
    const db = new sqlite3.Database(this.dbPath);
    
    db.serialize(() => {
      // Habilitar foreign keys para integridad
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA synchronous = NORMAL');
      
      // Tabla de usuarios
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT UNIQUE NOT NULL,
          name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          preferences TEXT DEFAULT '{}'
        )
      `);

      // Tabla de contextos de conversación
      db.run(`
        CREATE TABLE IF NOT EXISTS conversation_contexts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          channel TEXT NOT NULL,
          context_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Tabla de permisos (para futuras expansiones)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          module TEXT NOT NULL,
          permission TEXT NOT NULL,
          granted BOOLEAN DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Tabla de sesiones de WhatsApp persistentes
      db.run(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE NOT NULL,
          user_phone TEXT NOT NULL,
          session_data TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          metadata TEXT DEFAULT '{}'
        )
      `);
    });

    db.close();
  }

  async createUser(phoneNumber, name = null) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.run(
        'INSERT OR IGNORE INTO users (phone_number, name) VALUES (?, ?)',
        [phoneNumber, name],
        function(err) {
          if (err) {
            logger.error('Error creating user:', err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
          db.close();
        }
      );
    });
  }

  async getUserByPhone(phoneNumber) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.get(
        'SELECT * FROM users WHERE phone_number = ?',
        [phoneNumber],
        (err, row) => {
          if (err) {
            logger.error('Error getting user:', err);
            reject(err);
          } else {
            resolve(row);
          }
          db.close();
        }
      );
    });
  }

  async updateLastActive(userId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.run(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            logger.error('Error updating last active:', err);
            reject(err);
          } else {
            resolve();
          }
          db.close();
        }
      );
    });
  }

  async saveContext(userId, channel, contextData) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      // Eliminar contexto anterior si existe
      db.run(
        'DELETE FROM conversation_contexts WHERE user_id = ? AND channel = ?',
        [userId, channel],
        (err) => {
          if (err) {
            logger.error('Error deleting previous context:', err);
            reject(err);
            return;
          }
          
          // Insertar nuevo contexto
          db.run(
            'INSERT INTO conversation_contexts (user_id, channel, context_data) VALUES (?, ?, ?)',
            [userId, channel, JSON.stringify(contextData)],
            function(err) {
              if (err) {
                logger.error('Error saving context:', err);
                reject(err);
              } else {
                resolve(this.lastID);
              }
              db.close();
            }
          );
        }
      );
    });
  }

  async getContext(userId, channel) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.get(
        'SELECT context_data FROM conversation_contexts WHERE user_id = ? AND channel = ?',
        [userId, channel],
        (err, row) => {
          if (err) {
            logger.error('Error getting context:', err);
            reject(err);
          } else {
            resolve(row ? JSON.parse(row.context_data) : []);
          }
          db.close();
        }
      );
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.all(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY last_active DESC',
        (err, rows) => {
          if (err) {
            logger.error('Error getting all users:', err);
            reject(err);
          } else {
            resolve(rows);
          }
          db.close();
        }
      );
    });
  }

  /**
   * Ejecuta múltiples operaciones en una transacción
   * @param {Function} operations - Función que recibe db y callback
   * @returns {Promise} - Promise que resuelve con el resultado
   */
  async executeTransaction(operations) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            db.close();
            return reject(err);
          }

          try {
            operations(db, (err, result) => {
              if (err) {
                db.run('ROLLBACK', () => {
                  db.close();
                  reject(err);
                });
              } else {
                db.run('COMMIT', (commitErr) => {
                  db.close();
                  if (commitErr) {
                    reject(commitErr);
                  } else {
                    resolve(result);
                  }
                });
              }
            });
          } catch (error) {
            db.run('ROLLBACK', () => {
              db.close();
              reject(error);
            });
          }
        });
      });
    });
  }

  /**
   * Crea usuario y contexto inicial en una transacción
   * @param {string} phoneNumber - Número de teléfono
   * @param {string} name - Nombre del usuario
   * @param {string} channel - Canal inicial
   * @param {Object} initialContext - Contexto inicial
   * @returns {Promise} - Promise que resuelve con el usuario creado
   */
  async createUserWithContext(phoneNumber, name, channel, initialContext = {}) {
    return this.executeTransaction((db, callback) => {
      // Primero intentar crear el usuario
      db.run(
        'INSERT OR IGNORE INTO users (phone_number, name) VALUES (?, ?)',
        [phoneNumber, name],
        function(err) {
          if (err) {
            return callback(err);
          }

          // Obtener el ID del usuario (ya existente o recién creado)
          db.get(
            'SELECT id FROM users WHERE phone_number = ?',
            [phoneNumber],
            (err, user) => {
              if (err) {
                return callback(err);
              }

              if (!user) {
                return callback(new Error('User creation failed'));
              }

              // Crear contexto inicial si se proporcionó
              if (channel && Object.keys(initialContext).length > 0) {
                db.run(
                  'INSERT OR REPLACE INTO conversation_contexts (user_id, channel, context_data) VALUES (?, ?, ?)',
                  [user.id, channel, JSON.stringify(initialContext)],
                  function(contextErr) {
                    if (contextErr) {
                      return callback(contextErr);
                    }
                    callback(null, { id: user.id, phoneNumber, name, contextCreated: true });
                  }
                );
              } else {
                callback(null, { id: user.id, phoneNumber, name, contextCreated: false });
              }
            }
          );
        }
      );
    });
  }

  /**
   * Actualiza actividad del usuario y contexto en una transacción
   * @param {number} userId - ID del usuario
   * @param {string} channel - Canal
   * @param {Object} contextData - Datos del contexto
   * @returns {Promise} - Promise que resuelve cuando se completa
   */
  async updateUserActivityAndContext(userId, channel, contextData) {
    return this.executeTransaction((db, callback) => {
      // Actualizar última actividad
      db.run(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            return callback(err);
          }

          // Actualizar contexto
          db.run(
            'INSERT OR REPLACE INTO conversation_contexts (user_id, channel, context_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [userId, channel, JSON.stringify(contextData)],
            function(contextErr) {
              if (contextErr) {
                return callback(contextErr);
              }
              callback(null, { userId, updated: true });
            }
          );
        }
      );
    });
  }

  /**
   * Guarda o actualiza una sesión de WhatsApp
   * @param {string} sessionId - ID único de la sesión
   * @param {string} userPhone - Teléfono del usuario
   * @param {Object} sessionData - Datos de la sesión
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise} - Promise que resuelve cuando se guarda
   */
  async saveWhatsAppSession(sessionId, userPhone, sessionData, metadata = {}) {
    return this.executeTransaction((db, callback) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expira en 30 días

      db.run(
        `INSERT OR REPLACE INTO whatsapp_sessions 
         (session_id, user_phone, session_data, status, last_active, expires_at, metadata) 
         VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, ?, ?)`,
        [sessionId, userPhone, JSON.stringify(sessionData), expiresAt.toISOString(), JSON.stringify(metadata)],
        function(err) {
          if (err) {
            return callback(err);
          }
          callback(null, { sessionId, saved: true, rowId: this.lastID });
        }
      );
    });
  }

  /**
   * Recupera una sesión de WhatsApp activa
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise} - Promise que resuelve con los datos de la sesión
   */
  async getWhatsAppSession(sessionId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.get(
        `SELECT * FROM whatsapp_sessions 
         WHERE session_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP`,
        [sessionId],
        (err, row) => {
          db.close();
          if (err) {
            return reject(err);
          }
          
          if (!row) {
            return resolve(null);
          }

          try {
            resolve({
              id: row.id,
              sessionId: row.session_id,
              userPhone: row.user_phone,
              sessionData: JSON.parse(row.session_data),
              status: row.status,
              createdAt: row.created_at,
              lastActive: row.last_active,
              expiresAt: row.expires_at,
              metadata: JSON.parse(row.metadata || '{}')
            });
          } catch (parseError) {
            reject(new Error(`Error parsing session data: ${parseError.message}`));
          }
        }
      );
    });
  }

  /**
   * Obtiene todas las sesiones activas
   * @returns {Promise} - Promise que resuelve con array de sesiones
   */
  async getActiveWhatsAppSessions() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.all(
        `SELECT * FROM whatsapp_sessions 
         WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP 
         ORDER BY last_active DESC`,
        (err, rows) => {
          db.close();
          if (err) {
            return reject(err);
          }

          try {
            const sessions = rows.map(row => ({
              id: row.id,
              sessionId: row.session_id,
              userPhone: row.user_phone,
              sessionData: JSON.parse(row.session_data),
              status: row.status,
              createdAt: row.created_at,
              lastActive: row.last_active,
              expiresAt: row.expires_at,
              metadata: JSON.parse(row.metadata || '{}')
            }));
            resolve(sessions);
          } catch (parseError) {
            reject(new Error(`Error parsing sessions data: ${parseError.message}`));
          }
        }
      );
    });
  }

  /**
   * Marca una sesión como inactiva o corrupta
   * @param {string} sessionId - ID de la sesión
   * @param {string} reason - Razón de la invalidación
   * @returns {Promise} - Promise que resuelve cuando se invalida
   */
  async invalidateWhatsAppSession(sessionId, reason = 'manual') {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.run(
        `UPDATE whatsapp_sessions 
         SET status = 'invalid', metadata = json_set(metadata, '$.invalidation_reason', ?) 
         WHERE session_id = ?`,
        [reason, sessionId],
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve({ sessionId, invalidated: this.changes > 0, reason });
        }
      );
    });
  }

  /**
   * Actualiza la última actividad de una sesión
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise} - Promise que resuelve cuando se actualiza
   */
  async updateSessionActivity(sessionId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.run(
        'UPDATE whatsapp_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = ?',
        [sessionId],
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve({ sessionId, updated: this.changes > 0 });
        }
      );
    });
  }

  /**
   * Limpia sesiones expiradas o inválidas
   * @returns {Promise} - Promise que resuelve con estadísticas de limpieza
   */
  async cleanupExpiredSessions() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      
      db.run(
        `DELETE FROM whatsapp_sessions 
         WHERE status = 'invalid' OR expires_at < CURRENT_TIMESTAMP`,
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve({ deletedSessions: this.changes });
        }
      );
    });
  }
}

module.exports = User; 