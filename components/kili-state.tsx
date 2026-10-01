import Image from "next/image";
import Link from "next/link";

export const KILI = {
  loading: "/kili/walk.webp",
  deals: "/kili/deal.webp",
  more: "/kili/box.webp",
  sent: "/kili/chip-stand.webp",
  noResults: "/kili/sunglasses.webp",
  offline: "/kili/snack.webp",
  drop: "/kili/face-happy.webp",
  wink: "/kili/face-wink.webp",
  hunt: "/kili/sunglasses.webp",
  percent: "/kili/percent.webp",
} as const;

export function KiliState({
  pose,
  title,
  text,
  action,
  tone = "plain",
}: {
  pose: keyof typeof KILI;
  title: string;
  text?: React.ReactNode;
  action?: { href: string; label: string };
  tone?: "plain" | "sage";
}) {
  return (
    <div className={`card flex flex-col items-center px-6 py-10 text-center ${tone === "sage" ? "!bg-sage" : ""}`}>
      <Image src={KILI[pose]} alt="" width={180} height={140} className="h-32 w-auto object-contain" />
      <h2 className="wordmark mt-4 text-2xl text-ink">{title}</h2>
      {text ? <p className="mt-2 max-w-sm text-ink-2">{text}</p> : null}
      {action ? (
        <Link href={action.href} className="btn btn-dark mt-6">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
