import { jsonLdString } from "@/lib/utils";

/**
 * داده‌ی ساختاریافته، سمت سرور (SEO.md §۷.۱). `jsonLdString` حرف `<` را
 * escape می‌کند تا متن ادمین نتواند `</script>` تزریق کند.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | null | (Record<string, unknown> | null)[];
}) {
  const items = (Array.isArray(data) ? data : [data]).filter(
    (item): item is Record<string, unknown> => item !== null,
  );
  return items.map((item, index) => (
    <script
      key={index}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(item) }}
    />
  ));
}
