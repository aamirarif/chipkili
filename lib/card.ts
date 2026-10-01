import { CONDITION_LABEL } from "lib/types";

export type CardData = {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number;
  condition: keyof typeof CONDITION_LABEL;
  town: string;
  miles: number;
  status: string;
  createdAt: string;
  media: { kind: string; thumb: string; src: string; alt?: string }[];
};

export function toCardData<T extends CardData>(c: T): CardData {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    price: c.price,
    originalPrice: c.originalPrice,
    condition: c.condition,
    town: c.town,
    miles: c.miles,
    status: c.status,
    createdAt: c.createdAt,
    media: c.media.slice(0, 2).map((m) => ({ kind: m.kind, thumb: m.thumb, src: m.src, alt: m.alt })),
  };
}
