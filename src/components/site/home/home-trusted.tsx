const LOGOS = [
  "Boltshift",
  "Nietzsche",
  "Epicurious",
  "GlobalBank",
  "Acme Corp",
  "Polymath",
  "FeatherDev",
  "Catalog",
];

export function HomeTrusted() {
  return (
    <section className="border-y border-site-border/70 bg-site-bg py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-site-muted">
          Güçlü markalar tarafından tercih ediliyor
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-8">
          {LOGOS.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center text-sm font-semibold tracking-tight text-site-fg/40"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
