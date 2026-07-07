const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  answers: [{
    questionIndex: Number,
    selectedOptions: [Number],
    isCorrect: Boolean,
    points: Number,
    answeredAt: {
      type: Date,
      default: Date.now,
    },
  }],
  status: {
    type: String,
    enum: ['joined', 'playing', 'finished'],
    default: 'joined',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  finishedAt: Date,
});

module.exports = mongoose.model('Participant', ParticipantSchema);