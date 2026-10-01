-- دسته‌ی جدید پیش‌فرض noindex است؛ فقط hubها ایندکس می‌شوند (SEO.md §7.4)
ALTER TABLE "Category" ALTER COLUMN "noindex" SET DEFAULT true;
