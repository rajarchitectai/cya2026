const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fname:     { type: String, required: true, trim: true },
  lname:     { type: String, trim: true },
  cell:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
