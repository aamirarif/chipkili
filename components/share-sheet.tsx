"use client";

import Image from "next/image";
import { useState } from "react";
import { CloseIcon, ShareIcon } from "components/icons";

type Props = {
  /** path on this site, e.g. /i/samsung-fridge-1042 or /search?q=washer */
  path: string;
  title: string;
  subtitle?: string;
  image?: string;
  label?: string;
  variant?: "button" | "full" | "chip";
  itemId?: string;
  /** public site address; defaults to the page's own origin */
  origin?: string;
};

function withSource(abs: string, src: string): string {
  const u = new URL(abs);
  u.searchParams.set("src", src);
  return u.toString();
}

export function ShareButton(props: Props) {
  const [open, setOpen] = useState(false);
  const cls =
    props.variant === "full"
      ? "btn btn-outline flex-1"
      : props.variant === "chip"
        ? "chip !bg-white border border-line"
        : "btn btn-outline !px-4 !py-2 text-sm";
  return (
    <>
      <button type="button" className={cls} onClick={() => setOpen(true)}>
        <ShareIcon className="size-[18px]" /> {props.label ?? "Share"}
      </button>
      {open ? <ShareSheet {...props} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function ShareSheet({ path, title, subtitle, image, itemId, origin, onClose }: Props & { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const base = `${origin ?? window.location.origin}${path}`;
  const track = (channel: string) =>
    navigator.sendBeacon?.("/api/events", JSON.stringify({ kind: "share", itemId, source: channel, query: path }));

  const open = (channel: string, href: string) => {
    track(channel);
    window.open(href, "_blank", "noopener,noreferrer");
  };
  const link = (channel: string) => encodeURIComponent(withSource(base, `share-${channel}`));
  const text = encodeURIComponent(`${title}${subtitle ? ` - ${subtitle}` : ""}`);

  async function copy() {
    track("copy");
    await navigator.clipboard.writeText(withSource(base, "share-copy"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function native() {
    track("native");
    try {
      await navigator.share({ title, text: subtitle ?? title, url: withSource(base, "share-native") });
    } catch {
      /* cancelled */
    }
  }

  const targets: { key: string; label: string; short: string; act: () => void }[] = [
    { key: "copy", label: copied ? "Copied!" : "Copy link", short: "Link", act: copy },
    { key: "whatsapp", label: "WhatsApp", short: "WA", act: () => open("whatsapp", `https://wa.me/?text=${text}%20${link("whatsapp")}`) },
    { key: "facebook", label: "Facebook", short: "FB", act: () => open("facebook", `https://www.facebook.com/sharer/sharer.php?u=${link("facebook")}`) },
    { key: "messenger", label: "Messenger", short: "MSG", act: () => open("messenger", `fb-messenger://share/?link=${link("messenger")}`) },
    { key: "sms", label: "Text", short: "SMS", act: () => { track("sms"); window.location.href = `sms:?&body=${text}%20${link("sms")}`; } },
    { key: "email", label: "Email", short: "@", act: () => { track("email"); window.location.href = `mailto:?subject=${text}&body=${link("email")}`; } },
    { key: "x", label: "X", short: "X", act: () => open("x", `https://x.com/intent/post?text=${text}&url=${link("x")}`) },
    { key: "qr", label: "QR code", short: "QR", act: () => { track("qr"); setQr(true); } },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Share" className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-paper p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-3">Share</p>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-cream-2">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-3 flex gap-3 rounded-2xl bg-cream p-3">
          {image ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream-2">
              <Image src={image} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ) : (
            <Image src="/brand/mark.webp" alt="" width={64} height={64} className="size-16 shrink-0" />
          )}
          <div className="min-w-0 text-sm">
            <p className="text-xs text-ink-3">chipkili.com</p>
            <p className="line-clamp-2 font-semibold">{title}</p>
            {subtitle ? <p className="text-ink-2">{subtitle}</p> : null}
          </div>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button onClick={native} className="btn btn-primary mt-4 w-full">
            <ShareIcon className="size-5" /> Share with your phone
          </button>
        ) : null}
        {qr ? (
          <div className="mt-4 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr?path=${encodeURIComponent(path)}`} alt="QR code for this link" className="size-56 rounded-xl bg-white p-2" />
            <button onClick={() => setQr(false)} className="mt-2 text-sm underline">
              Back
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {targets.map((t) => (
              <button key={t.key} type="button" onClick={t.act} className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-xs hover:bg-cream">
                <span className="grid size-12 place-items-center rounded-full bg-cream-2 text-sm font-bold">{t.short}</span>
                {t.label}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-ink-3">Every share link carries a source tag so you can see which shares bring leads.</p>
      </div>
    </div>
  );
}
