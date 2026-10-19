import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Renders a copy string with light inline markup:
 *   [label](/href)  → link (internal links use next/link)
 *   **bold**        → <strong>
 *   [PLACEHOLDER: x] → visible placeholder marker
 */
const TOKEN = /(\[PLACEHOLDER: [^\]]+\]|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;

export function rich(text: string): ReactNode {
  const parts = text.split(TOKEN);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("[PLACEHOLDER:")) {
      return <Ph key={i}>{part.slice(14, -1)}</Ph>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/") ? (
        <Link key={i} href={href}>
          {label}
        </Link>
      ) : (
        <a key={i} href={href} rel="noopener">
          {label}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Rich({ children }: { children: string }) {
  return <>{rich(children)}</>;
}

export function Ph({ children }: { children: ReactNode }) {
  return <span className="ph">[PLACEHOLDER: {children}]</span>;
}
