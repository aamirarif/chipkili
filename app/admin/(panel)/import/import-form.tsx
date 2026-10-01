"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importCsv } from "../../actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importCsv, null);
  return (
    <form action={action} className="mt-6 rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
      <input type="file" name="csv" accept=".csv,text/csv" required className="block text-sm" />
      <button disabled={pending} className="btn btn-primary mt-4 !py-2 text-sm">
        {pending ? "Importing..." : "Import as drafts"}
      </button>
      {state ? (
        <div className="mt-4 text-sm">
          {state.ok ? (
            <p className="font-semibold text-chip">
              Imported {state.id} draft(s). <Link href="/admin/items?status=draft" className="underline">Open drafts</Link>
            </p>
          ) : null}
          {state.error ? <p className={state.ok ? "mt-1 text-ink-2" : "font-semibold text-btn"}>{state.error}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
