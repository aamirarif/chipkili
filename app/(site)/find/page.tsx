import type { Metadata } from "next";
import Image from "next/image";
import { getCategories } from "lib/catalog";
import { FindForm } from "components/sell-form";

export const metadata: Metadata = {
  title: "Find it for me",
  description: "Tell ChipKili what you are looking for, your budget and brand. We find it and text you.",
  alternates: { canonical: "/find" },
};

export default async function FindPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [cats, { q }] = await Promise.all([getCategories(), searchParams]);
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-8 lg:px-6">
      <section className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <Image src="/kili/sunglasses.webp" alt="" width={200} height={200} className="h-40 w-auto" priority />
        <div>
          <h1 className="wordmark text-4xl text-chip sm:text-5xl">Tell Kili what you&apos;re hunting for.</h1>
          <p className="mt-2 text-lg text-ink-2">Brand, budget, anything you know. We find it and text you. No charge to ask.</p>
        </div>
      </section>
      <section className="card mt-8 p-5 sm:p-7">
        <FindForm categories={cats.filter((c) => !c.parentId).map((c) => c.name)} preset={q?.slice(0, 120)} />
      </section>
    </div>
  );
}
