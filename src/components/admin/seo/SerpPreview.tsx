import { truncateAtWord } from "@/lib/seo/text";

/** برش بصری نتیجه‌ی گوگل (SEO.md §۱۰.۱) */
const TITLE_CUT = 60;
const META_CUT = 160;

/** «https://alihan.ir/products/x» ⇒ «alihan.ir › products › x» */
function breadcrumb(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return [host, ...pathname.split("/").filter(Boolean)].join(" › ");
  } catch {
    return url;
  }
}

/** پیش‌نمایش نتیجه‌ی گوگل: عنوان کامل با قالب برند، آدرس و متا */
export function SerpPreview({
  title,
  url,
  description,
  autoDescription,
}: {
  title: string;
  url: string;
  description: string;
  /** متا خالی است و از متن ساخته شده */
  autoDescription: boolean;
}) {
  return (
    <div
      className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4"
      aria-label="پیش‌نمایش نتیجه‌ی گوگل"
    >
      <p className="text-xs text-neutral-500">پیش‌نمایش نتیجه‌ی گوگل</p>
      <p dir="ltr" className="truncate text-end text-xs text-emerald-800">
        {breadcrumb(url)}
      </p>
      <p className="text-lg leading-7 text-blue-800">
        {truncateAtWord(title, TITLE_CUT)}
      </p>
      <p className="text-sm leading-6 text-neutral-700">
        {description ? (
          truncateAtWord(description, META_CUT)
        ) : (
          <span className="text-neutral-400">توضیحی وجود ندارد.</span>
        )}
      </p>
      {autoDescription && description ? (
        <p className="text-xs text-amber-700">
          توضیحات متا خالی است؛ این متن خودکار از ابتدای توضیحات ساخته شده.
        </p>
      ) : null}
    </div>
  );
}
