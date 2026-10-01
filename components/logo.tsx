import Image from "next/image";
import Link from "next/link";

export function Logo({ size = 44, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2" aria-label="ChipKili home">
      <Image
        src="/brand/mark.webp"
        alt=""
        width={size}
        height={size}
        priority
        className="transition-transform duration-300 group-hover:-rotate-6"
      />
      <span className="wordmark text-[1.6rem] leading-none" style={{ fontSize: size * 0.58 }}>
        <span className={dark ? "text-[#7fcf8f]" : "text-chip"}>Chip</span>
        <span className="text-kili">Kili</span>
      </span>
    </Link>
  );
}
