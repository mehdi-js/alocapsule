import { ConsoleSmsProvider } from "./console-provider";
import { MelipayamakProvider } from "./melipayamak-provider";
import type { SmsProvider } from "./types";

export { sanitizeSmsArg } from "./sanitize";
export type { SendPatternParams, SmsProvider, SmsSendResult } from "./types";

/** انتخاب provider از `SMS_PROVIDER`؛ در production حالت console خطا می‌دهد. */
export function createSmsProvider(
  env: Record<string, string | undefined> = process.env,
): SmsProvider {
  const name = env.SMS_PROVIDER ?? "console";

  if (name === "console") {
    if (env.NODE_ENV === "production") {
      throw new Error("SMS_PROVIDER=console در production مجاز نیست");
    }
    return new ConsoleSmsProvider();
  }

  if (name === "melipayamak") {
    const username = env.MELIPAYAMAK_USERNAME;
    const password = env.MELIPAYAMAK_PASSWORD;
    if (!username || !password) {
      throw new Error(
        "MELIPAYAMAK_USERNAME و MELIPAYAMAK_PASSWORD باید تنظیم شوند",
      );
    }
    return new MelipayamakProvider({ username, password });
  }

  throw new Error(`SMS_PROVIDER نامعتبر است: "${name}"`);
}

let cached: SmsProvider | undefined;

export function getSmsProvider(): SmsProvider {
  cached ??= createSmsProvider();
  return cached;
}
