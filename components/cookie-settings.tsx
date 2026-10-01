"use client";

import { useEffect, useState } from "react";
import { forgetAll } from "lib/client-memory";
import { setConsent } from "components/cookie-banner";

export function CookieSettings() {
  const [all, setAll] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setAll(document.cookie.includes("ck_consent=all")), []);

  return (
    <div className="mt-6 space-y-4">
      <div className="card flex items-start justify-between gap-4 p-5">
        <div>
          <p className="font-bold">Essential</p>
          <p className="text-sm text-ink-2">Keeps the site working: spam protection, your verified phone on this device, your location choice. Always on.</p>
        </div>
        <span className="badge badge-new">On</span>
      </div>
      <label className="card flex cursor-pointer items-start justify-between gap-4 p-5">
        <div>
          <p className="font-bold">Remember what I browse</p>
          <p className="text-sm text-ink-2">Items you view and search, kept on this device, to show you &quot;Pick up where you left off&quot; and related items.</p>
        </div>
        <input type="checkbox" className="mt-1 size-5 accent-btn" checked={all} onChange={(e) => setAll(e.target.checked)} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            setConsent(all ? "all" : "essential");
            if (!all) forgetAll();
            setSaved(true);
          }}
        >
          Save choices
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            forgetAll();
            setSaved(true);
          }}
        >
          Forget my browsing now
        </button>
      </div>
      {saved ? <p role="status" className="text-sm text-leaf">Saved.</p> : null}
    </div>
  );
}
