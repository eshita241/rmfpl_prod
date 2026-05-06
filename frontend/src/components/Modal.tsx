import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
};

const widths = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl"
};

export function Modal({ title, description, icon, children, actions, maxWidth = "sm" }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-3 sm:p-4">
      <section className={`my-4 max-h-[calc(100vh-2rem)] w-full ${widths[maxWidth]} overflow-y-auto rounded-md border border-line bg-field p-4 shadow-xl sm:p-5`}>
        <div className="flex items-start gap-3">
          {icon ? <div className="mt-1 shrink-0">{icon}</div> : null}
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-ink">{title}</h3>
            {description ? <div className="mt-2 text-ink/70">{description}</div> : null}
          </div>
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
        {actions ? <div className="mt-5">{actions}</div> : null}
      </section>
    </div>
  );
}
