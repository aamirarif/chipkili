"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function setConsent(value: "all" | "essential") {
  document.cookie = `ck_consent=${value}; path=/; max-age=${365 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  window.dispatchEvent(new Event("ck-consent"));
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!document.cookie.includes("ck_consent=")) {
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);
  if (!show) return null;
  const choose = (v: "all" | "essential") => {
    setConsent(v);
    setShow(false);
  };
  return (
    <div role="dialog" aria-label="Remember what you browse?" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md md:bottom-5 md:left-5 md:right-auto">
      <div className="card flex gap-4 p-5 shadow-[var(--shadow-pop)]">
        <Image src="/kili/face-wink.webp" alt="" width={64} height={64} className="size-14 shrink-0 object-contain" />
        <div>
          <p className="font-bold">Remember what you browse?</p>
          <p className="mt-1 text-sm text-ink-2">
            We save items you view and search on this device so we can show them next time. Nothing is sold or shared.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => choose("all")} className="btn btn-primary !px-4 !py-2 text-sm">
              Yes, remember
            </button>
            <button onClick={() => choose("essential")} className="btn btn-outline !px-4 !py-2 text-sm">
              Essential only
            </button>
            <Link href="/cookies" className="text-sm underline underline-offset-2">
              Cookie settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
