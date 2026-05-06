import { AlertTriangle, ClipboardList, Download, Factory, FileText, ListChecks, LogOut, Menu, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { promptInstall, subscribeInstallPrompt } from "../pwa";
import { Button } from "./Button";

export type AppTab = "entry" | "production" | "damages" | "reports" | "logs" | "admin";

const navItems = [
  { id: "entry" as const, label: "New Entry", icon: ClipboardList, show: true },
  { id: "production" as const, label: "Production Entries", icon: ClipboardList, show: true },
  { id: "damages" as const, label: "Damages", icon: AlertTriangle, show: true },
  { id: "reports" as const, label: "Reports", icon: FileText, show: true },
  { id: "logs" as const, label: "Logs", icon: ListChecks, show: true },
  { id: "admin" as const, label: "Admin", icon: Shield, show: false }
];

export function Sidebar({
  current,
  onChange,
  isAdmin,
  userName,
  role,
  onLogout
}: {
  current: AppTab;
  onChange: (tab: AppTab) => void;
  isAdmin: boolean;
  userName: string;
  role: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeInstallPrompt((event) => setCanInstall(Boolean(event)));
    return () => {
      unsubscribe();
    };
  }, []);

  const content = (
    <aside className="flex h-full w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-line bg-[#f1faed] text-ink">
      <div className="flex items-center gap-3 border-b border-line p-5">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-brand text-white shadow-sm">
          <Factory size={28} />
        </div>
        <div>
          <h1 className="text-lg font-bold">RMFPL_MGMT</h1>
          <p className="text-sm text-ink/60">{userName} | {role}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-3">
        {navItems
          .filter((item) => item.show || (item.id === "admin" && isAdmin))
          .map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={`flex min-h-14 w-full items-center gap-3 rounded-md px-4 text-left text-base font-bold transition ${
                  active ? "bg-brand text-white shadow-sm" : "text-ink hover:bg-milk"
                }`}
              >
                <Icon size={22} />
                {item.label}
              </button>
            );
          })}
      </nav>

      <div className="space-y-2 border-t border-line p-3">
        <Button className="w-full justify-start" disabled={!canInstall} onClick={() => promptInstall()}>
          <span className="inline-flex items-center gap-2"><Download size={18} /> Install App</span>
        </Button>
        <Button className="w-full justify-start" onClick={onLogout}>
          <span className="inline-flex items-center gap-2"><LogOut size={18} /> Sign Out</span>
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        className="fixed left-3 top-3 z-40 grid h-12 w-12 place-items-center rounded-md bg-brand text-white shadow-lg md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{content}</div>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full">
            {content}
            <button className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-md bg-white text-brand shadow-sm" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
