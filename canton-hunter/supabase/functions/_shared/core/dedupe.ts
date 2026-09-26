/** Supplier dedupe: normalization + matching. Pure, used on the server. */

export interface SupplierKeys {
  id: string;
  name_en: string | null;
  name_cn: string | null;
  phones: string[];
  emails: string[];
  wechat_id: string | null;
  booth_code: string | null;
}

export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("+")) {
    d = "+" + d.slice(1).replace(/\+/g, "");
  } else if (/^1[3-9]\d{9}$/.test(d)) {
    d = "+86" + d; // China mobile
  } else if (d.startsWith("0") && d.length >= 10) {
    d = "+86" + d.slice(1); // China landline with trunk 0
  } else if (d.startsWith("86") && d.length >= 12) {
    d = "+" + d;
  } else if (d.length === 10) {
    d = "+1" + d;
  }
  const digits = d.replace(/\D/g, "");
  return digits.length >= 8 ? d : null;
}

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

const SUFFIXES_EN = [
  "co., ltd.", "co., ltd", "co.,ltd.", "co.,ltd", "co ltd", "company limited", "limited", "ltd.", "ltd",
  "inc.", "inc", "corporation", "corp.", "corp", "llc", "co.", "trading", "industrial", "industry",
  "manufacturing", "manufacturer", "factory", "technology", "tech", "group", "international",
  "import & export", "import and export", "imp & exp", "imp. & exp.",
];
const SUFFIXES_CN = ["有限责任公司", "股份有限公司", "有限公司", "公司", "贸易", "实业", "工厂", "厂", "科技", "集团", "进出口"];
const CITY_PREFIXES_EN = ["guangzhou", "shenzhen", "yiwu", "ningbo", "dongguan", "foshan", "zhejiang", "guangdong", "shantou", "xiamen", "hangzhou", "shanghai"];
const CITY_PREFIXES_CN = ["广州市", "广州", "深圳市", "深圳", "义乌市", "义乌", "宁波市", "宁波", "东莞市", "东莞", "佛山市", "佛山", "浙江省", "浙江", "广东省", "广东", "汕头市", "汕头", "厦门", "杭州", "上海"];

export function normalizeCompanyName(raw: string | null): string {
  if (!raw) return "";
  let s = raw.toLowerCase().replace(/[()（）]/g, " ").replace(/\s+/g, " ").trim();
  for (const c of CITY_PREFIXES_CN) if (s.startsWith(c)) s = s.slice(c.length);
  for (let changed = true; changed; ) {
    changed = false;
    for (const suf of [...SUFFIXES_EN, ...SUFFIXES_CN]) {
      if (s.endsWith(suf)) {
        s = s.slice(0, -suf.length).trim().replace(/[,.\s]+$/, "");
        changed = true;
      }
    }
  }
  const words = s.split(" ").filter((w) => w && !CITY_PREFIXES_EN.includes(w));
  return words.join(" ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

export function normalizeBooth(raw: string | null): string | null {
  if (!raw) return null;
  const b = raw.toUpperCase().replace(/\s+/g, "").replace(/[–—]/g, "-");
  return b || null;
}

/** Parse Canton Fair booth codes like "11.2A15", "11.2 A 15", "9.1-C23". */
export function parseBoothCode(raw: string): { hall: string; booth: string } | null {
  const m = raw.toUpperCase().match(/(\d{1,2}\.\d)\s*[- ]?\s*([A-Z])\s*[- ]?\s*(\d{1,3}(?:-\d{1,3})?)/);
  if (!m) return null;
  return { hall: m[1]!, booth: `${m[1]}${m[2]}${m[3]}` };
}

function trigrams(s: string): Set<string> {
  const t = new Set<string>();
  const p = `  ${s} `;
  for (let i = 0; i < p.length - 2; i++) t.add(p.slice(i, i + 3));
  return t;
}

/** pg_trgm-style similarity in [0, 1]. For CJK strings uses character bigrams. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const cjk = /[一-鿿]/.test(a + b);
  const grams = (s: string) => {
    if (!cjk) return trigrams(s);
    const g = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
    if (s.length === 1) g.add(s);
    return g;
  };
  const A = grams(a);
  const B = grams(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export type DedupeResult =
  | { kind: "auto"; id: string; reasons: string[] }
  | { kind: "candidate"; id: string; score: number; reasons: string[] }
  | { kind: "none" };

export const CANDIDATE_THRESHOLD = 0.6;

export function findSupplierMatch(incoming: Omit<SupplierKeys, "id">, existing: SupplierKeys[]): DedupeResult {
  const inPhones = new Set(incoming.phones.map(normalizePhone).filter(Boolean) as string[]);
  const inEmails = new Set(incoming.emails.map(normalizeEmail).filter(Boolean) as string[]);
  const inWechat = incoming.wechat_id?.trim().toLowerCase() || null;
  const inBooth = normalizeBooth(incoming.booth_code);
  const inEn = normalizeCompanyName(incoming.name_en);
  const inCn = normalizeCompanyName(incoming.name_cn);

  let best: { id: string; score: number; reasons: string[] } | null = null;
  for (const s of existing) {
    const reasons: string[] = [];
    if (s.phones.some((p) => { const n = normalizePhone(p); return n != null && inPhones.has(n); })) reasons.push("same phone");
    if (s.emails.some((e) => { const n = normalizeEmail(e); return n != null && inEmails.has(n); })) reasons.push("same email");
    if (inWechat && s.wechat_id?.trim().toLowerCase() === inWechat) reasons.push("same WeChat");
    if (inBooth && normalizeBooth(s.booth_code) === inBooth) reasons.push("same booth");
    if (reasons.length) return { kind: "auto", id: s.id, reasons };

    const sim = Math.max(
      similarity(inEn, normalizeCompanyName(s.name_en)),
      similarity(inCn, normalizeCompanyName(s.name_cn)),
    );
    if (sim >= CANDIDATE_THRESHOLD && (!best || sim > best.score)) best = { id: s.id, score: sim, reasons: [`similar name (${sim.toFixed(2)})`] };
  }
  return best ? { kind: "candidate", ...best } : { kind: "none" };
}

// ---------- same product at different booths ----------
export const GROUP_THRESHOLD = 0.55;

export function normalizeProductKey(k: string | null | undefined): string {
  return (k ?? "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Pick the product group for a find: the group of the most similar existing key (>= threshold),
 * else a brand-new group. Excludes the find itself.
 */
export function assignProductGroup(
  key: string,
  others: { id: string; product_key_ai: string | null; product_group_id: string | null }[],
  newId: () => string,
): { groupId: string; matchedFindId: string | null; score: number } {
  const k = normalizeProductKey(key);
  let best: { groupId: string; findId: string; score: number } | null = null;
  for (const o of others) {
    if (!o.product_key_ai || !o.product_group_id) continue;
    const sc = similarity(k, normalizeProductKey(o.product_key_ai));
    if (sc >= GROUP_THRESHOLD && (!best || sc > best.score)) best = { groupId: o.product_group_id, findId: o.id, score: sc };
  }
  return best ? { groupId: best.groupId, matchedFindId: best.findId, score: best.score } : { groupId: newId(), matchedFindId: null, score: 0 };
}
