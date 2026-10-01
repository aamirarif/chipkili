import "server-only";
import type {
  ActivityEntry,
  AnalyticsEvent,
  Category,
  Item,
  Lead,
  OtpRecord,
  Settings,
  ShareLink,
} from "lib/types";
import { fileStore } from "./file";
import { supabaseStore } from "./supabase";

/**
 * One small document store. Every collection is a set of JSON documents keyed by id.
 * Two backends share this contract: a local JSON file (development, tests) and
 * Supabase (production, schema "chipkili", one table per collection).
 */
export type Collections = {
  items: Item;
  categories: Category;
  leads: Lead;
  events: AnalyticsEvent;
  shares: ShareLink & { id: string };
  activity: ActivityEntry;
  otp: OtpRecord;
  settings: Settings & { id: string };
  counters: { id: string; value: number };
};
export type CollectionName = keyof Collections;

export interface DocStore {
  list<K extends CollectionName>(name: K): Promise<Collections[K][]>;
  get<K extends CollectionName>(name: K, id: string): Promise<Collections[K] | null>;
  put<K extends CollectionName>(name: K, doc: Collections[K]): Promise<void>;
  remove<K extends CollectionName>(name: K, id: string): Promise<void>;
  /**
   * Change one document from its latest stored version (read-modify-write in one step), so two
   * changes at the same moment cannot undo each other. Returns the new document, or null if missing.
   */
  /** Adds a document only if its id is not taken yet. Returns false when it already exists. */
  insert<K extends CollectionName>(name: K, doc: Collections[K]): Promise<boolean>;
  update<K extends CollectionName>(name: K, id: string, change: (doc: Collections[K]) => Collections[K]): Promise<Collections[K] | null>;
}

export function store(): DocStore {
  return process.env.DATA_BACKEND === "supabase" ? supabaseStore() : fileStore();
}
