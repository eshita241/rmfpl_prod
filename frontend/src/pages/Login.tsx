import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Factory } from "lucide-react";
import { login, signup } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

export function Login() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const authMutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? login({ email: form.email, password: form.password })
        : signup({ name: form.name, email: form.email, password: form.password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => setMessage(error.message)
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <section className="w-full max-w-md rounded-md border border-line bg-field p-8 shadow-sm">
        <Factory className="mb-5 text-brand" size={42} />
        <h1 className="text-3xl font-bold text-ink">RMFPL_MGMT</h1>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Sign in with email and password to record production, view logs, and download reports.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button active={mode === "login"} onClick={() => setMode("login")}>Login</Button>
          <Button active={mode === "signup"} onClick={() => setMode("signup")}>Create User</Button>
        </div>

        <div className="mt-5 space-y-4">
          {mode === "signup" ? (
            <Field label="Name" placeholder="Example User" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          ) : null}
          <Field label="Email" type="email" placeholder="example@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Field label="Password" type="password" placeholder="Example password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </div>

        {message ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</p> : null}

        <Button className="mt-6 w-full" tone="primary" disabled={authMutation.isPending} onClick={() => authMutation.mutate()}>
          {mode === "login" ? "Login" : "Create User"}
        </Button>

      </section>
    </main>
  );
}
