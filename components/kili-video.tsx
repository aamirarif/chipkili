"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Aamir's approved ChipKili logo animation (commercial_factory/chipkili_logo, v1 2026-10-01).
 * mode "loop":  the silent 3 s living logo, looping.
 * mode "intro": the 11.8 s intro plays once (muted, as browsers require), then hands off to the
 *               loop forever; "Play with sound" restarts the intro with sound.
 * Visitors who ask for reduced motion see the still logo.
 */
export function KiliVideo({ mode, className = "" }: { mode: "loop" | "intro"; className?: string }) {
  const intro = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState<"intro" | "loop">(mode === "intro" ? "intro" : "loop");
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function withSound() {
    const v = intro.current;
    setStage("intro");
    requestAnimationFrame(() => {
      if (!intro.current) return;
      intro.current.currentTime = 0;
      intro.current.muted = false;
      intro.current.play().catch(() => undefined);
    });
    void v;
  }

  const box = `relative overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ${className}`;
  if (still) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/video/kili-poster.webp" alt="ChipKili logo" className={`${box} aspect-square w-full object-contain`} />;
  }
  return (
    <div className={box}>
      {stage === "intro" ? (
        <video
          ref={intro}
          src="/video/kili-intro.mp4"
          poster="/video/kili-poster.webp"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => setStage("loop")}
          className="aspect-square w-full object-contain"
          aria-label="ChipKili logo animation"
        />
      ) : (
        <video
          src={mode === "intro" ? "/video/kili-loop-720.mp4" : "/video/kili-loop.mp4"}
          poster="/video/kili-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="aspect-square w-full object-contain"
          aria-label="ChipKili logo"
        />
      )}
      {mode === "intro" ? (
        <button type="button" onClick={withSound} className="btn btn-dark absolute bottom-3 right-3 !px-3 !py-1.5 text-xs">
          Play with sound
        </button>
      ) : null}
    </div>
  );
}
