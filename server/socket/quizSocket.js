const db = require('../config/database');

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    console.log('📋 Socket handshake query:', socket.handshake.query);

    const userId = socket.handshake.query.userId;
    const userIdNum = userId ? parseInt(userId) : null;

socket.on('join-quiz', async ({ roomCode, userId, username }) => {
  try {
    console.log(`📡 [${socket.id}] User ${username} (${userId}) trying to join ${roomCode}`);

    const getQuiz = db.prepare(`
      SELECT q.*,
        (SELECT json_group_array(
          json_object(
            'id', qs.id,
            'questionData', qs.questionData,
            'questionIndex', qs.questionIndex
          )
        ) FROM questions qs WHERE qs.quizId = q.id ORDER BY qs.questionIndex) as questionsJson
      FROM quizzes q
      WHERE q.roomCode = ? AND q.status = 'active'
    `);

    const quiz = getQuiz.get(roomCode.toUpperCase());

    if (!quiz) {
      socket.emit('error', { message: 'Квиз не найден или не активен' });
      return;
    }

    let parsedQuestions = [];
    if (quiz.questionsJson) {
      try {
        const questionsArray = JSON.parse(quiz.questionsJson);
        parsedQuestions = questionsArray.map(q => ({
          id: q.id,
          ...JSON.parse(q.questionData),
          index: q.questionIndex
        }));
      } catch (e) {
        console.error('❌ Error parsing questions:', e);
        parsedQuestions = [];
      }
    }

    const userIdNum = parseInt(userId);
    const isOrganizer = quiz.organizerId === userIdNum;

    if (!isOrganizer) {
      const checkParticipant = db.prepare(`
        SELECT * FROM participants WHERE userId = ? AND quizId = ?
      `);
      const existingParticipant = checkParticipant.get(userIdNum, quiz.id);

      if (!existingParticipant) {
        const addParticipant = db.prepare(`
          INSERT INTO participants (userId, quizId, score, status, joinedAt)
          VALUES (?, ?, ?, ?, datetime('now'))
        `);
        addParticipant.run(userIdNum, quiz.id, 0, 'joined');
      }
    }

    socket.join(quiz.roomCode);
    socket.quizRoom = quiz.roomCode;
    socket.userId = userIdNum;
    socket.isOrganizer = isOrganizer;

    let currentQuestion = null;
    if (quiz.currentQuestionIndex >= 0 && quiz.currentQuestionIndex < parsedQuestions.length) {
      currentQuestion = parsedQuestions[quiz.currentQuestionIndex];
    }

    const getParticipants = db.prepare(`
      SELECT u.username, p.score
      FROM participants p
      JOIN users u ON u.id = p.userId
      WHERE p.quizId = ?
      ORDER BY p.score DESC
    `);
    const participants = getParticipants.all(quiz.id);

    socket.emit('quiz-joined', {
      quizId: quiz.id,
      title: quiz.title,
      totalQuestions: parsedQuestions.length,
      currentQuestionIndex: quiz.currentQuestionIndex,
      currentQuestion: currentQuestion ? {
        index: quiz.currentQuestionIndex,
        questionText: currentQuestion.questionText,
        type: currentQuestion.type || 'text',
        imageUrl: currentQuestion.imageUrl || '',
        options: currentQuestion.options || [],
        multipleChoice: currentQuestion.multipleChoice || false,
        timeLimit: currentQuestion.timeLimit || 30,
      } : null,
      participants: participants.map(p => ({
        username: p.username || 'Anonymous',
        score: p.score || 0,
      })),
    });

    const updatedParticipants = getParticipants.all(quiz.id);
    io.to(quiz.roomCode).emit('participants-update',
      updatedParticipants.map(p => ({
        username: p.username || 'Anonymous',
        score: p.score || 0,
      }))
    );

    console.log(`👤 User ${username} joined quiz ${quiz.title} (${quiz.roomCode})`);

  } catch (error) {
    console.error('❌ Join quiz error:', error);
    socket.emit('error', { message: 'Ошибка при подключении к квизу: ' + error.message });
  }
});

    socket.on('submit-answer', async ({ quizId, questionIndex, selectedOptions }) => {
      try {
        const getQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?');
        const quiz = getQuiz.get(quizId);

        if (!quiz) {
          socket.emit('error', { message: 'Квиз не найден' });
          return;
        }

        const getQuestion = db.prepare(`
          SELECT questionData FROM questions
          WHERE quizId = ? AND questionIndex = ?
        `);
        const questionRow = getQuestion.get(quizId, questionIndex);

        if (!questionRow) {
          socket.emit('error', { message: 'Вопрос не найден' });
          return;
        }

        const question = JSON.parse(questionRow.questionData);

        const checkAnswer = db.prepare(`
          SELECT * FROM answers a
          JOIN participants p ON p.id = a.participantId
          WHERE p.userId = ? AND p.quizId = ? AND a.questionIndex = ?
        `);
        const existingAnswer = checkAnswer.get(socket.userId, quizId, questionIndex);

        if (existingAnswer) {
          socket.emit('error', { message: 'Вы уже ответили на этот вопрос' });
          return;
        }

        let isCorrect = false;
        if (question.multipleChoice) {
          const correctOptions = question.options
            .map((opt, idx) => opt.isCorrect ? idx : -1)
            .filter(idx => idx >= 0);

          isCorrect = selectedOptions.length === correctOptions.length &&
            selectedOptions.every(idx => correctOptions.includes(idx));
        } else {
          isCorrect = selectedOptions.length === 1 &&
            question.options[selectedOptions[0]]?.isCorrect === true;
        }

        const points = isCorrect ? (question.points || 1) : 0;

        const getParticipant = db.prepare(`
          SELECT id FROM participants WHERE userId = ? AND quizId = ?
        `);
        const participant = getParticipant.get(socket.userId, quizId);

        if (!participant) {
          socket.emit('error', { message: 'Вы не участвуете в этом квизе' });
          return;
        }

        const addAnswer = db.prepare(`
          INSERT INTO answers (participantId, questionIndex, selectedOptions, isCorrect, points, answeredAt)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        addAnswer.run(
          participant.id,
          questionIndex,
          JSON.stringify(selectedOptions),
          isCorrect ? 1 : 0,
          points
        );

        const updateScore = db.prepare(`
          UPDATE participants
          SET score = score + ?
          WHERE userId = ? AND quizId = ?
        `);
        updateScore.run(points, socket.userId, quizId);

        if (points > 0) {
          const updateUserStats = db.prepare(`
            UPDATE users SET totalPoints = totalPoints + ? WHERE id = ?
          `);
          updateUserStats.run(points, socket.userId);
        }

        const getParticipants = db.prepare(`
          SELECT u.username, p.score
          FROM participants p
          JOIN users u ON u.id = p.userId
          WHERE p.quizId = ?
          ORDER BY p.score DESC
        `);
        const participantsData = getParticipants.all(quizId);

        io.to(quiz.roomCode).emit('participants-update',
          participantsData.map(p => ({
            username: p.username || 'Anonymous',
            score: p.score || 0,
          }))
        );

        socket.emit('answer-result', {
          isCorrect,
          points,
          correctAnswers: question.options
            .map((opt, idx) => opt.isCorrect ? idx : -1)
            .filter(idx => idx >= 0),
        });

        console.log(`✅ User ${socket.userId} answered question ${questionIndex} (${isCorrect ? 'correct' : 'wrong'})`);

      } catch (error) {
        console.error('❌ Submit answer error:', error);
        socket.emit('error', { message: 'Ошибка при отправке ответа' });
      }
    });

    socket.on('next-question', async ({ quizId }) => {
      try {
        const getQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?');
        const quiz = getQuiz.get(quizId);

        if (!quiz) {
          socket.emit('error', { message: 'Квиз не найден' });
          return;
        }

        if (quiz.organizerId !== socket.userId) {
          socket.emit('error', { message: 'Только организатор может управлять квизом' });
          return;
        }

        const getQuestionsCount = db.prepare(`
          SELECT COUNT(*) as count FROM questions WHERE quizId = ?
        `);
        const questionsCount = getQuestionsCount.get(quizId).count;

        const newIndex = quiz.currentQuestionIndex + 1;

        if (newIndex >= questionsCount) {
          const finishQuiz = db.prepare(`
            UPDATE quizzes
            SET status = 'finished', finishedAt = datetime('now')
            WHERE id = ?
          `);
          finishQuiz.run(quizId);

          const updateParticipants = db.prepare(`UPDATE participants
          SET status = 'finished', finishedAt = datetime('now')
          WHERE quizId = ?
          `);
          updateParticipants.run(quizId);

          const getAllParticipantsForStats = db.prepare(`
            SELECT p.userId, p.score,
              (SELECT MAX(score) FROM participants WHERE quizId = ?) as maxScore
            FROM participants p
            WHERE p.quizId = ?
          `);
          const allParticipantsForStats = getAllParticipantsForStats.all(quizId, quizId);

          for (const participant of allParticipantsForStats) {
            const updatePlayed = db.prepare(`
              UPDATE users SET quizzesPlayed = quizzesPlayed + 1 WHERE id = ?
            `);
            updatePlayed.run(participant.userId);

            if (participant.score === participant.maxScore && participant.score > 0) {
              const updateWon = db.prepare(`
                UPDATE users SET quizzesWon = quizzesWon + 1 WHERE id = ?
              `);
              updateWon.run(participant.userId);
            }
          }

          const getWinners = db.prepare(`
            SELECT u.username, p.score
            FROM participants p
            JOIN users u ON u.id = p.userId
            WHERE p.quizId = ?
            ORDER BY p.score DESC
            LIMIT 3
          `);
          const winners = getWinners.all(quizId);

          const getAllParticipants = db.prepare(`
            SELECT u.username, p.score
            FROM participants p
            JOIN users u ON u.id = p.userId
            WHERE p.quizId = ?
            ORDER BY p.score DESC
          `);
          const allParticipants = getAllParticipants.all(quizId);

          io.to(quiz.roomCode).emit('quiz-finished', {
            winners: winners.map(p => ({
              username: p.username || 'Anonymous',
              score: p.score || 0,
            })),
            allParticipants: allParticipants.map(p => ({
              username: p.username || 'Anonymous',
              score: p.score || 0,
            })),
          });

          return;
        }

        const updateQuiz = db.prepare(`
          UPDATE quizzes SET currentQuestionIndex = ? WHERE id = ?
        `);
        updateQuiz.run(newIndex, quizId);

        const getQuestion = db.prepare(`
          SELECT questionData FROM questions
          WHERE quizId = ? AND questionIndex = ?
        `);
        const questionRow = getQuestion.get(quizId, newIndex);
        const question = JSON.parse(questionRow.questionData);

        io.to(quiz.roomCode).emit('new-question', {
          index: newIndex,
          questionText: question.questionText,
          type: question.type || 'text',
          imageUrl: question.imageUrl || '',
          options: question.options || [],
          multipleChoice: question.multipleChoice || false,
          timeLimit: question.timeLimit || 30,
        });

        console.log(`📢 Question ${newIndex + 1} sent to room ${quiz.roomCode}`);

      } catch (error) {
        console.error('❌ Next question error:', error);
        socket.emit('error', { message: 'Ошибка при переходе к следующему вопросу' });
      }
    });

    socket.on('start-quiz', async ({ quizId }) => {
      try {
        const getQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?');
        const quiz = getQuiz.get(quizId);

        if (!quiz) {
          socket.emit('error', { message: 'Квиз не найден' });
          return;
        }

        if (quiz.organizerId !== socket.userId) {
          socket.emit('error', { message: 'Только организатор может запустить квиз' });
          return;
        }

        let roomCode = generateRoomCode();
        let exists = true;
        while (exists) {
          roomCode = generateRoomCode();
          const checkCode = db.prepare('SELECT id FROM quizzes WHERE roomCode = ?');
          const existing = checkCode.get(roomCode);
          exists = !!existing;
        }

        const updateQuiz = db.prepare(`
          UPDATE quizzes
          SET status = 'active', roomCode = ?, startedAt = datetime('now'), currentQuestionIndex = -1
          WHERE id = ?
        `);
        updateQuiz.run(roomCode, quizId);

        socket.join(roomCode);
        socket.quizRoom = roomCode;

        io.to(roomCode).emit('quiz-started', {
          roomCode,
          quizId: quiz.id,
          title: quiz.title,
          totalQuestions: (db.prepare('SELECT COUNT(*) as count FROM questions WHERE quizId = ?').get(quizId)).count,
        });

        console.log(`🚀 Quiz ${quiz.title} (${roomCode}) started by user ${socket.userId}`);

      } catch (error) {
        console.error('❌ Start quiz error:', error);
        socket.emit('error', { message: 'Ошибка при запуске квиза' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.quizRoom) {
        io.to(socket.quizRoom).emit('participant-left', { userId: socket.userId });
      }
    });
  });
};