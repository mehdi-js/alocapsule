/**
 * تعیین رمز عبور یک کاربر از روی سرور — راه بازیابی وقتی پیامک در دسترس
 * نیست (مثلاً ادمینی که رمزش را فراموش کرده). همه‌ی نشست‌های کاربر باطل
 * می‌شوند. رمز از ورودی خوانده می‌شود (نه آرگومان) تا در history شل نماند.
 *
 * اجرا: npm run user:set-password -- 09123456789
 * (بدون ترمینال: echo 'رمز' | npm run -s user:set-password -- 0912…)
 */
import { createInterface } from "node:readline";

import { db } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { normalizePhone } from "../src/lib/phone";
import { newPasswordSchema } from "../src/lib/validation/auth";
import { UserFacingError } from "../src/server/errors";
import { resetPasswordByPhone } from "../src/server/services/password.service";

/** خواندن یک خط؛ در ترمینال تایپ نمایش داده نمی‌شود. */
function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY === true,
  });
  if (process.stdin.isTTY) {
    const muted = rl as unknown as { _writeToOutput: (text: string) => void };
    muted._writeToOutput = (text) => {
      // فقط خود سؤال چاپ می‌شود، نه کاراکترهای رمز
      if (text.includes(question)) process.stdout.write(question);
    };
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (process.stdin.isTTY) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main(): Promise<number> {
  const phone = normalizePhone(process.argv[2] ?? "");
  if (!phone) {
    console.error("استفاده: npm run user:set-password -- 09123456789");
    return 2;
  }

  const password = await ask("رمز عبور جدید: ");
  const parsed = newPasswordSchema.safeParse(password);
  if (!parsed.success) {
    console.error(`✘ ${parsed.error.issues[0]?.message}`);
    return 1;
  }
  if (process.stdin.isTTY) {
    const confirm = await ask("تکرار رمز عبور: ");
    if (newPasswordSchema.safeParse(confirm).data !== parsed.data) {
      console.error("✘ تکرار رمز عبور یکسان نیست.");
      return 1;
    }
  }

  try {
    const user = await resetPasswordByPhone(phone, parsed.data);
    logger.info("password_reset_cli", { userId: user.userId, role: user.role });
    console.log(
      `✔ رمز عبور ${phone} (${user.role}) ذخیره شد و همه‌ی نشست‌هایش باطل شد.`,
    );
    return 0;
  } catch (error) {
    if (error instanceof UserFacingError) {
      console.error(`✘ ${error.message}`);
      return 1;
    }
    throw error;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    logger.error("password_reset_cli_failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
