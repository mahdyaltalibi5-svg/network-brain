import type { Coa, Product } from "@/lib/products";
import { ArrowRight, Download } from "./icons";

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-xs">
      <span className="text-pep-ink/50">{label}</span>
      <span className={`text-right font-semibold ${value ? "text-pep-ink" : "text-pep-ink/35"}`}>{value || "Posting soon"}</span>
    </div>
  );
}

export function CoaActions({ coa, small = false }: { coa?: Coa; small?: boolean }) {
  const cls = `inline-flex items-center gap-1.5 rounded-full font-semibold ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-xs"}`;
  if (!coa?.url) return <span className={`${cls} bg-pep-cloud text-pep-ink/40`}>PDF posting soon</span>;
  return (
    <span className="flex gap-2">
      <a href={coa.url} target="_blank" rel="noreferrer" className={`${cls} bg-pep-blue text-white`}>
        View
      </a>
      <a href={coa.url} download className={`${cls} text-pep-blue ring-1 ring-pep-blue/30 hover:bg-pep-blue/5`}>
        <Download /> Download
      </a>
    </span>
  );
}

// One certificate card per size, shown inline on the product page.
export function CoaCards({ product }: { product: Product }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pep-blue">Certificates of analysis</p>
        <a href={`/coas#${product.slug}`} className="group inline-flex items-center gap-1 text-xs font-semibold text-pep-blue">
          COA library <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {product.sizes.map((s) => (
          <li key={s.label} className="w-60 shrink-0 snap-start rounded-3xl bg-white p-4 ring-1 ring-pep-ink/8">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${s.coa ? "bg-pep-mint/30 text-pep-blue" : "bg-pep-cloud text-pep-ink/45"}`}>
              {s.coa ? "Latest batch" : "In testing"}
            </span>
            <p className="mt-3 font-display text-2xl font-semibold text-pep-ink">{s.coa?.purity ? `${s.coa.purity}` : "≥99% target"}</p>
            <p className="text-[11px] uppercase tracking-wider text-pep-ink/45">Purity (HPLC)</p>
            <div className="mt-3 divide-y divide-pep-ink/6">
              <Row label="Variant" value={s.label} />
              <Row label="Batch" value={s.coa?.batch} />
              <Row label="Form" value="Lyophilized powder" />
              <Row label="Lab" value={s.coa?.lab} />
              <Row label="Tested" value={s.coa?.tested} />
            </div>
            <div className="mt-3">
              <CoaActions coa={s.coa} small />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
