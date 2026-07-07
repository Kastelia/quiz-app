import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from './QuizRoom.module.css';

const QuizRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, getSocket } = useSocket();

  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [participants, setParticipants] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [winners, setWinners] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // Проверка, является ли пользователь организатором
  const isOrganizer = user?.role === 'organizer';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const currentSocket = getSocket();
    if (!currentSocket || !isConnected) {
      console.log('⏳ Waiting for socket connection...');
      return;
    }

    if (hasJoinedRef.current) {
      console.log('ℹ️ Already joined this quiz, skipping...');
      return;
    }

    console.log('📡 Joining quiz with socket:', currentSocket.id);
    hasJoinedRef.current = true;

    currentSocket.emit('join-quiz', {
      roomCode,
      userId: user.id,
      username: user.username,
    });

    currentSocket.on('quiz-joined', (data) => {
      console.log('✅ Joined quiz:', data);
      setQuiz(data);
      setCurrentQuestion(data.currentQuestion);
      setQuestionIndex(data.currentQuestionIndex);
      setParticipants(data.participants || []);
    });

    currentSocket.on('new-question', (data) => {
      setCurrentQuestion(data);
      setQuestionIndex(data.index);
      setSelectedOptions([]);
      setIsAnswered(false);
      setTimeLeft(data.timeLimit || 30);
      setShowResults(false);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    currentSocket.on('participants-update', (data) => {
      setParticipants(data);
    });

    currentSocket.on('quiz-finished', (data) => {
      setIsFinished(true);
      setWinners(data.winners);
      setParticipants(data.allParticipants);
      setShowResults(true);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    currentSocket.on('error', (data) => {
      alert(data.message);
      if (data.message.includes('не найден') || data.message.includes('завершен')) {
        navigate('/quizzes');
      }
    });

    return () => {
      hasJoinedRef.current = false;
      currentSocket.off('quiz-joined');
      currentSocket.off('new-question');
      currentSocket.off('participants-update');
      currentSocket.off('quiz-finished');
      currentSocket.off('error');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomCode, user, navigate, isConnected, getSocket]);

  const handleTimeout = () => {
    if (!isAnswered) {
      handleSubmitAnswer([]);
    }
  };

  const handleOptionSelect = (optionIndex) => {
    if (isAnswered || isFinished) return;

    if (currentQuestion?.multipleChoice) {
      setSelectedOptions(prev => {
        if (prev.includes(optionIndex)) {
          return prev.filter(idx => idx !== optionIndex);
        } else {
          return [...prev, optionIndex];
        }
      });
    } else {
      setSelectedOptions([optionIndex]);
    }
  };

  const handleSubmitAnswer = (options = null) => {
    if (isAnswered) return;

    const currentSocket = getSocket();
    if (!currentSocket) return;

    const answerOptions = options !== null ? options : selectedOptions;

    currentSocket.emit('submit-answer', {
      quizId: quiz.quizId,
      questionIndex: questionIndex,
      selectedOptions: answerOptions,
    });

    setIsAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ✅ Функция для переключения на следующий вопрос (только организатор)
  const handleNextQuestion = () => {
    const currentSocket = getSocket();
    if (!currentSocket) return;

    currentSocket.emit('next-question', {
      quizId: quiz.quizId,
    });
  };

const getOptionClass = (index) => {
  // ✅ Если ответ уже отправлен - показываем правильные/неправильные
  if (isAnswered) {
    const isSelected = selectedOptions.includes(index);
    const question = currentQuestion;
    const isCorrect = question?.options[index]?.isCorrect;

    if (isSelected && isCorrect) return `${styles.option} ${styles.correct} ${styles.selected}`;
    if (isSelected && !isCorrect) return `${styles.option} ${styles.incorrect} ${styles.selected}`;
    if (isCorrect && question?.showCorrectAnswers) return `${styles.option} ${styles.correct}`;
    return `${styles.option} ${styles.disabled}`;
  }

  // ✅ ДО ОТВЕТА - подсвечиваем выбранный вариант
  const isSelected = selectedOptions.includes(index);
  if (isSelected) {
    return `${styles.option} ${styles.selected}`;
  }

  return styles.option;
};

  if (!quiz) {
    return <div className={styles.loading}>Подключение к квизу...</div>;
  }

  if (isFinished && showResults) {
    return (
      <div className={styles.results}>
        <div className={styles.resultsCard}>
          <h2>🎉 Квиз завершен!</h2>
          <h3>Победители</h3>
          <div className={styles.winnersList}>
            {winners.map((winner, index) => (
              <div key={index} className={styles.winnerItem}>
                <span className={styles.winnerPlace}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </span>
                <span className={styles.winnerName}>{winner.username}</span>
                <span className={styles.winnerScore}>{winner.score} очков</span>
              </div>
            ))}
          </div>

          <h3>Все участники</h3>
          <div className={styles.allParticipants}>
            {participants.map((p, index) => (
              <div key={index} className={styles.participantItem}>
                <span>{p.username}</span>
                <span>{p.score} очков</span>
              </div>
            ))}
          </div>

          <button className={`btn btn-primary ${styles.resultsBtn}`} onClick={() => navigate('/quizzes')}>
            К списку квизов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.room}>
      <div className={styles.roomHeader}>
        <h2>{quiz.title}</h2>
        <div className={styles.roomInfo}>
          <span className={styles.roomCode}>Код: {roomCode}</span>
          <span className={styles.questionCounter}>
            Вопрос {questionIndex + 1} из {quiz.totalQuestions}
          </span>
        </div>
      </div>

      <div className={styles.roomContent}>
        <div className={styles.questionArea}>
          {currentQuestion ? (
            <>
              <div className={styles.timerBar}>
                <div
                  className={styles.timerFill}
                  style={{ width: `${(timeLeft / (currentQuestion.timeLimit || 30)) * 100}%` }}
                />
                <span className={styles.timerText}>{timeLeft}с</span>
              </div>

              <div className={styles.questionCard}>
                <h3 className={styles.questionText}>{currentQuestion.questionText}</h3>

                {currentQuestion.type === 'image' && currentQuestion.imageUrl && (
                  <div className={styles.questionImage}>
                    <img src={currentQuestion.imageUrl} alt="Question" />
                  </div>
                )}

                <div className={styles.optionsGrid}>
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      className={getOptionClass(index)}
                      onClick={() => handleOptionSelect(index)}
                      disabled={isAnswered || isFinished}
                    >
                      <span className={styles.optionLabel}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className={styles.optionText}>{option.text}</span>
                    </button>
                  ))}
                </div>

                {!isAnswered && !isFinished && (
                  <button
                    className={`btn btn-primary ${styles.submitBtn}`}
                    onClick={() => handleSubmitAnswer()}
                    disabled={selectedOptions.length === 0}
                  >
                    Отправить ответ
                  </button>
                )}

                {isAnswered && (
                  <div className={styles.answerFeedback}>
                    <p>✅ Ответ отправлен!</p>
                  </div>
                )}

                {isOrganizer && !isFinished && (
                  <div style={{ marginTop: '20px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleNextQuestion}
                      style={{ width: '100%' }}
                    >
                      ➡️ Следующий вопрос
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.waiting}>
              <div className={styles.waitingSpinner} />
              <p>Ожидание начала квиза...</p>
              {isOrganizer && (
                <button
                  className="btn btn-primary"
                  onClick={handleNextQuestion}
                  style={{ marginTop: '20px' }}
                >
                  🚀 Начать первый вопрос
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.participantsArea}>
          <h3>Участники ({participants.length})</h3>
          <div className={styles.participantsList}>
            {participants.map((p, index) => (
              <div key={index} className={styles.participant}>
                <span className={styles.participantName}>{p.username}</span>
                <span className={styles.participantScore}>{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizRoom;