import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (user?.role === 'organizer') {
        const quizzesRes = await api.get('/quiz/my');
        setMyQuizzes(quizzesRes.data);
      } else {
        const historyRes = await api.get('/user/history');
        setHistory(historyRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

const handleStartQuiz = async (quizId) => {
  try {
    const response = await api.post(`/quiz/start/${quizId}`);
    const roomCode = response.data.roomCode;

    alert(`✅ Квиз запущен! Код комнаты: ${roomCode}`);

    navigate(`/quiz/${roomCode}`);
    fetchData();
  } catch (error) {
    alert('❌ Ошибка при запуске квиза: ' + (error.response?.data?.error || error.message));
  }
};

  if (!user) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.profile}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className={styles.userInfo}>
          <h2>{user.username}</h2>
          <p className={styles.userEmail}>{user.email}</p>
          <span className={`${styles.roleBadge} ${styles[user.role]}`}>
            {user.role === 'organizer' ? 'Организатор' : 'Участник'}
          </span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statValue}>{user.stats?.quizzesPlayed || 0}</div>
          <div className={styles.statLabel}>Сыграно квизов</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statValue}>{user.stats?.quizzesWon || 0}</div>
          <div className={styles.statLabel}>Побед</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statValue}>{user.stats?.totalPoints || 0}</div>
          <div className={styles.statLabel}>Всего очков</div>
        </div>
      </div>

      {user.role === 'organizer' ? (
        <div className={styles.myQuizzes}>
          <h3>Мои квизы</h3>
          {loading ? (
            <p>Загрузка...</p>
          ) : myQuizzes.length === 0 ? (
            <p className={styles.emptyMessage}>Вы еще не создали ни одного квиза</p>
          ) : (
            <div className={styles.quizzesList}>
              {myQuizzes.map((quiz) => (
                <div key={quiz.id} className={`card ${styles.quizItem}`}>
                  <div className={styles.quizItemHeader}>
                    <h4>{quiz.title}</h4>
                    <span className={`${styles.statusBadge} ${styles[quiz.status]}`}>
                      {quiz.status === 'active' ? 'Активен' :
                       quiz.status === 'finished' ? 'Завершен' : 'Черновик'}
                    </span>
                  </div>
                  <p className={styles.quizItemMeta}>
                    Категория: {quiz.category} • Участников: {quiz.participantsCount || 0}
                  </p>
                  {quiz.status === 'active' && quiz.roomCode && (
                    <div className={styles.roomCodeDisplay}>
                      Код комнаты: <strong>{quiz.roomCode}</strong>
                    </div>
                  )}
                  {quiz.status === 'draft' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleStartQuiz(quiz.id)}
                      style={{ marginTop: '12px' }}
                    >
                      🚀 Запустить квиз
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.myQuizzes}>
          <h3>Моя история</h3>
          {loading ? (
            <p>Загрузка...</p>
          ) : history.length === 0 ? (
            <p className={styles.emptyMessage}>Вы еще не участвовали ни в одном квизе</p>
          ) : (
            <div className={styles.quizzesList}>
              {history.map((item) => (
                <div key={item.quizId} className={`card ${styles.quizItem}`}>
                  <div className={styles.quizItemHeader}>
                    <h4>{item.title}</h4>
                    <span className={`${styles.statusBadge} ${styles.finished}`}>
                      Завершен
                    </span>
                  </div>
                  <p className={styles.quizItemMeta}>
                    Категория: {item.category} • Организатор: {item.organizer}
                  </p>
                  <div className={styles.historyStats}>
                    <span>🏆 Место: {item.rank || '—'} из {item.totalParticipants || 0}</span>
                    <span>⭐ Очки: {item.score || 0}</span>
                  </div>
                  <p className={styles.quizItemMeta}>
                    {item.finishedAt ? new Date(item.finishedAt).toLocaleDateString('ru-RU') : 'Дата неизвестна'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;