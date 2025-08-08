const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../../utils/logger');

class User {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/users.db');
    this.initDatabase();
  }

  initDatabase() {
    const db = new sqlite3.Database(this.dbPath);
    
    db.serialize(() => {
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
}

module.exports = User; 