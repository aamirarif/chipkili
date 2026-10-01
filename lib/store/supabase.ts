import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectionName, DocStore } from "./index";

/**
 * Production backend. Schema "chipkili" holds one table per collection:
 *   id text primary key, doc jsonb not null, updated_at timestamptz default now()
 * See supabase/0001_chipkili_schema.txt. Server-side only (service role key).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, "chipkili", "chipkili">;
let client: Client | null = null;

function db(): Client {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when DATA_BACKEND=supabase");
  const c: Client = createClient(url, key, { db: { schema: "chipkili" }, auth: { persistSession: false } });
  client = c;
  return c;
}

const PAGE = 1000;

function idOf(doc: unknown): string {
  const d = doc as { id?: string; code?: string };
  const id = d.id ?? d.code;
  if (!id) throw new Error("document has no id");
  return id;
}

export function supabaseStore(): DocStore {
  return {
    async list(name: CollectionName) {
      const out: unknown[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db().from(name).select("doc").range(from, from + PAGE - 1);
        if (error) throw new Error(`list ${name}: ${error.message}`);
        out.push(...(data ?? []).map((r) => r.doc));
        if (!data || data.length < PAGE) break;
      }
      return out as never;
    },
    async get(name: CollectionName, id: string) {
      const { data, error } = await db().from(name).select("doc").eq("id", id).maybeSingle();
      if (error) throw new Error(`get ${name}: ${error.message}`);
      return (data?.doc ?? null) as never;
    },
    async put(name: CollectionName, doc: unknown) {
      const { error } = await db()
        .from(name)
        .upsert({ id: idOf(doc), doc, updated_at: new Date().toISOString() });
      if (error) throw new Error(`put ${name}: ${error.message}`);
    },
    async insert(name: CollectionName, doc: unknown) {
      const { error } = await db().from(name).insert({ id: idOf(doc), doc, updated_at: new Date().toISOString() });
      if (!error) return true;
      if (error.code === "23505") return false; // id already taken
      throw new Error(`insert ${name}: ${error.message}`);
    },
    /** Optimistic: re-reads and retries if the row changed in between (checked on updated_at). */
    async update(name: CollectionName, id: string, change: (doc: never) => unknown) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await db().from(name).select("doc, updated_at").eq("id", id).maybeSingle();
        if (error) throw new Error(`update ${name}: ${error.message}`);
        if (!data) return null as never;
        const next = change(data.doc as never);
        const { data: written, error: werr } = await db()
          .from(name)
          .update({ doc: next, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("updated_at", data.updated_at)
          .select("id");
        if (werr) throw new Error(`update ${name}: ${werr.message}`);
        if (written && written.length) return next as never;
      }
      throw new Error(`update ${name}: too many concurrent changes, try again`);
    },
    async remove(name: CollectionName, id: string) {
      const { error } = await db().from(name).delete().eq("id", id);
      if (error) throw new Error(`remove ${name}: ${error.message}`);
    },
  };
}
