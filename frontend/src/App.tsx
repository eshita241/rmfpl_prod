import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout } from "./api/queries";
import { AppTab, Sidebar } from "./components/Sidebar";
import { Admin } from "./pages/Admin";
import { Damages } from "./pages/Damages";
import { Logs } from "./pages/Logs";
import { Login } from "./pages/Login";
import { NewEntry } from "./pages/NewEntry";
import { ProductionEntries } from "./pages/ProductionEntries";
import { Reports } from "./pages/Reports";

export function App() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AppTab>(() => tabFromHash());
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function changeTab(nextTab: AppTab) {
    window.location.hash = nextTab;
    setTab(nextTab);
  }

  if (me.isLoading) return <main className="min-h-screen bg-paper p-8 text-ink">Loading...</main>;
  if (!me.data?.user) return <Login />;

  const isAdmin = me.data.user.role === "ADMIN";
  const content =
    tab === "entry" ? <NewEntry /> : tab === "production" ? <ProductionEntries /> : tab === "damages" ? <Damages isAdmin={isAdmin} /> : tab === "reports" ? <Reports isAdmin={isAdmin} /> : tab === "logs" ? <Logs /> : <Admin />;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <Sidebar
        current={tab}
        onChange={changeTab}
        isAdmin={isAdmin}
        userName={me.data.user.name}
        role={me.data.user.role}
        onLogout={async () => {
          await logout();
          queryClient.clear();
          window.location.reload();
        }}
      />
      <section className="mx-auto max-w-6xl px-3 py-4 pt-20 sm:px-4 md:ml-72 md:p-8">{content}</section>
    </main>
  );
}

function tabFromHash(): AppTab {
  const hash = window.location.hash.replace("#", "");
  return ["entry", "production", "damages", "reports", "logs", "admin"].includes(hash) ? (hash as AppTab) : "entry";
}
