"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloseIcon, PinIcon } from "components/icons";

export function LocationChip({ label, zip, radius }: { label: string; zip?: string; radius: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-left hover:border-ink/40"
      >
        <PinIcon className="size-4 text-leaf" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold">
            {label}
            {zip ? ` ${zip}` : ""}
          </span>
          <span className="block text-xs text-ink-3">Within {radius} mi</span>
        </span>
      </button>
      {open ? <LocationDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function LocationDialog({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Set your location" className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-paper p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="heading text-2xl">Show distances from you?</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-cream-2">
            <CloseIcon />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-2">Otherwise we use Teaneck, NJ 07666.</p>
        <LocationForm onDone={onClose} />
      </div>
    </div>
  );
}

export function LocationForm({ onDone, dark = false }: { onDone?: () => void; dark?: boolean }) {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/location", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not set that location.");
      return;
    }
    onDone?.();
    router.refresh();
  }

  function useGps() {
    if (!navigator.geolocation) return setError("Location is not available on this device.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => save({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setBusy(false);
        setError("Location permission was not given. Enter a ZIP instead.");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useGps} disabled={busy} className="btn btn-gold !py-2.5">
          Use my location
        </button>
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{5}$/.test(zip)) save({ zip });
            else setError("Enter a 5-digit ZIP.");
          }}
        >
          <label className={`flex flex-1 items-center gap-2 rounded-full px-4 py-2 ${dark ? "bg-white text-ink" : "border border-line bg-white"}`}>
            <span className="text-sm font-semibold">ZIP</span>
            <input
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
              placeholder="07666"
              aria-label="ZIP code"
              className="w-16 bg-transparent outline-none"
            />
          </label>
          <button type="submit" disabled={busy} className={`btn !py-2.5 ${dark ? "btn-outline !border-white !text-white" : "btn-dark"}`}>
            Set
          </button>
        </form>
      </div>
      {error ? <p className={`mt-2 text-sm ${dark ? "text-gold" : "text-btn"}`}>{error}</p> : null}
    </div>
  );
}
