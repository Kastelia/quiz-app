import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div className={styles.brand}>
              <span className={styles.brandIcon}>🎯</span>
              <span className={styles.brandText}>QuizApp</span>
            </div>
            <p className={styles.brandSlogan}>Интерактивные квизы в реальном времени</p>
          </div>

          <div className={styles.footerLinks}>
            <Link to="/">Главная</Link>
            <Link to="/quizzes">Квизы</Link>
            <Link to="/create">Создать</Link>
          </div>

          <div className={styles.footerCopy}>
            © 2026 QuizApp. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;