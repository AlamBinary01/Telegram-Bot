// Import required modules
const TelegramBot = require('node-telegram-bot-api'); // For interacting with Telegram
const mongoose = require('mongoose'); // For interacting with MongoDB
const cron = require('node-cron'); // For scheduling tasks
const User = require('./Models/user'); // User model (ensure it's defined correctly)
const Task = require('./Models/task'); // Task model (ensure it's defined correctly)
require('dotenv').config(); // Load environment variables

// Set up the bot token and MongoDB URI
const token = process.env.TELEGRAM_BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN_HERE";
const mongoURI = process.env.MONGO_URI || "YOUR_MONGO_URI_HERE";

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected')) // If connection is successful
  .catch(err => { // If there's an error
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process with an error
  });

// Function to start the bot
const startBot = () => {
  // Create a new Telegram bot instance
  const bot = new TelegramBot(token, { polling: true });

  // Handle polling errors
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code);
    console.error('Polling error details:', error);

    // If a fatal error occurs, restart polling
    if (error.code === 'EFATAL') {
      console.error('Fatal error occurred. Restarting polling...');
      bot.stopPolling();
      setTimeout(() => {
        console.log('Restarting polling...');
        bot.startPolling();
      }, 10000); // Wait for 10 seconds before restarting
    }
  });

  // Listen for /start command to welcome users
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Ready to conquer your tasks? Let's get started!`);
  });

  // Listen for /register command to register users
  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    try {
      // Check if user is already registered
      let user = await User.findOne({ userId });

      if (user) {
        bot.sendMessage(chatId, 'You are already registered.');
      } else {
        // Register new user
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
      // Check if user exists in the database
      const user = await User.findOne({ userId });

      if (user) {
        callback(); // If user is authenticated, execute the callback function
      } else {
        bot.sendMessage(chatId, 'You need to register first. Use /register.');
      }
    } catch (err) {
      console.error('Error during authentication:', err);
      bot.sendMessage(chatId, 'An error occurred. Please try again later.');
    }
  };

  // Listen for /create_task command to create tasks
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

      // Create a new task
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

  // Listen for /update_task command to update tasks
  bot.onText(/\/update_task (\d+) (.+) (.+)/, (msg, match) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const taskID = parseInt(match[1]);
      const newDescription = match[2];
      const newDueDate = new Date(match[3]);

      try {
        // Update the task
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

  // Listen for /delete_task command to delete tasks
  bot.onText(/\/delete_task (\d+)/, (msg, match) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const taskID = parseInt(match[1]);

      try {
        // Delete the task
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

  // Listen for /list_tasks command to list all tasks for a user
  bot.onText(/\/list_tasks/, (msg) => {
    isAuthenticated(msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        // Find all tasks for the user
        const tasks = await Task.find({ userId });

        if (tasks.length > 0) {
          // Format the task list
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

  // Schedule reminders for tasks
  const scheduleReminders = () => {
    cron.schedule('*/20 * * * *', async () => { // Check every 20 minute
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

  // Schedule daily summary of tasks

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
