import { db } from "@/lib/db";

export function listActiveShippingMethods() {
  return db.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

// ───────── ادمین ─────────

export interface ShippingMethodData {
  name: string;
  description: string | null;
  cost: number;
  freeAboveAmount: number | null;
  payOnDelivery: boolean;
  provinces: string[];
  isActive: boolean;
  sortOrder: number;
}

export function listAllShippingMethods() {
  return db.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function findShippingMethod(id: string) {
  return db.shippingMethod.findUnique({ where: { id } });
}
