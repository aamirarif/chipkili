"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block">
        <span className="label">User</span>
        <input name="user" className="field" autoComplete="username" required defaultValue="owner" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" className="field" autoComplete="current-password" required />
      </label>
      <label className="block">
        <span className="label">Code from your authenticator app</span>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field text-center font-mono tracking-[0.4em]" required />
      </label>
      {state?.error ? <p role="alert" className="text-sm font-semibold text-btn">{state.error}</p> : null}
      <button disabled={pending} className="btn btn-green w-full">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
