import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, className = "", ...props }: Props) {
  return (
    <label className="block">
      <span className={`mb-2 block text-sm font-semibold ${error ? "text-red-700" : "text-ink"}`}>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        className={`h-14 w-full rounded-md border bg-field px-4 text-lg text-ink outline-none ${
          error
            ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200"
            : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20"
        } ${className}`}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}
