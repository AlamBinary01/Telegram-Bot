const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  userId: { type: Number, unique: true },
  username: String,
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
