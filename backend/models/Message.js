const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  tempEmailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TempEmail',
    required: true,
  },
  sender: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    default: '(No subject)'
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Message', messageSchema);
