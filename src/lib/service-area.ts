/**
 * مناطق تحت پوشش ارسال. فعلاً فقط شهر تهران پوشش داده می‌شود؛ برای افزودن منطقه‌ی تازه فقط همین فهرست تغییر می‌کند.
 */
export const SERVICE_AREAS: readonly {
  province: string;
  cities: readonly string[];
}[] = [{ province: "تهران", cities: ["تهران"] }];

export const OUT_OF_AREA_MESSAGE = "در حال حاضر فقط به شهر تهران ارسال داریم.";

export function isServedLocation(province: string, city: string): boolean {
  return SERVICE_AREAS.some(
    (area) => area.province === province && area.cities.includes(city),
  );
}

/** روش ارسال با فهرست خالی استان‌ها به همه‌ی مناطق تحت پوشش ارسال دارد */
export function isShippingAvailableIn(
  methodProvinces: readonly string[],
  province: string,
): boolean {
  return methodProvinces.length === 0 || methodProvinces.includes(province);
}
