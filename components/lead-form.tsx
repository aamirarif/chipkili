"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ExtraField = {
  name: string;
  label: string;
  kind?: "text" | "select" | "textarea" | "checkbox";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  half?: boolean;
};

type Props = {
  type: "message" | "contact" | "sell" | "find";
  itemId?: string;
  itemTitle?: string;
  initialMessage?: string;
  quickQuestions?: string[];
  messageLabel?: string;
  extraFields?: ExtraField[];
  allowUploads?: boolean;
  askEmail?: boolean;
  submitLabel?: string;
  sentTitle?: string;
  sentText?: string;
  onSent?: () => void;
  afterSent?: React.ReactNode;
};

type Step = "write" | "verify" | "sent";

export function LeadForm(p: Props) {
  const [step, setStep] = useState<Step>("write");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(p.initialMessage ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [masked, setMasked] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [verified, setVerified] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const trap = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/otp/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { phone?: string } | null) => d?.phone && (setVerified(d.phone), setPhone(d.phone.replace(/^\+1/, ""))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function problem(): string {
    if (name.trim().length < 2) return "Please enter your name.";
    if (phone.replace(/\D/g, "").length < 10) return "Please enter a 10-digit mobile number.";
    if (message.trim().length < 2) return "Please write a short message.";
    for (const f of p.extraFields ?? []) if (f.required && !fields[f.name]?.trim()) return `Please fill in: ${f.label}.`;
    return "";
  }

  async function sendCode(channel: "sms" | "voice") {
    const bad = problem();
    if (bad) return setError(bad);
    setBusy(true);
    setError("");
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, channel }),
    });
    const data = (await res.json().catch(() => ({}))) as { masked?: string; error?: string; devCode?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not send the code. Try again.");
    setMasked(data.masked ?? "");
    setDevCode(data.devCode);
    setResendIn(30);
    setStep("verify");
  }

  async function submit() {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("type", p.type);
    form.set("name", name);
    form.set("email", email);
    form.set("message", message);
    form.set("website", trap.current?.value ?? "");
    if (p.itemId) form.set("itemId", p.itemId);
    form.set("fields", JSON.stringify(fields));
    const src = new URLSearchParams(window.location.search).get("src");
    if (src) form.set("source", src);
    for (const f of files) form.append("files", f);
    const res = await fetch("/api/leads", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not send. Please try again.");
    setStep("sent");
    p.onSent?.();
  }

  async function verifyAndSend() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "That code did not work.");
    }
    await submit();
  }

  if (step === "sent") {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-sage p-6 text-center">
        <Image src="/kili/chip-stand.webp" alt="" width={160} height={140} className="h-32 w-auto" />
        <p className="wordmark mt-3 text-2xl">{p.sentTitle ?? "Sent! Kili delivered it."}</p>
        <p className="mt-1 max-w-sm text-ink-2">{p.sentText ?? "The seller will text you back. Keep browsing while you wait."}</p>
        {p.afterSent}
        <Link href="/" className="btn btn-dark mt-5">
          Keep browsing
        </Link>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-3">Step 2 &middot; Verify</p>
        <p className="mt-2 font-semibold">Enter the 6-digit code</p>
        <p className="text-sm text-ink-2">
          We sent it to {masked}.{" "}
          <button type="button" onClick={() => setStep("write")} className="underline">
            Edit number
          </button>
        </p>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-label="6-digit code"
          className="field mt-3 text-center font-mono text-2xl tracking-[0.5em]"
          placeholder="------"
        />
        {devCode ? <p className="mt-1 text-xs text-ink-3">Test mode code: {devCode}</p> : null}
        <p className="mt-2 text-sm text-ink-3">
          Didn&apos;t get it?{" "}
          {resendIn > 0 ? (
            <>Resend in 0:{String(resendIn).padStart(2, "0")}</>
          ) : (
            <button type="button" onClick={() => sendCode("sms")} className="underline">
              Resend
            </button>
          )}{" "}
          &middot;{" "}
          <button type="button" onClick={() => sendCode("voice")} className="underline" disabled={resendIn > 0}>
            Call me instead
          </button>
        </p>
        <p className="mt-2 text-xs text-ink-3">This device stays verified. Next time you message, you skip this step.</p>
        {error ? <p role="alert" className="mt-3 text-sm font-semibold text-btn">{error}</p> : null}
        <button type="button" disabled={busy || code.length !== 6} onClick={verifyAndSend} className="btn btn-primary mt-4 w-full">
          {busy ? <Spinner /> : null} Verify and send
        </button>
      </div>
    );
  }

  const half = "sm:col-span-1";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (verified) {
          const bad = problem();
          if (bad) return setError(bad);
          submit();
        } else sendCode("sms");
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {p.quickQuestions?.length ? (
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {p.quickQuestions.map((q) => (
            <button key={q} type="button" className="chip !bg-white border border-line text-sm" onClick={() => setMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      ) : null}
      <label className="sm:col-span-2">
        <span className="label">{p.messageLabel ?? "Your message"}</span>
        <textarea className="field min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1500} required />
      </label>
      {(p.extraFields ?? []).map((f) => (
        <label key={f.name} className={f.half ? half : "sm:col-span-2"}>
          {f.kind === "checkbox" ? (
            <span className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-btn"
                checked={fields[f.name] === "yes"}
                onChange={(e) => setFields((s) => ({ ...s, [f.name]: e.target.checked ? "yes" : "" }))}
                required={f.required}
              />
              {f.label}
            </span>
          ) : (
            <>
              <span className="label">
                {f.label}
                {f.required ? "" : " (optional)"}
              </span>
              {f.kind === "select" ? (
                <select className="field" value={fields[f.name] ?? ""} onChange={(e) => setFields((s) => ({ ...s, [f.name]: e.target.value }))} required={f.required}>
                  <option value="">Choose...</option>
                  {f.options?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.kind === "textarea" ? (
                <textarea className="field min-h-20" value={fields[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => setFields((s) => ({ ...s, [f.name]: e.target.value }))} />
              ) : (
                <input className="field" value={fields[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => setFields((s) => ({ ...s, [f.name]: e.target.value }))} required={f.required} />
              )}
            </>
          )}
        </label>
      ))}
      {p.allowUploads ? (
        <div className="sm:col-span-2">
          <span className="label">Photos and video (label or data plate photo helps)</span>
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line bg-white p-5 text-center text-sm hover:border-leaf">
            <Image src="/kili/box.webp" alt="" width={70} height={50} className="h-12 w-auto" />
            <span className="mt-2 font-semibold">Add photos or a short video</span>
            <span className="text-ink-3">Up to 10 files. Photo location data is removed.</span>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime"
              className="sr-only"
              onChange={(e) => setFiles((cur) => [...cur, ...Array.from(e.target.files ?? [])].slice(0, 10))}
            />
          </label>
          {files.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <li key={`${f.name}${i}`} className="chip !bg-white border border-line text-xs">
                  {f.name.slice(0, 24)}
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <label className={half}>
        <span className="label">Your name</span>
        <input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
      </label>
      <label className={half}>
        <span className="label">Mobile number</span>
        <span className="flex items-center gap-2">
          <span className="rounded-xl bg-cream-2 px-3 py-2.5 text-sm font-semibold">+1</span>
          <input
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            disabled={Boolean(verified)}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="(201) 555-0123"
          />
        </span>
        {verified ? <span className="mt-1 block text-xs text-leaf">Verified on this device</span> : null}
      </label>
      {p.askEmail ? (
        <label className="sm:col-span-2">
          <span className="label">Email (optional)</span>
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
        </label>
      ) : null}
      <input ref={trap} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <p className="text-xs text-ink-3 sm:col-span-2">
        By sending, you agree ChipKili may text you about this request. Msg and data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help.{" "}
        <Link href="/privacy" className="underline">Privacy</Link>
      </p>
      {error ? <p role="alert" className="text-sm font-semibold text-btn sm:col-span-2">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn btn-primary sm:col-span-2">
        {busy ? <Spinner /> : null}
        {busy ? "Sending code..." : verified ? (p.submitLabel ?? "Send") : "Send code to my phone"}
      </button>
      {!verified ? <p className="text-center text-xs text-ink-3 sm:col-span-2">You&apos;ll confirm your phone with a text code. No account needed.</p> : null}
    </form>
  );
}

function Spinner() {
  return (
    <span className="relative inline-block size-5" aria-hidden>
      <span className="kili-orbit absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kili/top1.webp" alt="" className="absolute -top-1 left-1/2 h-3 w-auto -translate-x-1/2" />
      </span>
    </span>
  );
}
