import QRCode from "qrcode";

import { SITE } from "@/lib/site-content";
import {
  findActiveMenuBySlug,
  findMenuWithItems,
  listMenusWithCounts,
  type MenuWithItems,
} from "@/server/repositories/menu.repository";

/** خواندن منوها: فهرست ادمین، ویرایشگر، صفحه‌ی عمومی و QR */

export interface MenuItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  items: MenuItemDto[];
}

export interface MenuDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  categories: MenuCategoryDto[];
}

export interface MenuSummaryDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  categoryCount: number;
  itemCount: number;
  url: string;
}

/** آدرس کامل صفحه‌ی منو (همان چیزی که در QR می‌رود) */
export function menuUrl(slug: string): string {
  return new URL(`/menu/${slug}`, SITE.url).toString();
}

function toDto(menu: MenuWithItems): MenuDto {
  return {
    id: menu.id,
    name: menu.name,
    slug: menu.slug,
    description: menu.description,
    isActive: menu.isActive,
    categories: menu.categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
      })),
    })),
  };
}

export async function listMenus(): Promise<MenuSummaryDto[]> {
  const menus = await listMenusWithCounts();
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    slug: menu.slug,
    isActive: menu.isActive,
    categoryCount: menu.categories.length,
    itemCount: menu.categories.reduce((sum, c) => sum + c._count.items, 0),
    url: menuUrl(menu.slug),
  }));
}

export async function getMenuForEditor(id: string): Promise<MenuDto | null> {
  const menu = await findMenuWithItems(id);
  return menu ? toDto(menu) : null;
}

/** منوی فعال برای صفحه‌ی عمومی؛ دسته‌های خالی نمایش داده نمی‌شوند */
export async function getPublicMenu(slug: string): Promise<MenuDto | null> {
  const menu = await findActiveMenuBySlug(slug);
  if (!menu) return null;
  const dto = toDto(menu);
  return {
    ...dto,
    categories: dto.categories.filter((c) => c.items.length > 0),
  };
}

// ───────── QR code ─────────

/** سطح تصحیح خطای M: کمی آسیب/کثیفی روی برچسب چاپی را تحمل می‌کند */
const QR_OPTIONS = { errorCorrectionLevel: "M", margin: 2 } as const;

export function menuQrSvg(slug: string): Promise<string> {
  return QRCode.toString(menuUrl(slug), { ...QR_OPTIONS, type: "svg" });
}

/** PNG با کیفیت چاپ (۱۰۲۴ پیکسل) */
export function menuQrPng(slug: string): Promise<Buffer> {
  return QRCode.toBuffer(menuUrl(slug), {
    ...QR_OPTIONS,
    type: "png",
    width: 1024,
  });
}
