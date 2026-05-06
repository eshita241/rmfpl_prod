import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
};

export function SelectField({ label, error, options, className = "", ...props }: Props) {
  return (
    <label className="block">
      <span className={`mb-2 block text-sm font-semibold ${error ? "text-red-700" : "text-ink"}`}>{label}</span>
      <span className="relative block">
        <select
          aria-invalid={Boolean(error)}
          className={`h-14 w-full min-w-0 appearance-none rounded-md border bg-field py-0 pl-4 pr-12 text-base text-ink outline-none sm:pr-14 sm:text-lg ${
            error
              ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200"
              : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20"
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/70 sm:right-5" size={22} aria-hidden="true" />
      </span>
      {error ? <span className="mt-2 block text-sm font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}
