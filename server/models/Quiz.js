const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image'],
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: function() { return this.type === 'image'; },
  },
  options: [{
    text: String,
    isCorrect: Boolean,
  }],
  multipleChoice: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    default: 1,
  },
  timeLimit: {
    type: Number,
    default: 30,
  },
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  category: {
    type: String,
    required: true,
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [QuestionSchema],
  settings: {
    timePerQuestion: { type: Number, default: 30 },
    showCorrectAnswers: { type: Boolean, default: true },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    passingScore: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'finished'],
    default: 'draft',
  },
  roomCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  currentQuestionIndex: {
    type: Number,
    default: -1,
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    score: { type: Number, default: 0 },
    answers: [{
      questionIndex: Number,
      selectedOptions: [Number],
      isCorrect: Boolean,
      points: Number,
    }],
    joinedAt: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: Date,
  finishedAt: Date,
});

QuizSchema.statics.generateRoomCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('Quiz', QuizSchema);