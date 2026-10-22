import { Policy } from "@/components/policy";
import { products } from "@/lib/products";

export const metadata = { title: "Certificates of Analysis · Happy Pep" };

export default function Coas() {
  return (
    <Policy title="Certificates of Analysis">
      <p>Every lot is tested by an independent third-party lab (HPLC purity + mass spec identity). Find your lot number on the vial label.</p>
      <ul className="!mt-8 space-y-3 [&>li]:!ml-0 [&>li]:!list-none">
        {products.map((p) => (
          <li key={p.slug} id={p.slug} className="flex scroll-mt-32 items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4">
            <div>
              <p className="font-display text-lg font-semibold text-pep-ink">{p.name}</p>
              <p className="text-sm text-pep-ink/50">
                Lot {p.lot}
                {p.coa.purity && ` · ${p.coa.purity} purity`}
                {p.coa.lab && ` · ${p.coa.lab}`}
              </p>
            </div>
            {p.coa.url ? (
              <a href={p.coa.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-pep-blue px-4 py-2 text-sm font-semibold !text-white !no-underline">
                View COA
              </a>
            ) : (
              <span className="shrink-0 rounded-full bg-pep-cloud px-4 py-2 text-sm font-semibold text-pep-ink/50">Posting soon</span>
            )}
          </li>
        ))}
      </ul>
    </Policy>
  );
}
