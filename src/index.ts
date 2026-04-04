import "dotenv/config";
import { Telegraf } from "telegraf";
import { exec } from "child_process";
import { promisify } from "util";
import cron from "node-cron";

const EXEC_PROMISE = promisify(exec);
const ESCAPE_M2 = (text: string) =>
  text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");

const { BOT_TOKEN, GROUP_ID, ADMIN_ID } = process.env;
if (!BOT_TOKEN || !GROUP_ID || !ADMIN_ID) {
  throw new Error("ENV variables aren't configured!");
}

const bot = new Telegraf(BOT_TOKEN);
let lastMessageId: number | null = null;
const refreshProxy = async (): Promise<void> => {
  try {
    const sh = `
      DOMAIN="ya.ru"
      PORT="9443"

      IP=$(curl -s4 https://api.ipify.org)
      SECRET=$(docker run --rm nineseconds/mtg:2 generate-secret --hex $DOMAIN)
      
      docker rm -f mtproto-proxy >/dev/null 2>&1 || true

      docker run -d \
        --name mtproto-proxy \
        --restart always \
        -p $PORT:$PORT \
        nineseconds/mtg:2 \
        simple-run -n 1.1.1.1 -i prefer-ipv4 0.0.0.0:$PORT $SECRET

      echo "tg://proxy?server=$IP&port=$PORT&secret=$SECRET"
    `;

    const { stdout } = await EXEC_PROMISE(sh);

    const lines = stdout.trim().split("\n");
    const proxy = lines[lines.length - 1]?.trim();
    if (!proxy?.startsWith("tg://")) {
      console.log("Proxy generation failed:", stdout);
      return;
    }

    await bot.telegram.sendMessage(
      GROUP_ID,
      `*Fresh MTProto arrived\\!*\n\n` +
        `Location: NL 🇳🇱\n` +
        `Rotation In: 1h\n\n` +
        `\`${ESCAPE_M2(proxy)}\``,
      {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [[{ text: "Connect", url: proxy }]],
        },
      },
    );
  } catch (err) {
    console.error(err);
  }
};

// 0 * * * *
cron.schedule("*/2 * * * *", async () => {
  await refreshProxy();
});

bot.command("refresh", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    await ctx.reply("Not enough rights.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  const msg = await ctx.reply("Refreshing MTProto...", {
    reply_parameters: { message_id: ctx.message.message_id },
  });

  try {
    await refreshProxy();
    await ctx.deleteMessage(msg.message_id);
  } catch (err) {
    console.log(err);

    await ctx.reply("Server is not responding...");
  }
});

bot
  .launch()
  .then(() => {
    console.log("Bot now lives in NL!");

    refreshProxy();
  })
  .catch((err) => console.error(err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
