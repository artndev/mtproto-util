import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { exec } from 'child_process';
import { promisify } from 'util';
import cron from 'node-cron';

const EXEC_PROMISE = promisify(exec);
const ESCAPE_M2 = (text: string) => text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

const { BOT_TOKEN, GROUP_ID, ADMIN_ID } = process.env;
if (!BOT_TOKEN || !GROUP_ID || !ADMIN_ID) {
  throw new Error("ENV variables aren't configured!");
}

const bot = new Telegraf(BOT_TOKEN);
let lastMessageId: number | null = null;
const refreshProxy = async (): Promise<void> => {
  try {
    const sh = `
      SECRET=$(openssl rand -hex 16)
      DOMAIN="github.com"
      PORT="9443"
      
      docker stop mtproto-proxy >/dev/null 2>&1 || true
      docker rm mtproto-proxy >/dev/null 2>&1 || true
      
      docker run -d --name mtproto-proxy --restart always -p $PORT:$PORT \\
        nineseconds/mtg:2 run -n 1.1.1.1 -t $DOMAIN 0.0.0.0:$PORT $SECRET
        
      IP=$(curl -s https://api.ipify.org)
      echo "tg://proxy?server=$IP&port=$PORT&secret=ee$SECRET$(echo -n $DOMAIN | xxd -p)"
    `;

    const { stdout } = await EXEC_PROMISE(sh);
    const proxy = stdout.trim();

    if (lastMessageId) {
      try {
        await bot.telegram.deleteMessage(GROUP_ID, lastMessageId);
      } catch (err) {}
    }

    const parsedProxy = ESCAPE_M2(proxy);
    const messageText = 
      `*Fresh MTProto arrived\\!*\n\n` +
      `Location: NL 🇳🇱\n` +
      `Rotation In: 30m\n\n` +
      `\`${parsedProxy}\``;

    const msg = await bot.telegram.sendMessage(
      GROUP_ID,
      messageText,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [[{ text: "Connect", url: proxy }]]
        }
      }
    );

    lastMessageId = msg.message_id;
  } catch (err) {
    console.error(err);
  }
};

cron.schedule('*/30 * * * *', refreshProxy);

bot.command('refresh', async (ctx) => {
  if (ctx.from.id === Number(ADMIN_ID)) {
    await ctx.reply("Refreshing MTProto...");
    await refreshProxy();

    return;
  } 

  await ctx.reply("Not enough rights.");
});

bot.launch()
  .then(() => {
    console.log("@mtproto_tyan_bot now lives in NL!");
    refreshProxy();
  })
  .catch((err) => console.error(err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));