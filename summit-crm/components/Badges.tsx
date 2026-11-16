import { avatarFor, SOURCE, STAGE_COLOR } from "@/lib/ui";
import { stage as stageOf, type StageId } from "@/lib/stages";

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const a = avatarFor(name);
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-semibold ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `radial-gradient(circle at 30% 25%, ${a.fg}55, ${a.bg} 70%)`, color: a.fg }}
    >
      {a.initials}
    </span>
  );
}

export function StageBadge({ stage }: { stage: StageId }) {
  return (
    <span className="pill">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLOR[stage] }} />
      {stageOf(stage).label}
    </span>
  );
}

export function SourceBadge({ source, short = false }: { source: keyof typeof SOURCE; short?: boolean }) {
  const s = SOURCE[source];
  return (
    <span className="pill">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {short ? s.short : s.label}
    </span>
  );
}
