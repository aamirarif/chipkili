import type { Metadata } from "next";
import { CookieSettings } from "components/cookie-settings";

export const metadata: Metadata = { title: "Cookie settings", robots: { index: false } };

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-8">
      <h1 className="heading text-4xl">Cookie settings</h1>
      <p className="mt-2 text-ink-2">Choose what this device remembers. You can change it any time.</p>
      <CookieSettings />
    </div>
  );
}
