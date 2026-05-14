import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { login, signup } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

export function Login() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const authMutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? login({ email: form.email, password: form.password })
        : signup({ name: form.name, email: form.email, password: form.password }),
    onSuccess: () => {
      setErrors({});
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        setErrors(fieldErrors(error.issues));
      }
      setMessage(error.message);
    }
  });

  function updateForm(nextForm: typeof form) {
    setForm(nextForm);
    setErrors({});
    setMessage("");
  }

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setErrors({});
    setMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-3 sm:p-6">
      <section className="w-full max-w-md rounded-md border border-line bg-field p-5 shadow-sm sm:p-8">
        <img className="mb-5 h-auto w-full" src="/logo-rmfpl.png" alt="Rajnandita Milk and Foods ERP" />
        <p className="mt-3 text-base leading-7 text-ink/70">
          Sign in with email and password to record production, view logs, and download reports.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button active={mode === "login"} onClick={() => switchMode("login")}>Login</Button>
          <Button active={mode === "signup"} onClick={() => switchMode("signup")}>Create User</Button>
        </div>

        <div className="mt-5 space-y-4">
          {mode === "signup" ? (
            <Field label="Name" placeholder="Example User" error={errors.name} value={form.name} onChange={(event) => updateForm({ ...form, name: event.target.value })} />
          ) : null}
          <Field label="Email" type="email" placeholder="example@email.com" error={errors.email} value={form.email} onChange={(event) => updateForm({ ...form, email: event.target.value })} />
          <Field label="Password" type="password" placeholder="At least 8 characters" error={errors.password} value={form.password} onChange={(event) => updateForm({ ...form, password: event.target.value })} />
        </div>

        {message ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</p> : null}

        <Button className="mt-6 w-full" tone="primary" disabled={authMutation.isPending} onClick={() => authMutation.mutate()}>
          {mode === "login" ? "Login" : "Create User"}
        </Button>

      </section>
    </main>
  );
}

function fieldErrors(issues: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value[0] ?? "Check this field"]));
}
