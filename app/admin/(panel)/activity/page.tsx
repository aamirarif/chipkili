import { store } from "lib/store";

export const metadata = { title: "Activity log" };

export default async function ActivityPage() {
  const rows = (await store().list("activity")).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 300);
  return (
    <div>
      <h1 className="heading text-3xl">Activity log</h1>
      <p className="text-ink-2">Every change in Admin, newest first.</p>
      <ul className="mt-5 divide-y divide-line rounded-2xl bg-white text-sm shadow-[var(--shadow-card)]">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
            <span>
              <b>{r.who}</b> {r.action} {r.target ? <span className="text-ink-2">{r.target}</span> : null}
            </span>
            <span className="text-ink-3">{new Date(r.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="mt-4 text-ink-2">Nothing yet.</p> : null}
    </div>
  );
}
