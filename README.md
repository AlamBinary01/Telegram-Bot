[Telegram Testing Video.webm](https://github.com/AlamBinary01/Telegram-Bot/assets/86626270/1ba3b83d-df65-4498-9352-dcb022d5088a)# Telegram Task Management Bot

This bot helps users manage their tasks using Telegram. It connects to MongoDB to store user and task information and provides reminders and daily summaries.

## Requirements

- Node.js
- MongoDB
- Telegram bot token
- `.env` file with `TELEGRAM_BOT_TOKEN` and `MONGO_URI` variables

## Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/AlamBinary01/Telegram-Bot
    cd Telegram-Bot
    ```

2. **Install the required dependencies:**

    ```bash
    npm install node-telegram-bot-api mongoose node-cron dotenv
    ```

3. **Create a `.env` file in the root directory with the following content:**

    ```plaintext
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    MONGO_URI=your_mongodb_connection_string
    ```

4. **Ensure MongoDB is running:**

    Make sure you have MongoDB running either locally or use a cloud-based MongoDB service like MongoDB Atlas.

## Using the Bot on Telegram

### Start the bot:

Open your Telegram app, search for your bot (using the bot username you set up with BotFather), and click the "Start" button or send the `/start` command.

### Register yourself:

Send the `/register` command to register yourself with the bot.


### Create a task:

Use the `/create_task` command followed by the task ID, description, and due date. :

```plaintext
/create_task <task_id>  <task_description> <Date,time>"

```
### Update a task:

Use the `/update_task` command followed by the task ID, description, and due date. :

```plaintext
/update_task <task_id>  <task_description> <Date,time>"
```
### Delete a task:

Use the `/delete_task` command followed by the task ID:

```plaintext
/delete_task <task_id>  
```
### list of all  tasks:

Use the `/delete_task` command followed by the task ID. :

```plaintext
/delete_task <task_id>  
```


## Running the Bot

To start the bot, run the following command in your terminal:

```bash
node server.js
```
## Demmo Video
[Telegram Testing Video.webm](https://github.com/AlamBinary01/Telegram-Bot/assets/86626270/a9655921-0e10-4216-9d26-0653563df177)

