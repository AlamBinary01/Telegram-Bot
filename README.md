# Telegram Task Management Bot

This bot helps users manage their tasks using Telegram. It connects to MongoDB to store user and task information and provides reminders and daily summaries.

## Requirements

- Node.js
- MongoDB
- Telegram bot token
- `.env` file with `TELEGRAM_BOT_TOKEN` and `MONGO_URI` variables

## Setup

1. Clone the repository.
2. Install the required dependencies:
    ```bash
    npm install node-telegram-bot-api mongoose node-cron dotenv
    ```
3. Create a `.env` file in the root directory with the following content:
    ```plaintext
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    MONGO_URI=your_mongodb_connection_string
    ```

## Usage

To start the bot, run the following command:
```bash
node index.js
