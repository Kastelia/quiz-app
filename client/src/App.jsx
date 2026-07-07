import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Home from './pages/Home';
import Quizzes from './pages/Quizzes';
import CreateQuiz from './pages/CreateQuiz';
import Profile from './pages/Profile';
import QuizRoom from './pages/QuizRoom';
import './styles/global.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Загрузка...</div>;

  return user ? children : <Navigate to="/" />;
};

const OrganizerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Загрузка...</div>;

  return user && user.role === 'organizer' ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/quizzes" element={<Quizzes />} />
                <Route
                  path="/create"
                  element={
                    <OrganizerRoute>
                      <CreateQuiz />
                    </OrganizerRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  }
                />
                <Route path="/quiz/:roomCode" element={<QuizRoom />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;