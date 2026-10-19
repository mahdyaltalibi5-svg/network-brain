/** Bespoke vs made-to-measure vs off-the-rack: a quotable comparison table. */
const rows: [string, string, string, string][] = [
  ["Pattern", "Drafted from scratch for you", "A stock block pattern, adjusted", "Standard sizes"],
  ["Fittings", "Typically 3 or more", "Usually 1, at the end", "None (alterations only)"],
  ["Posture & asymmetry", "Corrected in the pattern", "Partly corrected", "Not corrected"],
  ["Construction", "Usually full canvas, hand finished", "Half canvas or fused, machine made", "Mostly fused"],
  ["Typical timeline", "6–12 weeks", "3–6 weeks", "Same day + alterations"],
  ["Typical US price", "$3,000–$8,000+", "$800–$2,500", "$200–$1,500"],
];

export function ComparisonTable({ caption }: { caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table>
        {caption && <caption className="mb-4 text-left text-sm text-ivory-dim">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Attribute</span></th>
            <th scope="col">Bespoke</th>
            <th scope="col">Made-to-measure</th>
            <th scope="col">Off-the-rack</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, ...v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              {v.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
