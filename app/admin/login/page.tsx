import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { adminUser } from "lib/session";
import { adminConfigured } from "lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (await adminUser()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="flex items-center gap-2">
          <Image src="/brand/mark.webp" alt="" width={44} height={44} />
          <span className="wordmark text-2xl">
            <span className="text-chip">Chip</span>
            <span className="text-kili">Kili</span>
          </span>
          <span className="ml-auto rounded-full bg-chip px-2.5 py-0.5 text-xs font-bold text-white">Admin</span>
        </div>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-6 text-sm text-ink-2">
            Admin is not set up yet. On the server, run <b>npm run admin:setup -- owner &quot;your password&quot; --write .env.local</b> and restart.
          </p>
        )}
      </div>
    </main>
  );
}
