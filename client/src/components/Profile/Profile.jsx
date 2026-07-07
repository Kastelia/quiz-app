import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './Profile.module.css';

const Profile = () => {
  const { user } = useAuth();
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'organizer') {
      fetchMyQuizzes();
    }
  }, [user]);

  const fetchMyQuizzes = async () => {
    try {
      const response = await api.get('/quiz/my');
      setMyQuizzes(response.data);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setLoading(false);
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

      {user.role === 'organizer' && (
        <div className={styles.myQuizzes}>
          <h3>Мои квизы</h3>
          {loading ? (
            <p>Загрузка...</p>
          ) : myQuizzes.length === 0 ? (
            <p className={styles.emptyMessage}>Вы еще не создали ни одного квиза</p>
          ) : (
            <div className={styles.quizzesList}>
              {myQuizzes.map((quiz) => (
                <div key={quiz._id} className={`card ${styles.quizItem}`}>
                  <div className={styles.quizItemHeader}>
                    <h4>{quiz.title}</h4>
                    <span className={`${styles.statusBadge} ${styles[quiz.status]}`}>
                      {quiz.status === 'active' ? 'Активен' :
                       quiz.status === 'finished' ? 'Завершен' : 'Черновик'}
                    </span>
                  </div>
                  <p className={styles.quizItemMeta}>
                    Категория: {quiz.category} • Участников: {quiz.participants?.length || 0}
                  </p>
                  {quiz.status === 'active' && quiz.roomCode && (
                    <div className={styles.roomCodeDisplay}>
                      Код комнаты: <strong>{quiz.roomCode}</strong>
                    </div>
                  )}
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