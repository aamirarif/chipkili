import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <Image src="/kili/sunglasses.webp" alt="" width={220} height={200} className="h-40 w-auto" priority />
      <h1 className="wordmark mt-4 text-4xl text-chip">Kili looked everywhere.</h1>
      <p className="mt-2 text-ink-2">This page is not here. It may have moved, or the item sold and was archived.</p>
      <form action="/search" className="mt-6 flex w-full gap-2">
        <input name="q" className="field" placeholder="Search listings" aria-label="Search listings" />
        <button className="btn btn-primary">Search</button>
      </form>
      <Link href="/" className="btn btn-dark mt-4">
        Back to home
      </Link>
    </main>
  );
}
