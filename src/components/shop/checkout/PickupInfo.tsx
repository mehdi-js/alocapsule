import { cn } from "@/lib/utils";

import { panel } from "../styles";

/** تحویل حضوری: به‌جای انتخاب آدرس، محل و ساعت تحویل نمایش داده می‌شود */
export function PickupInfo({
  address,
  hours,
}: {
  address: string;
  hours: string;
}) {
  return (
    <section
      aria-labelledby="pickup-heading"
      className={cn(panel, "flex flex-col gap-2 p-5 md:p-6")}
    >
      <h2 id="pickup-heading" className="text-lg font-extrabold">
        تحویل حضوری
      </h2>
      <p className="text-ink-soft text-sm leading-7">
        <span className="font-bold">محل تحویل:</span> {address}
      </p>
      <p className="text-ink-soft text-sm leading-7">
        <span className="font-bold">ساعت:</span> {hours}
      </p>
    </section>
  );
}
