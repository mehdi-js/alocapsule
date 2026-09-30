/**
 * قالب «متن ساده با قالب‌بندی» برای متن‌های بلندی که ادمین می‌نویسد
 * (توضیحات محصول، متن دسته، محتوای صفحات). HTML خام هرگز ذخیره یا رندر
 * نمی‌شود؛ خروجی فقط همین بلوک‌هاست و رندرکننده از آن‌ها عنصر می‌سازد.
 *
 * - خط خالی ⇒ پاراگراف جدید؛ خط تکی ⇒ شکست خط
 * - `## عنوان` ⇒ سرتیتر اصلی، `### عنوان` ⇒ سرتیتر فرعی
 * - `- مورد` (یا `• مورد`) ⇒ فهرست
 * - `[متن](/products/example-product)` ⇒ لینک (داخلی با `/`، خارجی با https)
 * - `**متن**` ⇒ پررنگ
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "link"; text: string; href: string; internal: boolean };

export type Block =
  | { type: "heading"; level: 2 | 3; content: Inline[] }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "list"; items: Inline[][] };

const INLINE = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** `/x` داخلی؛ `https://…` خارجی؛ بقیه (javascript:، //host، …) لینک نیستند */
export function classifyHref(
  href: string,
): { href: string; internal: boolean } | null {
  if (/^\/(?!\/)/.test(href)) return { href, internal: true };
  if (/^https?:\/\/[^\s/]+/i.test(href)) return { href, internal: false };
  return null;
}

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  let last = 0;
  const pushText = (value: string) => {
    if (!value) return;
    const previous = result.at(-1);
    if (previous?.type === "text") previous.text += value;
    else result.push({ type: "text", text: value });
  };
  for (const match of text.matchAll(INLINE)) {
    pushText(text.slice(last, match.index));
    const [whole, strong, label, href] = match;
    if (strong !== undefined) {
      result.push({ type: "strong", text: strong });
    } else {
      const link = classifyHref(href ?? "");
      if (link && label) result.push({ type: "link", text: label, ...link });
      else pushText(whole);
    }
    last = match.index + whole.length;
  }
  pushText(text.slice(last));
  return result;
}

export function parseRichText(source: string | null | undefined): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] | null = null;
  let list: Inline[][] | null = null;
  const close = () => {
    if (paragraph) blocks.push({ type: "paragraph", lines: paragraph });
    if (list) blocks.push({ type: "list", items: list });
    paragraph = null;
    list = null;
  };

  for (const raw of (source ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      close();
      blocks.push({
        type: "heading",
        level: heading[1] === "##" ? 2 : 3,
        content: parseInline(heading[2]!.trim()),
      });
      continue;
    }
    const bullet = /^[-•]\s+(.+)$/.exec(line);
    if (bullet) {
      if (paragraph) close();
      list ??= [];
      list.push(parseInline(bullet[1]!));
      continue;
    }
    if (list) close();
    paragraph ??= [];
    paragraph.push(parseInline(line));
  }
  close();
  return blocks;
}

function inlineText(inlines: Inline[]): string {
  return inlines.map((inline) => inline.text).join("");
}

/** متن ساده (برای شمارش کلمه، چگالی کلمه‌ی کلیدی و متای خودکار) */
export function richTextToPlain(source: string | null | undefined): string {
  return parseRichText(source)
    .map((block) => {
      if (block.type === "heading") return inlineText(block.content);
      if (block.type === "list") return block.items.map(inlineText).join("\n");
      return block.lines.map(inlineText).join("\n");
    })
    .join("\n\n");
}

export function richTextLinks(
  source: string | null | undefined,
): { href: string; internal: boolean }[] {
  const links: { href: string; internal: boolean }[] = [];
  const collect = (inlines: Inline[]) => {
    for (const inline of inlines)
      if (inline.type === "link")
        links.push({ href: inline.href, internal: inline.internal });
  };
  for (const block of parseRichText(source)) {
    if (block.type === "heading") collect(block.content);
    else if (block.type === "list") block.items.forEach(collect);
    else block.lines.forEach(collect);
  }
  return links;
}
