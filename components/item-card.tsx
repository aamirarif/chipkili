import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABEL } from "lib/types";
import { formatMiles } from "lib/geo";
import { money } from "lib/site";
import { SaveButton } from "components/save-button";

export type { CardData } from "lib/card";
import type { CardData } from "lib/card";


const DAY = 864e5;

export function ItemCard({ item, priority = false, size = "md" }: { item: CardData; priority?: boolean; size?: "md" | "sm" }) {
  const photo = item.media.find((m) => m.kind === "image");
  const hasVideo = item.media.some((m) => m.kind === "video");
  const drop = item.originalPrice && item.originalPrice > item.price;
  const isNew = Date.now() - Date.parse(item.createdAt) < DAY;
  const badge =
    item.status === "pending" ? (
      <span className="badge badge-pending">Pending pickup</span>
    ) : drop ? (
      <span className="badge badge-drop">Price drop</span>
    ) : hasVideo ? (
      <span className="badge badge-video">Video</span>
    ) : isNew ? (
      <span className="badge badge-new">New today</span>
    ) : null;

  return (
    <Link href={`/i/${item.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-cream-2">
        {photo ? (
          <Image
            src={photo.src.replace(/lg\.webp$/, size === "sm" ? "th.webp" : "md.webp")}
            alt={photo.alt ?? item.title}
            fill
            sizes={size === "sm" ? "160px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"}
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-ink-3">No photo yet</div>
        )}
        {badge ? <div className="absolute left-2.5 top-2.5">{badge}</div> : null}
        <div className="absolute right-2.5 top-2.5">
          <SaveButton id={item.id} />
        </div>
      </div>
      <div className={size === "sm" ? "mt-1.5" : "mt-2.5"}>
        <p className={`font-bold ${size === "sm" ? "text-sm" : "text-lg"}`}>
          {money(item.price)}
          {drop ? <span className="ml-2 text-sm font-normal text-ink-3 line-through">{money(item.originalPrice!)}</span> : null}
        </p>
        <p className={`line-clamp-2 leading-snug text-ink ${size === "sm" ? "text-xs" : "text-[15px]"}`}>{item.title}</p>
        {size === "md" ? (
          <p className="mt-0.5 text-[13px] text-ink-3">
            {CONDITION_LABEL[item.condition]} &middot; {item.town.replace(", NJ", "")} &middot; {formatMiles(item.miles)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
