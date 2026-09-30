const MIN_AUTH_SECRET_LENGTH = 32;

/** فقط `process.env` می‌خواند تا در middleware (Edge) هم قابل استفاده باشد. */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET باید حداقل ${MIN_AUTH_SECRET_LENGTH} کاراکتر باشد (مثلاً: openssl rand -base64 48)`,
    );
  }
  return secret;
}
