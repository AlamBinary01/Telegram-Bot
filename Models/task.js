const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  taskID: { type: Number, required: true, unique: true },
  description: { type: String, required: true },
  due_date: { type: Date, required: true },
  reminded: { type: Boolean, default: true }
});

module.exports = mongoose.model('Task', taskSchema);
