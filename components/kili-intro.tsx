/**
 * The Kili intro on About: crawls in, spots the chip, snatches it, one bite, wink,
 * curls into the ring, then the ChipKili wordmark and slogan. CSS only.
 * Reduced-motion visitors see the final logo straight away.
 */
const FRAMES = ["/kili/walk.webp", "/kili/frame1.webp", "/kili/frame2.webp", "/kili/frame3.webp", "/kili/frame5.webp", "/kili/face-wink.webp"];
const STEP = 1.1; // seconds per pose

export function KiliIntro() {
  const total = FRAMES.length * STEP;
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md" aria-label="ChipKili: See It. Grab It. Go.">
      <style>{`
        @keyframes ck-pose { 0% { opacity: 0 } 3% { opacity: 1 } ${((STEP / (total + 2.5)) * 100).toFixed(1)}% { opacity: 1 } ${((STEP / (total + 2.5)) * 100 + 3).toFixed(1)}% { opacity: 0 } 100% { opacity: 0 } }
        @keyframes ck-final { 0%, ${((total / (total + 2.5)) * 100).toFixed(1)}% { opacity: 0; transform: scale(.9) } ${((total / (total + 2.5)) * 100 + 6).toFixed(1)}%, 100% { opacity: 1; transform: scale(1) } }
        @media (prefers-reduced-motion: reduce) { .ck-pose { display: none } .ck-final { opacity: 1 !important; animation: none !important } }
      `}</style>
      {FRAMES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`ck-pose absolute inset-0 m-auto h-3/4 w-auto object-contain opacity-0 ${i === 0 ? "kili-crawl-in" : ""}`}
          style={{ animation: `ck-pose ${total + 2.5}s ${i * STEP}s both` }}
        />
      ))}
      <div className="ck-final absolute inset-0 flex flex-col items-center justify-center opacity-0" style={{ animation: `ck-final ${total + 2.5}s both` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full.webp" alt="ChipKili" className="h-full w-auto object-contain" />
      </div>
    </div>
  );
}
