import { getSettings } from "lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  return (
    <div>
      <h1 className="heading text-3xl">Settings</h1>
      <p className="text-ink-2">Everything the site says about you, your texts and delivery. Changes show on the site right away.</p>
      <SettingsForm initial={await getSettings()} notifyLive={process.env.NOTIFY_MODE === "live"} />
    </div>
  );
}
