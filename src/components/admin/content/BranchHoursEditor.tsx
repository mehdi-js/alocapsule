"use client";

import { Input } from "@/components/ui/Input";
import { WEEK_DAYS } from "@/lib/branch-hours";

import type { DayRow } from "./branch-form-state";

/** ساعات کاری هفت روز: تیک «باز» + ساعت شروع و پایان */
export function BranchHoursEditor({
  days,
  onChange,
  error,
}: {
  days: DayRow[];
  onChange: (days: DayRow[]) => void;
  error: (field: string) => string | undefined;
}) {
  function update(index: number, patch: Partial<DayRow>) {
    onChange(days.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  let openIndex = -1;
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">ساعات کاری</legend>
      {days.map((row, index) => {
        if (row.open) openIndex += 1;
        const rowError = row.open
          ? (error(`openingHours.days.${openIndex}.open`) ??
            error(`openingHours.days.${openIndex}.close`))
          : undefined;
        const label = WEEK_DAYS[index]!.label;
        return (
          <div key={row.day} className="flex flex-wrap items-center gap-3">
            <label className="flex w-28 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.open}
                onChange={(event) =>
                  update(index, { open: event.target.checked })
                }
              />
              {label}
            </label>
            {row.open ? (
              <>
                <div className="w-32">
                  <Input
                    type="time"
                    dir="ltr"
                    aria-label={`ساعت شروع ${label}`}
                    value={row.from}
                    onChange={(event) =>
                      update(index, { from: event.target.value })
                    }
                  />
                </div>
                <span className="text-sm">تا</span>
                <div className="w-32">
                  <Input
                    type="time"
                    dir="ltr"
                    aria-label={`ساعت پایان ${label}`}
                    value={row.to}
                    onChange={(event) =>
                      update(index, { to: event.target.value })
                    }
                  />
                </div>
              </>
            ) : (
              <span className="text-sm text-neutral-500">بسته</span>
            )}
            {rowError ? (
              <span role="alert" className="text-xs text-red-600">
                {rowError}
              </span>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
