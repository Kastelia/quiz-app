const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);

    const { username, email, password, role } = req.body;

    const existingUser = await User.findByEmail(email) || await User.findByUsername(username);

    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        error: 'Пользователь с таким email или именем уже существует'
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'participant',
    });

    console.log('✅ User created:', user.id);

    const token = jwt.sign(
      { userId: user.id, role: role || 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const newUser = await User.findById(user.id);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации: ' + error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('🔑 Login attempt:', req.body.email);

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isValid = await User.comparePassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    console.log('📋 Getting user data for:', req.user.userId);

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      stats: {
        quizzesPlayed: user.quizzesPlayed || 0,
        quizzesWon: user.quizzesWon || 0,
        totalPoints: user.totalPoints || 0,
      },
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
  }
});

module.exports = router;