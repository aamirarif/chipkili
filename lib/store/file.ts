import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CollectionName, Collections, DocStore } from "./index";

type Db = { [K in CollectionName]?: Record<string, Collections[K]> };

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/**
 * One shared state per Node process. Next.js loads server code in several separate bundles
 * (pages, route handlers, server actions); a plain module variable would give each bundle its
 * own stale copy and one bundle's save would wipe another's. globalThis is shared by all of them.
 * The file's modified time is checked on every read, so a second process is picked up too.
 */
type Shared = { db: Db | null; mtime: number; queue: Promise<unknown> };
const g = globalThis as unknown as { __chipkiliFileStore?: Shared };
const shared: Shared = (g.__chipkiliFileStore ??= { db: null, mtime: 0, queue: Promise.resolve() });

async function load(): Promise<Db> {
  let mtime = 0;
  try {
    mtime = (await fs.stat(DB_FILE)).mtimeMs;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return (shared.db ??= {});
  }
  if (!shared.db || mtime !== shared.mtime) {
    shared.db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Db;
    shared.mtime = mtime;
  }
  return shared.db;
}

/** Every change runs one at a time: read the latest file, apply, write atomically. */
function mutate(change: (db: Db) => Db): Promise<void> {
  const run = shared.queue.then(async () => {
    const next = change(await load());
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next));
    await fs.rename(tmp, DB_FILE);
    shared.db = next;
    shared.mtime = (await fs.stat(DB_FILE)).mtimeMs;
  });
  shared.queue = run.catch(() => undefined);
  return run;
}

function idOf(doc: unknown): string {
  const d = doc as { id?: string; code?: string };
  const id = d.id ?? d.code;
  if (!id) throw new Error("document has no id");
  return id;
}

export function fileStore(): DocStore {
  return {
    async list(name) {
      await shared.queue;
      const db = await load();
      return Object.values(db[name] ?? {}) as never;
    },
    async get(name, id) {
      await shared.queue;
      const db = await load();
      return (((db[name] ?? {}) as Record<string, unknown>)[id] ?? null) as never;
    },
    async put(name, doc) {
      await mutate((db) => ({ ...db, [name]: { ...(db[name] ?? {}), [idOf(doc)]: doc } }));
    },
    async insert(name, doc) {
      let added = false;
      const id = idOf(doc);
      await mutate((db) => {
        if (((db[name] ?? {}) as Record<string, unknown>)[id]) return db;
        added = true;
        return { ...db, [name]: { ...(db[name] ?? {}), [id]: doc } };
      });
      return added;
    },
    async update(name, id, change) {
      let out: unknown = null;
      await mutate((db) => {
        const cur = ((db[name] ?? {}) as Record<string, unknown>)[id];
        if (!cur) return db;
        out = change(cur as never);
        return { ...db, [name]: { ...(db[name] ?? {}), [id]: out } };
      });
      return out as never;
    },
    async remove(name, id) {
      await mutate((db) => {
        const { [id]: _gone, ...rest } = (db[name] ?? {}) as Record<string, unknown>;
        return { ...db, [name]: rest } as Db;
      });
    },
  };
}
