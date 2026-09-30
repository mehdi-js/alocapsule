import { getCurrentUser } from "@/server/auth/current-user";
import { findMenuSlug } from "@/server/repositories/menu.repository";
import { menuQrPng } from "@/server/services/menu-query.service";

export const runtime = "nodejs";

/** دانلود QR code منو (PNG ۱۰۲۴ پیکسل برای چاپ) — فقط ادمین */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return new Response(null, { status: 404 });

  const menu = await findMenuSlug((await params).id);
  if (!menu) return new Response(null, { status: 404 });

  const png = await menuQrPng(menu.slug);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="menu-${menu.slug}-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
