-- SEO.md فاز S4: صفحات ثابت، شعب و ریدایرکت

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "faq" JSONB;

-- Data: شعب از تنظیمات سایت (site.content → branches) به جدول Branch منتقل
-- می‌شوند تا ادمین آن‌ها را با صفحه‌ی جدا و ساعات کاری روزانه مدیریت کند.
-- نامک لاتین موقت branch-N است و شهر خالی می‌ماند (ادمین از پنل تکمیل
-- می‌کند). متن قبلی ساعات کاری در `note` حفظ می‌شود.
INSERT INTO "Branch" (
  "id", "name", "slug", "city", "address", "phone", "openingHours",
  "mapLinks", "isActive", "sortOrder", "updatedAt"
)
SELECT
  'migrated-branch-' || item.ordinality,
  btrim(item.value->>'name'),
  'branch-' || item.ordinality,
  '',
  coalesce(btrim(item.value->>'address'), ''),
  coalesce(btrim(item.value->>'phone'), ''),
  jsonb_build_object(
    'days', '[]'::jsonb,
    'note', coalesce(btrim(item.value->>'hours'), '')
  ),
  '{}'::jsonb,
  true,
  item.ordinality - 1,
  CURRENT_TIMESTAMP
FROM "Setting" AS s,
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(s."value"->'branches') = 'array' THEN s."value"->'branches'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS item(value, ordinality)
WHERE s."key" = 'site.content'
  AND coalesce(btrim(item.value->>'name'), '') <> ''
ON CONFLICT DO NOTHING;
