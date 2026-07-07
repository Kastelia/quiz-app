import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Login from '../Auth/Login';
import Register from '../Auth/Register';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className="container">
          <div className={styles.navContent}>
            <Link to="/" className={styles.brand}>
              <span className={styles.brandIcon}>🎯</span>
              <span className={styles.brandText}>QuizApp</span>
            </Link>

            <div className={styles.navLinks}>
              <Link to="/" className={styles.navLink}>Главная</Link>
              <Link to="/quizzes" className={styles.navLink}>Квизы</Link>
              {user?.role === 'organizer' && (
                <Link to="/create" className={styles.navLink}>Создать</Link>
              )}
              {isAuthenticated && (
                <Link to="/profile" className={styles.navLink}>Профиль</Link>
              )}
            </div>

            <div className={styles.navActions}>
              {isAuthenticated ? (
                <div className={styles.userMenu}>
                  <span className={styles.userName}>{user?.username}</span>
                  <button onClick={handleLogout} className={`btn btn-secondary ${styles.logoutBtn}`}>
                    Выйти
                  </button>
                </div>
              ) : (
                <div className={styles.authButtons}>
                  <button onClick={() => setShowLogin(true)} className={`btn btn-secondary ${styles.authBtn}`}>
                    Вход
                  </button>
                  <button onClick={() => setShowRegister(true)} className={`btn btn-primary ${styles.authBtn}`}>
                    Регистрация
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
      {showRegister && <Register onClose={() => setShowRegister(false)} />}
    </>
  );
};

export default Navbar;