import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './CreateQuiz.module.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 600;

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    category: '',
    questions: [],
    settings: {
      timePerQuestion: 30,
      showCorrectAnswers: true,
      shuffleQuestions: false,
    },
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'text',
    questionText: '',
    imageUrl: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    multipleChoice: false,
    points: 1,
    timeLimit: 30,
  });

  const handleQuizChange = (field, value) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, field, value) => {
    setCurrentQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, options: newOptions };
    });
  };

  const handleImageUpload = (file) => {
    if (!file) {
      alert('Пожалуйста, выберите файл');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert('❌ Изображение слишком большое! Максимальный размер: 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('❌ Пожалуйста, выберите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_IMAGE_WIDTH) {
          const ratio = MAX_IMAGE_WIDTH / width;
          width = MAX_IMAGE_WIDTH;
          height = Math.round(height * ratio);
        }
        if (height > MAX_IMAGE_HEIGHT) {
          const ratio = MAX_IMAGE_HEIGHT / height;
          height = MAX_IMAGE_HEIGHT;
          width = Math.round(width * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        setCurrentQuestion(prev => ({
          ...prev,
          imageUrl: compressedDataUrl,
        }));
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      alert('❌ Ошибка при чтении файла');
    };
    reader.readAsDataURL(file);
  };

  const addQuestion = () => {
    if (!currentQuestion.questionText.trim()) {
      alert('Введите текст вопроса');
      return;
    }

    if (currentQuestion.options.some(opt => !opt.text.trim())) {
      alert('Заполните все варианты ответов');
      return;
    }

    if (!currentQuestion.options.some(opt => opt.isCorrect)) {
      alert('Выберите правильный ответ');
      return;
    }

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { ...currentQuestion }],
    }));

    setCurrentQuestion({
      type: 'text',
      questionText: '',
      imageUrl: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      multipleChoice: false,
      points: 1,
      timeLimit: 30,
    });
  };

  const removeQuestion = (index) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (quiz.questions.length === 0) {
      alert('Добавьте хотя бы один вопрос');
      return;
    }

    setLoading(true);
    try {
      await api.post('/quiz/create', quiz);
      alert('✅ Квиз успешно создан!');
      navigate('/quizzes');
    } catch (error) {
      alert('❌ Ошибка при создании квиза: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.createQuiz}>
      <h2>Создание квиза</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.basicInfo}>
          <div className="form-group">
            <label>Название квиза *</label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => handleQuizChange('title', e.target.value)}
              required
              placeholder="Введите название"
            />
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea
              value={quiz.description}
              onChange={(e) => handleQuizChange('description', e.target.value)}
              rows="3"
              placeholder="Опишите ваш квиз"
            />
          </div>

          <div className="form-group">
            <label>Категория *</label>
            <select
              value={quiz.category}
              onChange={(e) => handleQuizChange('category', e.target.value)}
              required
            >
              <option value="">Выберите категорию</option>
              <option value="general">Общие знания</option>
              <option value="science">Наука</option>
              <option value="history">История</option>
              <option value="geography">География</option>
              <option value="entertainment">Развлечения</option>
              <option value="sports">Спорт</option>
              <option value="technology">Технологии</option>
            </select>
          </div>

          <div className="form-group">
            <label>Время на вопрос (секунды)</label>
            <input
              type="number"
              value={quiz.settings.timePerQuestion}
              onChange={(e) => setQuiz(prev => ({
                ...prev,
                settings: { ...prev.settings, timePerQuestion: parseInt(e.target.value) }
              }))}
              min="5"
              max="120"
            />
          </div>
        </div>

        <div className={styles.questionsSection}>
          <h3>Вопросы ({quiz.questions.length})</h3>

          <div className={styles.questionBuilder}>
            <div className={styles.questionForm}>
              <div className="form-group">
                <label>Тип вопроса</label>
                <select
                  value={currentQuestion.type}
                  onChange={(e) => handleQuestionChange('type', e.target.value)}
                >
                  <option value="text">📝 Текстовый</option>
                  <option value="image">🖼️ С изображением</option>
                </select>
              </div>

              <div className="form-group">
                <label>Текст вопроса *</label>
                <input
                  type="text"
                  value={currentQuestion.questionText}
                  onChange={(e) => handleQuestionChange('questionText', e.target.value)}
                  placeholder="Введите вопрос"
                />
              </div>

              {currentQuestion.type === 'image' && (
                <div className="form-group">
                  <label>Изображение для вопроса</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleImageUpload(file);
                      }
                    }}
                    style={{
                      display: 'block',
                      padding: '8px',
                      background: 'var(--bg-secondary)',
                      border: '2px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      width: '100%',
                    }}
                  />
                  {currentQuestion.imageUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '150px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion(prev => ({ ...prev, imageUrl: '' }))}
                        style={{
                          marginLeft: '12px',
                          background: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        × Удалить
                      </button>
                    </div>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                    Максимальный размер: 5MB • Рекомендуемый размер: 800×600
                  </p>
                </div>
              )}

              <div className="form-group">
                <label>Баллы за вопрос</label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => handleQuestionChange('points', parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>

              <div className={styles.optionsSection}>
                <label>Варианты ответов</label>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className={styles.optionRow}>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      placeholder={`Вариант ${index + 1}`}
                      className={styles.optionInput}
                    />
                    <label className={styles.correctLabel}>
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                      />
                      Правильный
                    </label>
                  </div>
                ))}
              </div>

              <div className={styles.questionActions}>
                <label>
                  <input
                    type="checkbox"
                    checked={currentQuestion.multipleChoice}
                    onChange={(e) => handleQuestionChange('multipleChoice', e.target.checked)}
                  />
                  Множественный выбор
                </label>
                <button type="button" className="btn btn-primary" onClick={addQuestion}>
                  + Добавить вопрос
                </button>
              </div>
            </div>
          </div>

          {quiz.questions.length > 0 && (
            <div className={styles.questionsList}>
              {quiz.questions.map((q, index) => (
                <div key={index} className={styles.questionItem}>
                  <div className={styles.questionItemHeader}>
                    <span className={styles.questionNumber}>#{index + 1}</span>
                    <span className={styles.questionType}>
                      {q.type === 'image' ? '🖼️' : '📝'}
                    </span>
                    <span className={styles.questionTextPreview}>{q.questionText}</span>
                    <span className={styles.questionPoints}>{q.points} балл</span>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeQuestion(index)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || quiz.questions.length === 0}
          style={{ width: '100%', marginTop: '24px' }}
        >
          {loading ? 'Создание...' : 'Создать квиз'}
        </button>
      </form>
    </div>
  );
};

export default CreateQuiz;