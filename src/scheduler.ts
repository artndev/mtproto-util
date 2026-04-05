import * as cron from "node-cron";
import { Telegraf } from "telegraf";
import * as CONSTANTS from "./constants.js";

export class Scheduler {
  private bot: Telegraf;
  private groupId: string | number | undefined;
  private scheduler: cron.ScheduledTask | undefined;
  private currentInterval: number | undefined;

  private PORT: number = 9443;
  private SNI: string = "ya.ru";

  constructor(
    _bot: Telegraf,
    _groupId: string | number,
    _currentInterval: number = 30,
  ) {
    this.bot = _bot;
    this.groupId = _groupId;
    this.currentInterval = _currentInterval;
  }

  public init(): void {
    if (!this.currentInterval) {
      return;
    }

    this.rotate();
    this.schedule({ minutes: this.currentInterval });
  }

  public schedule(data: { minutes?: number; seconds?: number }): void {
    try {
      const minutes = data.minutes ?? 0;
      const seconds = minutes * 60 + (data.seconds ?? 0);

      if (seconds <= 0) {
        console.warn("⚠️ Schedule skipped: interval is 0.");

        if (this.scheduler) {
          this.scheduler.stop();
        }

        return;
      }

      if (this.scheduler) {
        this.scheduler.stop();
      }

      this.currentInterval = seconds;
      this.scheduler = cron.schedule(
        `*/${this.currentInterval} * * * * *`,
        () => {
          this.rotate();
        },
      );
    } catch (err) {
      console.error(`❌ ${err}`);
    }
  }

  public async rotate(): Promise<void> {
    try {
      if (!this.groupId || !this.currentInterval) {
        throw new Error("Scheduler settings aren't set");
      }

      const sh = `
        SNI=${this.SNI}
        PORT=${this.PORT}

        SECRET=$(docker run --rm nineseconds/mtg:2 generate-secret --hex $SNI)
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

      const { stdout } = await CONSTANTS.EXEC_PROMISE(sh);
      const lines = stdout.trim().split("\n");
      const proxy = lines.find((line) => line.trim().startsWith("tg://"));
      if (!proxy) {
        throw new Error(`Proxy generation is failed: ${stdout}`);
      }

      await this.bot.telegram.sendMessage(
        this.groupId,
        `*Fresh MTProto arrived\\!*\n\n` +
          `Location: NL 🇳🇱\n` +
          `Rotation In: \\~${Math.ceil(this.currentInterval / 60)}m\n\n` +
          `\`${CONSTANTS.ESCAPE_M2(proxy)}\``,
        {
          parse_mode: "MarkdownV2",
          reply_markup: {
            inline_keyboard: [[{ text: "Connect 🔌", url: proxy }]],
          },
        },
      );
    } catch (err) {
      console.error(`❌ ${err}`);
    }
  }
}
