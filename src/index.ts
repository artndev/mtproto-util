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
  throw new Error("ENV variables aren't configured");
}

const bot = new Telegraf(BOT_TOKEN);
const refreshProxy = async (): Promise<void> => {
  try {
    const sh = `
      DOMAIN="ya.ru"
      PORT="9443"

      SECRET=$(docker run --rm nineseconds/mtg:2 generate-secret --hex $DOMAIN)
      IP=$(curl -s4 -m 3 https://api.ipify.org || \
           curl -s4 -m 3 https://ifconfig.me || \
           curl -s4 -m 3 https://checkip.amazonaws.com || \
           echo "0.0.0.0")
      if [ "$IP" = "0.0.0.0" ]; then
        echo "Couldn't retrieve IP from providers."
        exit 1
      fi

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
    const proxy = lines.find(line => line.trim().startsWith("tg://"));
    if (!proxy) {
      console.log("Proxy is failed: ", stdout);
      return;
    }

    await bot.telegram.sendMessage(
      GROUP_ID,
      `*Fresh MTProto arrived\\!*\n\n` +
        `Location: NL 🇳🇱\n` +
        `Rotation In: 30m\n\n` +
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

bot.command("refresh", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    await ctx.reply("Not enough rights!", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  const msg = await ctx.reply("Refreshing MTProto... please wait ~10s =)", {
    reply_parameters: { message_id: ctx.message.message_id },
  });

  refreshProxy()
    .then(async () => {
      try {
        await ctx.deleteMessage(msg.message_id);
      } catch (err) {}
    })
    .catch(async (err) => {
      console.error(err);

      await ctx.reply("Server is not responding...");
    });
});

(async () => {
  try {
    bot.launch().catch((err) => {
      console.log(err)

      process.exit(1);
    });

    refreshProxy();

    cron.schedule("*/30 * * * *", async () => {
      refreshProxy().catch((err) => console.error(err));
    });
  } catch (err) {
    console.error(err);
  }
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
