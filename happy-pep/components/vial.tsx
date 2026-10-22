import { useId } from "react";

// Illustrated product vial on a soft blue gradient circle.
// Swap for real product photography whenever it's ready.
export function Vial({ name, size, cap = "#3EF5B9", className = "" }: { name: string; size: string; cap?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={`${name} ${size} vial`} className={className}>
      <defs>
        <radialGradient id={`bg${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#E3E9FF" />
          <stop offset="100%" stopColor="#C4D0FF" />
        </radialGradient>
        <linearGradient id={`glass${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#EEF2FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#D3DCFF" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="88" fill={`url(#bg${id})`} />
      <ellipse cx="100" cy="176" rx="34" ry="6" fill="#0A2BC4" opacity="0.12" />
      {/* cap */}
      <rect x="76" y="34" width="48" height="24" rx="8" fill={cap} />
      <rect x="80" y="56" width="40" height="8" rx="3" fill="#C9D2F5" />
      {/* body */}
      <rect x="70" y="62" width="60" height="112" rx="16" fill={`url(#glass${id})`} stroke="#B9C6FA" strokeWidth="2" />
      {/* shine, drawn under the label */}
      <rect x="76" y="70" width="5" height="94" rx="2.5" fill="#FFFFFF" opacity="0.8" />
      {/* label */}
      <rect x="82" y="96" width="44" height="54" rx="8" fill="#FFFFFF" />
      <text x="104" y="112" textAnchor="middle" fontFamily="var(--font-fredoka), sans-serif" fontWeight="600" fontSize="8" fill="#0A2BC4">
        happy pep
      </text>
      <path d="M95 116 Q104 122 113 116" stroke="#3EF5B9" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <text x="104" y="133" textAnchor="middle" fontFamily="var(--font-inter), sans-serif" fontWeight="700" fontSize={name.length > 9 ? 5.5 : name.length > 6 ? 6.5 : 7.5} fill="#0B0F2E">
        {name}
      </text>
      <text x="104" y="143" textAnchor="middle" fontFamily="var(--font-inter), sans-serif" fontSize="6.5" fill="#0B0F2E" opacity="0.6">
        {size}
      </text>
    </svg>
  );
}
