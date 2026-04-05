import "dotenv/config";
import { Telegraf } from "telegraf";
import { Scheduler } from "./scheduler.js";

const { BOT_TOKEN, GROUP_ID, ADMIN_ID } = process.env;
if (!BOT_TOKEN || !GROUP_ID || !ADMIN_ID) {
  throw new Error("❌ ENV variables are missing");
}

const bot = new Telegraf(BOT_TOKEN);
const scheduler = new Scheduler(bot, GROUP_ID, 30);

bot.command("refresh", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    await ctx.reply("⚠️ Not enough rights.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  const msg = await ctx.reply("🔄 Refreshing MTProto ~10s...", {
    parse_mode: "HTML",
    reply_parameters: { message_id: ctx.message.message_id },
  });

  scheduler
    .rotate()
    .then(async () => {
      await ctx.deleteMessage(msg.message_id).catch(() => {});
    })
    .catch(async (err) => {
      console.error(err);

      await ctx.reply("❌ Server is not responding...");
    });
});

bot.command("delay", async (ctx) => {
  await ctx.reply("🔄 Set the scheduler interval in minutes:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "10s (ONLY FOR TESTING)", callback_data: "delay:s:10" }],
        [
          { text: "5m", callback_data: "delay:m:5" },
          { text: "15m", callback_data: "delay:m:15" },
          { text: "30m", callback_data: "delay:m:30" },
        ],
        [
          { text: "1h", callback_data: "delay:h:1" },
          { text: "2h", callback_data: "delay:h:2" },
          { text: "3h", callback_data: "delay:h:3" },
        ],
        [{ text: "6h", callback_data: "delay:h:6" }],
      ],
    },
  });
});

bot.action(/delay:(s|m|h):(\d+)/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    ctx.answerCbQuery("⚠️ Not enough rights.");
    return;
  }

  const type = ctx.match[1];
  const value = Number(ctx.match[2]);
  if (isNaN(value)) {
    ctx.answerCbQuery(
      "⚠️ Pass the actual number representing your interval in minutes.",
    );
    return;
  }

  if (type === "s") {
    scheduler.schedule({ seconds: value });
  } else if (type === "m") {
    scheduler.schedule({ minutes: value });
  } else {
    scheduler.schedule({ hours: value })
  }

  await ctx.editMessageText(
    `✅ Scheduler interval was updated to ${value}${type}.`,
    { parse_mode: "HTML" },
  );

  setTimeout(async () => {
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (err) {
      console.error(err);

      await ctx.reply("❌ Server is not responding...");
    }
  }, 2500);
});

(async () => {
  try {
    bot.launch().catch((err) => {
      console.log(err);

      process.exit(1);
    });

    scheduler.init();
  } catch (err) {
    console.error(err);

    process.exit(1);
  }
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
