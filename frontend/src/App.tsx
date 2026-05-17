import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout } from "./api/queries";
import { Button } from "./components/Button";
import { AppTab, Sidebar } from "./components/Sidebar";
import { Admin } from "./pages/Admin";
import { Damages } from "./pages/Damages";
import { Dispatch } from "./pages/Dispatch";
import { Logs } from "./pages/Logs";
import { Login } from "./pages/Login";
import { NewEntry } from "./pages/NewEntry";
import { ProductionEntries } from "./pages/ProductionEntries";
import { Reports } from "./pages/Reports";

export function App() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AppTab>(() => tabFromHash());
  const me = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data?.user ? 5000 : false)
  });

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
  if (me.isError) return <Login />;
  if (!me.data?.user) return <Login />;

  const permissions = me.data.user.permissions ?? [];
  if (permissions.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper p-4 text-ink">
        <section className="w-full max-w-lg rounded-md border border-line bg-field p-6 text-center shadow-sm">
          <img className="mx-auto h-auto w-48" src="/logo-rmfpl.png" alt="Rajnandita Milk and Foods ERP" />
          <h1 className="mt-6 text-2xl font-bold">Approval pending</h1>
          <p className="mt-3 text-ink/65">Your account has been created. An admin needs to approve you and assign access before pages are shown.</p>
          <Button
            className="mt-6"
            onClick={async () => {
              await logout();
              queryClient.clear();
              window.location.reload();
            }}
          >
            Sign Out
          </Button>
        </section>
      </main>
    );
  }

  const isAdmin = permissions.includes("ADMIN");
  const activeTab = tabAllowedForRole(tab, permissions) ? tab : defaultTab(permissions);
  const content =
    activeTab === "entry" ? <NewEntry isAdmin={isAdmin} /> : activeTab === "production" ? <ProductionEntries /> : activeTab === "damages" ? <Damages isAdmin={isAdmin} /> : activeTab === "dispatch" ? <Dispatch isAdmin={isAdmin} /> : activeTab === "reports" ? <Reports isAdmin={isAdmin} /> : activeTab === "logs" ? <Logs /> : <Admin />;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <Sidebar
        current={activeTab}
        onChange={changeTab}
        isAdmin={isAdmin}
        userName={me.data.user.name}
        role={me.data.user.roleName ?? me.data.user.role}
        permissions={permissions}
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
  return ["entry", "production", "damages", "dispatch", "reports", "logs", "admin"].includes(hash) ? (hash as AppTab) : "entry";
}

function tabAllowedForRole(tab: AppTab, permissions: string[]) {
  if (permissions.includes("ADMIN")) return true;
  if (["entry", "production", "damages"].includes(tab)) return permissions.includes("PRODUCTION");
  if (tab === "dispatch") return permissions.includes("DISPATCH");
  if (tab === "reports") return permissions.includes("REPORTS");
  if (tab === "logs") return permissions.includes("LOGS");
  return false;
}

function defaultTab(permissions: string[]): AppTab {
  if (permissions.includes("PRODUCTION")) return "entry";
  if (permissions.includes("DISPATCH")) return "dispatch";
  if (permissions.includes("REPORTS")) return "reports";
  if (permissions.includes("LOGS")) return "logs";
  return "dispatch";
}
