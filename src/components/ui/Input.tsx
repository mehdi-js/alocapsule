import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-lg border bg-white px-3 py-2.5 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-100 disabled:text-neutral-500";

function controlClasses(invalid: boolean | undefined, extra?: string) {
  return cn(
    controlClass,
    invalid ? "border-red-500" : "border-neutral-300",
    extra,
  );
}

type InvalidProp = { invalid?: boolean };

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & InvalidProp) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, className)}
      {...props}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProp) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn("min-h-24", className))}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & InvalidProp) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, className)}
      {...props}
    >
      {children}
    </select>
  );
}
