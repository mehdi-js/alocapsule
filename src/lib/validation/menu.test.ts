import { describe, expect, it } from "vitest";

import { menuInputSchema, menuItemInputSchema, reorderSchema } from "./menu";

const menu = (slug: string) =>
  menuInputSchema.safeParse({ name: "شعبه ولیعصر", slug, isActive: true });

describe("منوی شعبه", () => {
  it("نشانی: حروف کوچک لاتین، عدد و خط تیره؛ حروف بزرگ کوچک می‌شوند", () => {
    expect(menu("valiasr").success).toBe(true);
    expect(menu("saadat-abad-2").success).toBe(true);
    expect(menu(" Valiasr ").data?.slug).toBe("valiasr");
    for (const bad of [
      "ولیعصر",
      "vali asr",
      "-vali",
      "vali--asr",
      "a",
      "a/b",
    ]) {
      expect(menu(bad).success, bad).toBe(false);
    }
  });

  it("توضیح خالی ⇒ null", () => {
    const parsed = menuInputSchema.parse({
      name: "شعبه",
      slug: "x1",
      description: "  ",
      isActive: false,
    });
    expect(parsed.description).toBeNull();
  });

  it("آیتم: قیمت عدد صحیح مثبت و نام اجباری", () => {
    const base = { categoryId: "c1", name: "چای", price: 45_000 };
    expect(menuItemInputSchema.safeParse(base).success).toBe(true);
    expect(menuItemInputSchema.safeParse({ ...base, price: 0 }).success).toBe(
      false,
    );
    expect(menuItemInputSchema.safeParse({ ...base, price: 1.5 }).success).toBe(
      false,
    );
    expect(menuItemInputSchema.safeParse({ ...base, name: " " }).success).toBe(
      false,
    );
  });

  it("ترتیب: شناسه‌ی تکراری پذیرفته نمی‌شود", () => {
    expect(reorderSchema.safeParse(["a", "b"]).success).toBe(true);
    expect(reorderSchema.safeParse(["a", "a"]).success).toBe(false);
  });
});
