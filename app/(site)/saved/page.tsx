import type { Metadata } from "next";
import { SavedView } from "components/saved-view";

export const metadata: Metadata = { title: "Saved items and searches", robots: { index: false } };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 lg:px-6">
      <h1 className="heading text-4xl">Saved</h1>
      <p className="text-ink-2">Stored on this device. Price drops and sold items are marked.</p>
      <SavedView />
    </div>
  );
}
