const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "chat.db");
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    avatar TEXT,
    room TEXT DEFAULT 'general'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    status TEXT DEFAULT 'Online',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS private_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE
  )`);
});

// Helper function for error handling
function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const dbHelpers = {
  // Message methods
  saveMessage: (message: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (text, sender, time, avatar, room) VALUES (?, ?, ?, ?, ?)`,
        [message.text, message.sender, message.time, message.avatar, message.room || "general"],
        (err: any) => (err ? reject(err) : resolve())
      );
    });
  },

  getMessages: (limit: number = 100): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM messages ORDER BY time DESC LIMIT ?`, [limit], (err: any, rows: any) =>
        err ? reject(err) : resolve(rows.reverse())
      );
    });
  },

  clearAllMessages: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM messages`, (err: any) => (err ? reject(err) : resolve()));
    });
  },

  // User methods
  saveUser: (user: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO users (username, status, last_seen) VALUES (?, ?, datetime('now'))`,
        [user.username, user.status],
        (err: any) => (err ? reject(err) : resolve())
      );
    });
  },

  getOnlineUsers: (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT username FROM users WHERE last_seen > datetime('now', '-5 minutes') ORDER BY username`,
        (err: any, rows: any) => (err ? reject(err) : resolve(rows))
      );
    });
  },

  findUserByEmail: (email: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE email = ?`, [email], (err: any, row: any) =>
        err ? reject(err) : resolve(row)
      );
    });
  },

  findUserByUsername: (username: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE username = ?`, [username], (err: any, row: any) =>
        err ? reject(err) : resolve(row)
      );
    });
  },

  createUser: (email: string, username: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (email, username, password) VALUES (?, ?, ?)`,
        [email, username, password],
        (err: any) => (err ? reject(err) : resolve())
      );
    });
  },

  // Private message methods
  savePrivateMessage: (message: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO private_messages (text, sender, receiver, time) VALUES (?, ?, ?, ?)`,
        [message.text, message.sender, message.receiver, message.time],
        (err: any) => (err ? reject(err) : resolve())
      );
    });
  },

  getPrivateMessages: (user1: string, user2: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM private_messages 
         WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) 
         ORDER BY time ASC`,
        [user1, user2, user2, user1],
        (err: any, rows: any) => (err ? reject(err) : resolve(rows))
      );
    });
  },
};

module.exports = { dbHelpers };
