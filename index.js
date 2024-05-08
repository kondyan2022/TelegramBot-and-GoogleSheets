require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const { Bot, webhookCallback } = require("grammy");

const bot = new Bot(process.env.BOT_API_KEY);

const app = express();
app.use(logger("tiny"));
app.use(express.json());
app.use(webhookCallback(bot, "express"));

bot.command("start", async (ctx) => {
  await ctx.reply("hello! I'am bot ");
});

bot.on("message", async (ctx) => {
  await ctx.reply("thinking...");
});

// bot.start();
const PORT = process.env.PORT;
app.listen(3000, () => {
  console.log(`listetning PORT=${PORT}`);
});

bot.api.setWebhook(process.env.URL);
