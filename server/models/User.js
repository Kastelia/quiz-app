const db = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  create: async (userData) => {
    const { username, email, password, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(username, email, hashedPassword, role || 'participant');
    return { id: info.lastInsertRowid };
  },

  findByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  findByUsername: (username) => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  updateStats: (userId, field, value) => {
    const stmt = db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`);
    return stmt.run(value, userId);
  },

  updateProfile: (userId, data) => {
    const { username, email } = data;
    const stmt = db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?');
    return stmt.run(username, email, userId);
  },

  comparePassword: async (user, password) => {
    return await bcrypt.compare(password, user.password);
  },

  findOne: (condition) => {
    const { email, username } = condition.$or ?
      condition.$or.reduce((acc, c) => ({ ...acc, ...c }), {}) :
      condition;

    if (email) {
      return User.findByEmail(email);
    }
    if (username) {
      return User.findByUsername(username);
    }
    return null;
  }
};

module.exports = User;