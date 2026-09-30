import type { SeoCheck, SeoStatus } from "./analyze";

export interface SeoSummary {
  bad: number;
  warn: number;
  good: number;
  /** رنگ دایره‌ی وضعیت در لیست */
  level: SeoStatus;
}

export function summarizeSeo(checks: SeoCheck[]): SeoSummary {
  const count = (status: SeoStatus) =>
    checks.filter((check) => check.status === status).length;
  const bad = count("bad");
  const warn = count("warn");
  return {
    bad,
    warn,
    good: count("good"),
    level: bad > 0 ? "bad" : warn > 0 ? "warn" : "good",
  };
}
