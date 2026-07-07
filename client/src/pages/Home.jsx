import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Home.module.css';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Создавайте и проходите
            <span className={styles.gradientText}> интерактивные квизы в&nbsp;реальном времени</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Проверяйте знания, соревнуйтесь с друзьями и&nbsp;становитесь лучшими
          </p>
          <div className={styles.heroActions}>
            <button
              className={`btn btn-primary ${styles.heroBtn}`}
              onClick={() => navigate('/quizzes')}
            >
              Найти квиз
            </button>
            {user?.role === 'organizer' && (
              <button
                className={`btn btn-secondary ${styles.heroBtn}`}
                onClick={() => navigate('/create')}
              >
                Создать квиз
              </button>
            )}
          </div>
        </div>
        <div className={styles.heroIllustration}>
          <div className={styles.floatingCards}>
            <div className={`${styles.floatingCard} ${styles.card1}`}>
              <span>🏆</span>
              <p>Лидерборд</p>
            </div>
            <div className={`${styles.floatingCard} ${styles.card2}`}>
              <span>⚡</span>
              <p>Real-time</p>
            </div>
            <div className={`${styles.floatingCard} ${styles.card3}`}>
              <span>📊</span>
              <p>Статистика</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Возможности платформы</h2>
        <div className={styles.featuresGrid}>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>📝</div>
            <h3>Создание квизов</h3>
            <p>Настраивайте вопросы, категории, время и правила проведения</p>
          </div>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>👥</div>
            <h3>Подключение по коду</h3>
            <p>Участники присоединяются к квизу по уникальному коду комнаты</p>
          </div>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Режим реального времени</h3>
            <p>Вопросы отображаются синхронно для всех участников</p>
          </div>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>🏅</div>
            <h3>Система баллов</h3>
            <p>Автоматический подсчет очков и определение победителей</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;