"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { checkDeliveryAction } from "@/server/actions/notification";

/** پرسیدن وضعیت تحویل از ملی پیامک (رسیده به گوشی، لیست سیاه، …) */
export function DeliveryStatusButton({ logId }: { logId: string }) {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkDeliveryAction(logId);
            setStatus(
              result.ok
                ? { ok: true, text: result.label }
                : { ok: false, text: result.message },
            );
          })
        }
      >
        وضعیت تحویل
      </Button>
      {status ? (
        <span
          role="status"
          className={
            status.ok ? "text-xs text-neutral-700" : "text-xs text-red-600"
          }
        >
          {status.text}
        </span>
      ) : null}
    </div>
  );
}
