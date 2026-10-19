import Link from "next/link";

export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  const items = [{ name: "Home", path: "/" }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="text-[0.75rem] uppercase tracking-[0.18em] text-ivory-dim">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-gold">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.path} className="hover:text-ivory">
                    {c.name}
                  </Link>
                  <span aria-hidden="true" className="text-stone">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
