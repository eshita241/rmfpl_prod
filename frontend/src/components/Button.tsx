import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tone?: "primary" | "quiet" | "danger";
  children: ReactNode;
};

export function Button({ active, tone = "quiet", className = "", children, ...props }: ButtonProps) {
  const tones = {
    primary: "bg-brand text-ink border-brand shadow-sm hover:bg-action hover:text-paper hover:border-action",
    quiet: active ? "bg-brand text-ink border-brand" : "bg-field text-ink border-line hover:border-brand hover:bg-milk",
    danger: "bg-red-600 text-white border-red-600"
  };

  return (
    <button
      className={`min-h-12 rounded-md border px-4 py-3 text-center text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
