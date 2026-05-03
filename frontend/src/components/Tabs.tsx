import { ClipboardList, FileText, ListChecks, Shield } from "lucide-react";

type Tab = "entry" | "reports" | "logs" | "admin";

export function Tabs({
  current,
  onChange,
  isAdmin
}: {
  current: Tab;
  onChange: (tab: Tab) => void;
  isAdmin: boolean;
}) {
  const tabs = [
    { id: "entry" as const, label: "New Entry", icon: ClipboardList, show: true },
    { id: "reports" as const, label: "Reports", icon: FileText, show: true },
    { id: "logs" as const, label: "Logs", icon: ListChecks, show: true },
    { id: "admin" as const, label: "Admin", icon: Shield, show: isAdmin }
  ];

  return (
    <nav className="grid grid-cols-3 gap-2 border-b border-line bg-paper p-2 md:grid-cols-4">
      {tabs
        .filter((tab) => tab.show)
        .map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold md:text-base ${
                current === tab.id ? "border-brand bg-brand text-white" : "border-line bg-field text-ink"
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
    </nav>
  );
}
