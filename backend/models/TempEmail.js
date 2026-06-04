const mongoose = require('mongoose');

const tempEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 24 * 60 * 60 * 1000) // 24 hours expiry
  }
});

module.exports = mongoose.model('TempEmail', tempEmailSchema);
