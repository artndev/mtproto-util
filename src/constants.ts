import { exec } from "child_process";
import { promisify } from "util";

export const EXEC_PROMISE = promisify(exec);

export const ESCAPE_M2 = (text: string) =>
  text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");