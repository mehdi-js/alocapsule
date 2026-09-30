import { type DayKey, WEEK_DAYS } from "@/lib/branch-hours";
import { parseIntegerInput, toLatinDigits } from "@/lib/utils";
import type { BranchFormInput } from "@/lib/validation/content";
import type { BranchDto } from "@/server/services/branch.service";

export interface DayRow {
  day: DayKey;
  open: boolean;
  from: string;
  to: string;
}

export interface BranchFormState {
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  days: DayRow[];
  hoursNote: string;
  latitude: string;
  longitude: string;
  neshan: string;
  balad: string;
  google: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  isActive: boolean;
  sortOrder: string;
}

export function branchFormFrom(dto: BranchDto | null): BranchFormState {
  const days = WEEK_DAYS.map((weekDay) => {
    const saved = dto?.openingHours.days.find((d) => d.day === weekDay.key);
    return {
      day: weekDay.key,
      open: Boolean(saved),
      from: saved?.open ?? "10:00",
      to: saved?.close ?? "22:00",
    };
  });
  return {
    name: dto?.name ?? "",
    slug: dto?.slug ?? "",
    city: dto?.city ?? "",
    district: dto?.district ?? "",
    address: dto?.address ?? "",
    phone: dto?.phone ?? "",
    days,
    hoursNote: dto?.openingHours.note ?? "",
    latitude: dto?.latitude?.toString() ?? "",
    longitude: dto?.longitude?.toString() ?? "",
    neshan: dto?.mapLinks.neshan ?? "",
    balad: dto?.mapLinks.balad ?? "",
    google: dto?.mapLinks.google ?? "",
    description: dto?.description ?? "",
    seoTitle: dto?.seoTitle ?? "",
    metaDescription: dto?.metaDescription ?? "",
    isActive: dto?.isActive ?? true,
    sortOrder: String(dto?.sortOrder ?? 0),
  };
}

function coordinate(value: string): number | null {
  const text = toLatinDigits(value).replace(/[٫,]/g, ".").trim();
  if (!text) return null;
  const number = Number(text);
  // NaN ⇒ خطای «باید عدد باشد» از Zod
  return Number.isFinite(number) ? number : Number.NaN;
}

export function toBranchInput(state: BranchFormState): BranchFormInput {
  return {
    name: state.name,
    slug: state.slug,
    city: state.city,
    district: state.district,
    address: state.address,
    phone: state.phone,
    openingHours: {
      days: state.days
        .filter((row) => row.open)
        .map((row) => ({ day: row.day, open: row.from, close: row.to })),
      note: state.hoursNote,
    },
    latitude: coordinate(state.latitude),
    longitude: coordinate(state.longitude),
    mapLinks: {
      neshan: state.neshan,
      balad: state.balad,
      google: state.google,
    },
    description: state.description,
    seoTitle: state.seoTitle,
    metaDescription: state.metaDescription,
    isActive: state.isActive,
    sortOrder: parseIntegerInput(state.sortOrder) ?? Number.NaN,
  };
}
