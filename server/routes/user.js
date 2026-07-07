const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.get('/me', auth, async (req, res) => {
  try {
    const getUser = db.prepare(`
      SELECT id, username, email, role, createdAt,
        quizzesPlayed, quizzesWon, totalPoints,
        (SELECT COUNT(*) FROM quizzes WHERE organizerId = users.id) as createdQuizzesCount
      FROM users WHERE id = ?
    `);

    const user = getUser.get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        quizzesPlayed: user.quizzesPlayed || 0,
        quizzesWon: user.quizzesWon || 0,
        totalPoints: user.totalPoints || 0,
      },
      createdQuizzesCount: user.createdQuizzesCount || 0,
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const getUser = db.prepare(`
      SELECT username, quizzesPlayed, quizzesWon, totalPoints
      FROM users WHERE id = ?
    `);

    const user = getUser.get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const getParticipated = db.prepare(`
      SELECT p.*, q.title
      FROM participants p
      JOIN quizzes q ON q.id = p.quizId
      WHERE p.userId = ? AND q.status = 'finished'
      ORDER BY p.finishedAt DESC
    `);

    const participatedQuizzes = getParticipated.all(req.user.userId);

    const getCreated = db.prepare(`
      SELECT id, title, status,
        (SELECT COUNT(*) FROM participants WHERE quizId = quizzes.id) as participantsCount
      FROM quizzes
      WHERE organizerId = ?
      ORDER BY createdAt DESC
    `);

    const createdQuizzes = getCreated.all(req.user.userId);

    res.json({
      username: user.username,
      stats: {
        quizzesPlayed: user.quizzesPlayed || 0,
        quizzesWon: user.quizzesWon || 0,
        totalPoints: user.totalPoints || 0,
      },
      participatedQuizzes: participatedQuizzes.map(p => ({
        id: p.quizId,
        title: p.title,
        score: p.score || 0,
        date: p.finishedAt || p.joinedAt,
      })),
      createdQuizzes: createdQuizzes.map(q => ({
        id: q.id,
        title: q.title,
        status: q.status,
        participantsCount: q.participantsCount || 0,
        date: q.createdAt,
      })),
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const getHistory = db.prepare(`
      SELECT
        q.id as quizId,
        q.title,
        q.category,
        u.username as organizerName,
        p.score,
        p.finishedAt,
        (SELECT COUNT(*) FROM participants WHERE quizId = q.id) as totalParticipants,
        (SELECT COUNT(*) FROM participants WHERE quizId = q.id AND score > p.score) as rank
      FROM participants p
      JOIN quizzes q ON q.id = p.quizId
      JOIN users u ON u.id = q.organizerId
      WHERE p.userId = ? AND q.status = 'finished'
      ORDER BY p.finishedAt DESC
    `);

    const history = getHistory.all(userId);

    res.json(history.map(h => ({
      quizId: h.quizId,
      title: h.title,
      category: h.category,
      organizer: h.organizerName,
      score: h.score || 0,
      rank: (h.rank || 0) + 1,
      totalParticipants: h.totalParticipants || 0,
      finishedAt: h.finishedAt,
    })));
  } catch (error) {
    console.error('❌ Get history error:', error);
    res.status(500).json({ error: 'Ошибка при получении истории' });
  }
});

module.exports = router;