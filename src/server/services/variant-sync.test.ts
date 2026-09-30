import { describe, expect, it } from "vitest";

import type { VariantInput } from "@/lib/validation/product";
import { UserFacingError } from "@/server/errors";

import { planVariantSync } from "./variant-sync";

function variant(overrides: Partial<VariantInput> = {}): VariantInput {
  return {
    unitValue: 500,
    title: null,
    sku: null,
    price: 100_000,
    comparePrice: null,
    shippingWeightGrams: 700,
    ...overrides,
  };
}

const existing = [
  { id: "a", unitValue: 500 },
  { id: "b", unitValue: 1000 },
];

describe("planVariantSync", () => {
  it("متغیر بدون id ساخته می‌شود و پیش‌فرض فعال است", () => {
    const plan = planVariantSync(
      [],
      [variant(), variant({ unitValue: 1000, isActive: false })],
    );
    expect(plan.creates).toHaveLength(2);
    expect(plan.creates[0]).toMatchObject({
      unitValue: 500,
      sortOrder: 0,
      isActive: true,
    });
    expect(plan.creates[1]).toMatchObject({
      unitValue: 1000,
      sortOrder: 1,
      isActive: false,
    });
    expect(plan.updates).toEqual([]);
    expect(plan.deleteIds).toEqual([]);
  });

  it("متغیر با id ویرایش می‌شود و isActive آن هرگز دست نمی‌خورد", () => {
    const plan = planVariantSync(existing, [
      variant({ id: "a", isActive: false, price: 120_000 }),
      variant({ id: "b", unitValue: 1000 }),
    ]);
    expect(plan.updates).toHaveLength(2);
    expect(plan.updates[0]).toMatchObject({
      id: "a",
      price: 120_000,
      sortOrder: 0,
    });
    for (const update of plan.updates) {
      expect(update).not.toHaveProperty("isActive");
    }
    expect(plan.creates).toEqual([]);
    expect(plan.deleteIds).toEqual([]);
  });

  it("متغیر حذف‌شده از فرم در deleteIds می‌آید", () => {
    const plan = planVariantSync(existing, [
      variant({ id: "b", unitValue: 1000 }),
    ]);
    expect(plan.deleteIds).toEqual(["a"]);
  });

  it("تغییر unitValue علامت می‌خورد (برای جابه‌جایی موقت)", () => {
    const plan = planVariantSync(existing, [
      variant({ id: "a", unitValue: 1000 }),
      variant({ id: "b", unitValue: 500 }),
    ]);
    expect(plan.updates.map((u) => u.unitValueChanged)).toEqual([true, true]);

    const same = planVariantSync(existing, [
      variant({ id: "a" }),
      variant({ id: "b", unitValue: 1000 }),
    ]);
    expect(same.updates.map((u) => u.unitValueChanged)).toEqual([false, false]);
  });

  it("ترتیب نمایش همان ترتیب فرم است", () => {
    const plan = planVariantSync(existing, [
      variant({ id: "b", unitValue: 1000 }),
      variant({ id: "a" }),
      variant({ unitValue: 250 }),
    ]);
    expect(plan.updates.map((u) => [u.id, u.sortOrder])).toEqual([
      ["b", 0],
      ["a", 1],
    ]);
    expect(plan.creates[0]?.sortOrder).toBe(2);
  });

  it("id ناشناس یا تکراری خطای فارسی می‌دهد", () => {
    expect(() => planVariantSync(existing, [variant({ id: "zzz" })])).toThrow(
      UserFacingError,
    );
    expect(() =>
      planVariantSync(existing, [
        variant({ id: "a" }),
        variant({ id: "a", unitValue: 250 }),
      ]),
    ).toThrow(UserFacingError);
  });
});
