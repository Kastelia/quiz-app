const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../quiz.db'));

db.exec(`
  -- Пользователи
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'participant',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    quizzesPlayed INTEGER DEFAULT 0,
    quizzesWon INTEGER DEFAULT 0,
    totalPoints INTEGER DEFAULT 0,
    createdQuizzes INTEGER DEFAULT 0
  );

  -- Квизы
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    organizerId INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    roomCode TEXT UNIQUE,
    currentQuestionIndex INTEGER DEFAULT -1,
    settings TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    startedAt DATETIME,
    finishedAt DATETIME,
    FOREIGN KEY (organizerId) REFERENCES users(id)
  );

  -- Вопросы
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quizId INTEGER NOT NULL,
    questionData TEXT NOT NULL,
    questionIndex INTEGER NOT NULL,
    FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  -- Участники
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    quizId INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'joined',
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    finishedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (quizId) REFERENCES quizzes(id)
  );

  -- Ответы участников
  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participantId INTEGER NOT NULL,
    questionIndex INTEGER NOT NULL,
    selectedOptions TEXT,
    isCorrect BOOLEAN,
    points INTEGER DEFAULT 0,
    answeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participantId) REFERENCES participants(id)
  );
`);

console.log('✅ SQLite database initialized');
module.exports = db;