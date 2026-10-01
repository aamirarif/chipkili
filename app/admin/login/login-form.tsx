"use client";

import { useActionState, useState } from "react";
import { login, loginCode, type LoginState } from "../actions";

export function LoginForm() {
  const [pw, pwAction, pwPending] = useActionState(login, null);
  const [code, codeAction, codePending] = useActionState(loginCode, null);
  const [restart, setRestart] = useState(0);
  // after the password step succeeds, show the code step; a code-step "start again" goes back
  const onCodeStep = pw?.step === "code" && code?.step !== "password" && restart === 0;

  if (onCodeStep) {
    return (
      <form action={codeAction} className="mt-6 space-y-3">
        <p className="text-sm text-ink-2">
          We texted a 6-digit code to <b>{pw?.sentTo}</b> and emailed it too.
        </p>
        <label className="block">
          <span className="label">Code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            className="field text-center font-mono text-2xl tracking-[0.4em]"
            required
          />
        </label>
        {code?.error ? <p role="alert" className="text-sm font-semibold text-btn">{code.error}</p> : null}
        <button disabled={codePending} className="btn btn-green w-full">
          {codePending ? "Checking..." : "Sign in"}
        </button>
        <button type="button" onClick={() => setRestart((n) => n + 1)} className="w-full text-sm text-ink-3 underline">
          Didn&apos;t get it? Start again
        </button>
      </form>
    );
  }

  return (
    <form action={(f) => (setRestart(0), pwAction(f))} className="mt-6 space-y-3">
      <label className="block">
        <span className="label">User</span>
        <input name="user" className="field" autoComplete="username" required defaultValue="owner" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" className="field" autoComplete="current-password" required />
      </label>
      {(code?.step === "password" && code.error) || pw?.error ? (
        <p role="alert" className="text-sm font-semibold text-btn">{pw?.error ?? code?.error}</p>
      ) : null}
      <button disabled={pwPending} className="btn btn-green w-full">
        {pwPending ? "Sending your code..." : "Continue"}
      </button>
      <p className="text-center text-xs text-ink-3">Next, we text a sign-in code to your phone.</p>
    </form>
  );
}
