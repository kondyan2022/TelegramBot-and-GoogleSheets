require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const {
  Bot,
  webhookCallback,
  Keyboard,
  session,
  InlineKeyboard,
} = require("grammy");
const bot = new Bot(process.env.BOT_API_KEY);

const doc = require("./spreadsheet");
const {
  conversations,
  createConversation,
} = require("@grammyjs/conversations");
const { hydrate } = require("@grammyjs/hydrate");

const app = express();
app.use(logger("tiny"));
app.use(express.json());
app.use(webhookCallback(bot, "express"));

function createInitialSessionData() {
  return {
    user: "",
    id: 0,
    questions: [],
    answers: [],
    startDate: null,
    endDate: null,
    finish: false,
  };
}
bot.use(hydrate());
bot.use(session({ initial: createInitialSessionData }));
bot.use(conversations());
bot.use(createConversation(poll));

bot.api.setMyCommands([
  { command: "start", description: "Start bot" },
  { command: "help", description: "Show help" },
]);

bot.command("start", async (ctx) => {
  console.log("start getting");
  const inlineKeyboard = new InlineKeyboard().text("Start", "start_poll");
  await ctx.reply("Hello. You need to answer a few questions", {
    reply_markup: inlineKeyboard,
  });
});

bot.command("help", async (ctx) => {
  console.log("show help");
  await ctx.reply("Help context show here");
});

bot.callbackQuery("start_poll", async (ctx) => {
  await ctx.callbackQuery.message.editText(
    "Hello. You need to answer a few questions",
    {}
  );
  ctx.session.user = ctx.from.username;
  ctx.session.id = ctx.from.id;
  await ctx.conversation.enter("poll");
});

async function poll(conversation, ctx) {
  ctx.session.questions = await getQuestions();
  ctx.session.startDate = Date.now();
  const answers = [];
  for (const [index, question] of ctx.session.questions.entries()) {
    await ctx.reply(`Question ${index + 1}: ${question}`);
    const answer = await conversation.waitFor(":text");
    answers.push(answer.msg.text);
  }
  ctx.session.answers = answers;
  ctx.session.endDate = Date.now();

  await ctx.reply("Thank you for your answers!");
  await setAnswers(ctx);
}

async function getQuestions() {
  const sheet = doc.sheetsByTitle["questions"];
  const rows = await sheet.getRows();
  return rows.map((row) => row.get("text"));
}

async function setAnswers(ctx) {
  const sheet = doc.sheetsByTitle["answers"];
  const { user, id, startDate, endDate, answers } = ctx.session;
  const rowData = {
    user,
    id,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };
  for (const [index, answer] of answers.entries()) {
    rowData[(index + 1).toString()] = answer;
  }
  const newRow = await sheet.addRow(rowData);
  newRow.save();
}

// bot.on("message", async (ctx) => {
//   // const sheet = doc.sheetsByTitle["questions"];
//   // await sheet.loadCells();
//   // const rows = await sheet.getRows();
//   // const cell = sheet.getCell(1, 0);
//   // await ctx.reply(`${cell.value} ${rows.length}`);
// });

// bot.start();
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`listening PORT=${PORT}`);
});

bot.api.setWebhook(process.env.URL);
