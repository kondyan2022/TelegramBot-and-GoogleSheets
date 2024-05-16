require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const {
  Bot,
  webhookCallback,
  Keyboard,
  session,
  InlineKeyboard,
  GrammyError,
  HttpError,
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
  { command: "start", description: "Розпочати роботу з ботом" },
  { command: "help", description: "Довідкова інформація" },
]);

bot.command("start", async (ctx) => {
  console.log("start getting");
  const inlineKeyboard = new InlineKeyboard().text(
    "Натисни тут, щоб почати",
    "start_poll"
  );
  await ctx.reply(`Привіт\. Потрібно відповісти на декілька запитань\.`, {
    reply_markup: inlineKeyboard,
  });
});

bot.command("help", async (ctx) => {
  console.log("show help");
  await ctx.reply("Тут буде текст довідки");
});

bot.callbackQuery("start_poll", async (ctx) => {
  await ctx.callbackQuery.message.editText(
    `Привіт\. Потрібно відповісти на декілька запитань\.`,
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
  await ctx.reply(
    `Загальна кількість питань: ${ctx.session.questions.length}\.\n
  Дані будуть передані в обробку після відповіді на всі запитання\!`
  );
  for (const [index, question] of ctx.session.questions.entries()) {
    await ctx.reply(`Питання ${index + 1}: ${question}`);
    const answer = await conversation.waitFor(":text");
    answers.push(answer.msg.text);
  }
  ctx.session.answers = answers;
  ctx.session.endDate = Date.now();

  await ctx.reply("Дякую за відповіді!");
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

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error", e);
  }
});

// bot.start();
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`listening PORT=${PORT}`);
});

bot.api.setWebhook(process.env.URL);
