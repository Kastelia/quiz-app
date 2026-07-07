import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Quizzes.module.css';

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await api.get('/quiz/active');
      setQuizzes(response.data);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQuiz = (e) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/quiz/${roomCode.toUpperCase()}`);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка квизов...</div>;
  }

  return (
    <div className={styles.quizzes}>
      <div className={styles.header}>
        <h2>Доступные квизы</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowJoinModal(true)}
        >
          Присоединиться по коду
        </button>
      </div>

      <div className={styles.quizzesGrid}>
        {quizzes.length === 0 ? (
          <div className={styles.empty}>
            <p>Нет активных квизов</p>
            <p className={styles.emptySub}>Создайте свой квиз или подождите, пока организатор запустит новый</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz._id} className={`card ${styles.quizCard}`}>
              <div className={styles.quizHeader}>
                <span className={styles.quizCategory}>{quiz.category}</span>
                <span className={styles.quizParticipants}>👥 {quiz.participants?.length || 0}</span>
              </div>
              <h3>{quiz.title}</h3>
              <p className={styles.quizDescription}>{quiz.description}</p>
              <div className={styles.quizFooter}>
                <span className={styles.quizOrganizer}>👤 {quiz.organizer?.username || 'Unknown'}</span>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/quiz/${quiz.roomCode}`)}
                >
                  Присоединиться
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showJoinModal && (
        <div className={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>Введите код комнаты</h3>
            <form onSubmit={handleJoinQuiz}>
              <input
                type="text"
                placeholder="Например: ABC123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={styles.codeInput}
              />
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Присоединиться
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quizzes;