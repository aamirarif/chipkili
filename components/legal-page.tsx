export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, React.ReactNode][] }) {
  const id = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 px-4 pb-10 pt-8 lg:grid-cols-[220px_1fr] lg:px-6">
      <nav aria-label="On this page" className="hidden lg:block">
        <ul className="sticky top-40 space-y-2 text-sm">
          {sections.map(([h]) => (
            <li key={h}>
              <a href={`#${id(h)}`} className="text-ink-2 hover:text-ink hover:underline">
                {h}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <article className="card p-6 sm:p-10">
        <h1 className="heading text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-ink-3">Last updated {updated}</p>
        {sections.map(([h, body]) => (
          <section key={h} id={id(h)} className="mt-8 scroll-mt-40">
            <h2 className="text-xl font-bold">{h}</h2>
            <div className="mt-2 space-y-3 leading-relaxed text-ink-2">{body}</div>
          </section>
        ))}
      </article>
    </div>
  );
}
