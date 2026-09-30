import { parseOrderFilters } from "@/lib/order-filters";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  exportFileName,
  exportOrdersCsv,
} from "@/server/services/order-export.service";

export const runtime = "nodejs";

/** خروجی CSV سفارش‌ها (فقط ادمین) با همان فیلترهای جدول سفارش‌ها */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { filters, error } = parseOrderFilters(params);
  if (error) return new Response(error, { status: 400 });

  const csv = await exportOrdersCsv(filters);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName()}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
