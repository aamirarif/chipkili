type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };

export const SearchIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const PinIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const HeartIcon = ({ className = "size-5", filled = false }: P & { filled?: boolean }) => (
  <svg {...base} fill={filled ? "currentColor" : "none"} className={className}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
);
export const ChatIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M4 5h16v11H9l-5 4V5Z" /></svg>
);
export const ShareIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6h14v-6" /></svg>
);
export const ChevronIcon = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}><path d="m9 6 6 6-6 6" /></svg>
);
export const CloseIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const MenuIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const HomeIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" /></svg>
);
export const TagIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>
);
export const PhoneIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
);
export const FilterIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
export const PlayIcon = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M8 5v14l11-7L8 5Z" /></svg>
);
export const CheckIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="m5 12 4 4 10-10" /></svg>
);
