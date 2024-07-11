const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');
const User = require('./Models/user');
const Task = require('./Models/task'); // Ensure this model is defined correctly
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN || "7304801715:AAHiRprM3NPh-aOtF6GT8dQvEwWQAE46_V0";
const mongoURI = process.env.MONGO_URI || "mongodb+srv://alambinary011:telegrambot@cluster0.wmezsvf.mongodb.net/";

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const startBot = () => {
  const bot = new TelegramBot(token, { polling: true });

  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code);
    console.error('Polling error details:', error);

    if (error.code === 'EFATAL') {
      console.error('Fatal error occurred. Restarting polling...');
      bot.stopPolling();
      setTimeout(() => {
        console.log('Restarting polling...');
        bot.startPolling();
      }, 10000);
    }
  });

  // Listen for /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Ready to conquer your tasks? Let's get started!`);
  });

  // Listen for /register command
  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    try {
      let user = await User.findOne({ userId });

      if (user) {
        bot.sendMessage(chatId, 'You are already registered.');
      } else {
        user = new User({ userId, username });
        await user.save();
        bot.sendMessage(chatId, 'Registration successful!');
      }
    } catch (err) {
      console.error('Error during registration:', err);
      bot.sendMessage(chatId, 'An error occurred. Please try again later.');
    }
  });

  // Middleware to check if user is registered
  const isAuthenticated = async (msg, callback) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const user = await User.findOne({ userId });

      if (user) {
        callback();
      } else {
        bot.sendMessage(chatId, 'You need to register first. Use /register.');
      }
    } catch (err) {
      console.error('Error during authentication:', err);
      bot.sendMessage(chatId, 'An error occurred. Please try again later.');
    }
  };

  // Create Task
  bot.onText(/\/create_task (\d+) (.+) (.+)/, (msg, match) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const taskID = parseInt(match[1]);
      const description = match[2];
      const dueDate = new Date(match[3]);

      // Check if a task with the same taskID already exists
      const existingTask = await Task.findOne({ taskID });
      if (existingTask) {
        bot.sendMessage(chatId, 'A task with the same ID already exists.');
        return;
      }

      const task = new Task({ userId, taskID, description, due_date: dueDate });

      try {
        await task.save();
        bot.sendMessage(chatId, 'Task created successfully.');
      } catch (err) {
        console.error('Error creating task:', err);
        bot.sendMessage(chatId, 'An error occurred. Please try again later.');
      }
    });
  });

  // Update Task
  bot.onText(/\/update_task (\d+) (.+) (.+)/, (msg, match) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const taskID = parseInt(match[1]);
      const newDescription = match[2];
      const newDueDate = new Date(match[3]);

      try {
        const task = await Task.findOneAndUpdate({ taskID }, { description: newDescription, due_date: newDueDate }, { new: true });

        if (task) {
          bot.sendMessage(chatId, 'Task updated successfully.');
        } else {
          bot.sendMessage(chatId, 'Task not found.');
        }
      } catch (err) {
        console.error('Error updating task:', err);
        bot.sendMessage(chatId, 'An error occurred. Please try again later.');
      }
    });
  });

  // Delete Task
  bot.onText(/\/delete_task (\d+)/, (msg, match) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const taskID = parseInt(match[1]);

      try {
        const task = await Task.findOneAndDelete({ taskID });

        if (task) {
          bot.sendMessage(chatId, 'Task deleted successfully.');
        } else {
          bot.sendMessage(chatId, 'Task not found.');
        }
      } catch (err) {
        console.error('Error deleting task:', err);
        bot.sendMessage(chatId, 'An error occurred. Please try again later.');
      }
    });
  });

  // List Tasks
  bot.onText(/\/list_tasks/, (msg) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        const tasks = await Task.find({ userId });

        if (tasks.length > 0) {
          const taskList = tasks.map(task => `ID: ${task.taskID}, Description: ${task.description}, Due Date: ${task.due_date}`).join('\n');
          bot.sendMessage(chatId, `Your tasks:\n${taskList}`);
        } else {
          bot.sendMessage(chatId, 'You have no tasks.');
        }
      } catch (err) {
        console.error('Error listing tasks:', err);
        bot.sendMessage(chatId, 'An error occurred. Please try again later.');
      }
    });
  });

  // Schedule reminders
  const scheduleReminders = () => {
    cron.schedule('*/1 * * * *', async () => { // Check every 1 minute
      const tasks = await Task.find({});
      const now = new Date();
      tasks.forEach(async (task) => {
        const dueDate = new Date(task.due_date);
        const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before due date
        if (reminderTime <= now && !task.reminded) {
          const user = await User.findOne({ userId: task.userId });
          if (user) {
            bot.sendMessage(user.userId, `Reminder: Your task "${task.description}" is due in 1 hour.`);
            task.reminded = true;
            await task.save();
          }
        }
      });
    });
  };

  // Schedule daily summary
  const scheduleDailySummary = () => {
    cron.schedule('0 0 * * *', async () => { // Every day at midnight
      const users = await User.find({});
      users.forEach(async (user) => {
        const tasks = await Task.find({ userId: user.userId, due_date: { $gte: new Date() } });
        if (tasks.length > 0) {
          const taskList = tasks.map(task => `ID: ${task.taskID}, Description: ${task.description}, Due Date: ${task.due_date}`).join('\n');
          bot.sendMessage(user.userId, `Daily Summary:\n${taskList}`);
        } else {
          bot.sendMessage(user.userId, 'You have no pending tasks.');
        }
      });
    });
  };

  // Start the scheduling functions
  scheduleReminders();
  scheduleDailySummary();

  // Confirm bot startup
  console.log('Bot is up and running...');
};

// Start the bot for the first time
startBot();
