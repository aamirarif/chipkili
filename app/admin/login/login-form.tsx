"use client";

import { useActionState } from "react";
import { login, loginCode } from "../actions";

type Step = { step: "password" | "code"; sentTo?: string; error?: string };

/** One state decides the visible step; a hidden "stage" field says which server action a submit goes to. */
async function advance(prev: Step, form: FormData): Promise<Step> {
  const stage = form.get("stage");
  if (stage === "restart") return { step: "password" };
  if (stage === "code") {
    const r = await loginCode(null, form);
    return r.step === "password" ? { step: "password", error: r.error } : { step: "code", sentTo: prev.sentTo, error: r.error };
  }
  const r = await login(null, form);
  return r.step === "code" ? { step: "code", sentTo: r.sentTo } : { step: "password", error: r.error };
}

export function LoginForm({ initialStep = "password", sentTo }: { initialStep?: "password" | "code"; sentTo?: string }) {
  const [state, action, pending] = useActionState(advance, { step: initialStep, sentTo });

  if (state.step === "code") {
    return (
      <form action={action} className="mt-6 space-y-3">
        <p className="text-sm text-ink-2">
          We texted a 6-digit code to <b>{state.sentTo}</b> and emailed it too.
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
        {state.error ? <p role="alert" className="text-sm font-semibold text-btn">{state.error}</p> : null}
        <button name="stage" value="code" disabled={pending} className="btn btn-green w-full">
          {pending ? "Checking..." : "Sign in"}
        </button>
        <button name="stage" value="restart" formNoValidate disabled={pending} className="w-full text-sm text-ink-3 underline">
          Didn&apos;t get it? Start again
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="stage" value="password" />
      <label className="block">
        <span className="label">User</span>
        <input name="user" className="field" autoComplete="username" required defaultValue="owner" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" className="field" autoComplete="current-password" required />
      </label>
      {state.error ? <p role="alert" className="text-sm font-semibold text-btn">{state.error}</p> : null}
      <button disabled={pending} className="btn btn-green w-full">
        {pending ? "Sending your code..." : "Continue"}
      </button>
      <p className="text-center text-xs text-ink-3">Next, we text a sign-in code to your phone.</p>
    </form>
  );
}
