const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

router.post('/create', auth, async (req, res) => {
  try {
    console.log('📝 Creating quiz for user:', req.user.userId);

    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Только организаторы могут создавать квизы' });
    }

    const { title, description, category, questions, settings } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'Добавьте хотя бы один вопрос' });
    }

    const insertQuiz = db.prepare(`
      INSERT INTO quizzes (
        title, description, category, organizerId, status, settings,
        currentQuestionIndex, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const settingsJson = JSON.stringify(settings || {});
    const result = insertQuiz.run(
      title,
      description || '',
      category,
      req.user.userId,
      'draft',
      settingsJson,
      -1
    );

    const quizId = result.lastInsertRowid;
    console.log('✅ Quiz created with ID:', quizId);

    const insertQuestion = db.prepare(`
      INSERT INTO questions (quizId, questionData, questionIndex)
      VALUES (?, ?, ?)
    `);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionJson = JSON.stringify({
        type: question.type || 'text',
        questionText: question.questionText,
        imageUrl: question.imageUrl || '',
        options: question.options || [],
        multipleChoice: question.multipleChoice || false,
        points: question.points || 1,
        timeLimit: question.timeLimit || 30,
      });

      insertQuestion.run(quizId, questionJson, i);
    }
    const updateStats = db.prepare(`UPDATE users SET createdQuizzes = COALESCE(createdQuizzes, 0) + 1 WHERE id = ?`);
updateStats.run(req.user.userId);

    const getQuiz = db.prepare(`
      SELECT q.*,
        (SELECT json_group_array(json_object(
          'id', qs.id,
          'questionData', qs.questionData,
          'questionIndex', qs.questionIndex
        )) FROM questions qs WHERE qs.quizId = q.id ORDER BY qs.questionIndex) as questionsJson
      FROM quizzes q
      WHERE q.id = ?
    `);

    const quiz = getQuiz.get(quizId);

    const parsedQuestions = quiz.questionsJson ?
      JSON.parse(quiz.questionsJson).map(q => ({
        id: q.id,
        ...JSON.parse(q.questionData),
        index: q.questionIndex
      })) : [];

    res.status(201).json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      status: quiz.status,
      settings: JSON.parse(quiz.settings || '{}'),
      questions: parsedQuestions,
      createdAt: quiz.createdAt,
    });

  } catch (error) {
    console.error('❌ Quiz creation error:', error);
    res.status(500).json({ error: 'Ошибка при создании квиза: ' + error.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const getQuizzes = db.prepare(`
      SELECT q.*,
        (SELECT COUNT(*) FROM participants p WHERE p.quizId = q.id) as participantsCount
      FROM quizzes q
      WHERE q.organizerId = ?
      ORDER BY q.createdAt DESC
    `);

    const quizzes = getQuizzes.all(req.user.userId);

    res.json(quizzes.map(q => ({
      ...q,
      settings: JSON.parse(q.settings || '{}'),
      participantsCount: q.participantsCount || 0,
    })));
  } catch (error) {
    console.error('❌ Get quizzes error:', error);
    res.status(500).json({ error: 'Ошибка при получении квизов' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const getActiveQuizzes = db.prepare(`
      SELECT q.*, u.username as organizerName,
        (SELECT COUNT(*) FROM participants p WHERE p.quizId = q.id) as participantsCount
      FROM quizzes q
      JOIN users u ON u.id = q.organizerId
      WHERE q.status = 'active'
      ORDER BY q.createdAt DESC
    `);

    const quizzes = getActiveQuizzes.all();

    res.json(quizzes.map(q => ({
      ...q,
      settings: JSON.parse(q.settings || '{}'),
      participants: q.participantsCount || 0,
      organizer: { username: q.organizerName },
    })));
  } catch (error) {
    console.error('❌ Get active quizzes error:', error);
    res.status(500).json({ error: 'Ошибка при получении активных квизов' });
  }
});

router.get('/room/:code', async (req, res) => {
  try {
    const getQuiz = db.prepare(`
      SELECT q.*, u.username as organizerName
      FROM quizzes q
      JOIN users u ON u.id = q.organizerId
      WHERE q.roomCode = ? AND q.status = 'active'
    `);

    const quiz = getQuiz.get(req.params.code.toUpperCase());

    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден' });
    }

    const getQuestions = db.prepare(`
      SELECT questionData, questionIndex
      FROM questions
      WHERE quizId = ?
      ORDER BY questionIndex
    `);

    const questions = getQuestions.all(quiz.id);

    res.json({
      ...quiz,
      settings: JSON.parse(quiz.settings || '{}'),
      questions: questions.map(q => ({
        ...JSON.parse(q.questionData),
        index: q.questionIndex,
      })),
      organizer: { username: quiz.organizerName },
    });
  } catch (error) {
    console.error('❌ Get room error:', error);
    res.status(500).json({ error: 'Ошибка при получении квиза' });
  }
});

router.post('/start/:id', auth, async (req, res) => {
  try {
    const quizId = req.params.id;

    const checkQuiz = db.prepare(`
      SELECT * FROM quizzes WHERE id = ? AND organizerId = ?
    `);
    const quiz = checkQuiz.get(quizId, req.user.userId);

    if (!quiz) {
      return res.status(404).json({ error: 'Квиз не найден или вы не являетесь организатором' });
    }

    let roomCode;
    let exists = true;
    while (exists) {
      roomCode = generateRoomCode();
      const checkCode = db.prepare('SELECT id FROM quizzes WHERE roomCode = ?');
      const existing = checkCode.get(roomCode);
      exists = !!existing;
    }

    const updateQuiz = db.prepare(`
      UPDATE quizzes
      SET status = 'active',
          roomCode = ?,
          startedAt = datetime('now'),
          currentQuestionIndex = -1
      WHERE id = ?
    `);
    updateQuiz.run(roomCode, quizId);

    res.json({
      success: true,
      roomCode: roomCode,
      quizId: quizId,
      message: 'Квиз успешно запущен! Код комнаты: ' + roomCode
    });

  } catch (error) {
    console.error('❌ Start quiz error:', error);
    res.status(500).json({ error: 'Ошибка при запуске квиза' });
  }
});

module.exports = router;