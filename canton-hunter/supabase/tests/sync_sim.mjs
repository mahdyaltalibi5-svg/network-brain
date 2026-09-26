// End-to-end sync simulation: two "phones" running the same algorithm as apps/mobile/src/lib/sync.ts
// (outbox of patches → mergePatches → sync_push; sync_pull with cursors → applyPending) against real Postgres.
// Run by run-local.sh after the SQL tests. Exits non-zero on failure.
import pg from "pg";
import { mergePatches, applyPending, uuidv7 } from "../../packages/core/src/sync.ts";

const TABLE_ORDER = new Map([
  "profiles","config","hunt_items","hall_assignments","suppliers","supplier_dupe_candidates","finds","media","votes","pings",
  "research","cost_calcs","scores","pipeline_events","vetting","samples","content_items","launches","launch_metrics",
].map((t, i) => [t, i]));

let failures = 0;
const check = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { failures++; console.log(`  ✗ ${msg}`); } };

class Phone {
  constructor(name, userId) { this.name = name; this.userId = userId; this.rows = new Map(); this.outbox = []; this.cursors = {}; this.seq = 0; }
  async connect() {
    this.db = new pg.Client();
    await this.db.connect();
    await this.db.query("set role authenticated");
    await this.db.query(`set request.jwt.claim.sub = '${this.userId}'`);
  }
  t(tbl) { if (!this.rows.has(tbl)) this.rows.set(tbl, new Map()); return this.rows.get(tbl); }
  now() { return new Date(Date.now() - 60_000 + this.seq * 10).toISOString(); } // past-dated so the server clamp never triggers
  insert(tbl, values) {
    const row = { deleted_at: null, created_by: this.userId, ...values, id: values.id ?? uuidv7(), created_at: this.now(), updated_at: this.now() };
    this.t(tbl).set(row.id, row);
    this.outbox.push({ seq: ++this.seq, tbl, row_id: row.id, patch: row });
    return row;
  }
  patch(tbl, id, changes) {
    const ts = this.now();
    this.t(tbl).set(id, { ...this.t(tbl).get(id), ...changes, updated_at: ts });
    this.outbox.push({ seq: ++this.seq, tbl, row_id: id, patch: { id, updated_at: ts, ...changes } });
  }
  async push() {
    const entries = this.outbox.slice(0, 300);
    if (!entries.length) return;
    const byTable = new Map();
    for (const e of entries) byTable.set(e.tbl, [...(byTable.get(e.tbl) ?? []), e.patch]);
    const changes = [...byTable.entries()].sort(([a], [b]) => TABLE_ORDER.get(a) - TABLE_ORDER.get(b))
      .flatMap(([table, patches]) => mergePatches(patches).map((row) => ({ table, row })));
    const { rows } = await this.db.query("select public.sync_push($1::jsonb) as r", [JSON.stringify(changes)]);
    const accepted = new Set(rows[0].r.accepted);
    this.outbox = this.outbox.filter((e) => !(entries.includes(e) && accepted.has(e.row_id)));
    return rows[0].r;
  }
  async pull(lim = 500) {
    let pages = 0;
    for (let page = 0; page < 50; page++) {
      const { rows } = await this.db.query("select public.sync_pull($1::jsonb, $2, $3) as r", [JSON.stringify(this.cursors), lim, page === 0 ? 10 : 0]);
      const res = rows[0].r;
      pages++;
      for (const [tbl, list] of Object.entries(res.rows)) {
        for (const r of list) {
          const pending = this.outbox.filter((e) => e.tbl === tbl && e.row_id === r.id).map((e) => e.patch);
          this.t(tbl).set(r.id, applyPending(r, pending));
        }
      }
      this.cursors = { ...this.cursors, ...res.cursors };
      if (!res.more) break;
    }
    return pages;
  }
  async sync() { await this.push(); await this.pull(); }
}

const admin = new pg.Client();
await admin.connect();
const A_ID = "00000000-0000-0000-0000-0000000000a1", B_ID = "00000000-0000-0000-0000-0000000000b1";
await admin.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'a@x','{"name":"A"}'),($2,'b@x','{"name":"B"}') on conflict do nothing`, [A_ID, B_ID]);
const A = new Phone("A", A_ID), B = new Phone("B", B_ID);
await A.connect(); await B.connect();

console.log("1. offline captures on two phones merge");
const fa = A.insert("finds", { captured_by: A_ID, captured_at: A.now(), hall: "11.2", gut: "fire", transcript: "lamp two ten", tags_ai: [], certifications: [], stage: "found" });
const ma = A.insert("media", { find_id: fa.id, kind: "product_photo", upload_state: "pending", mime: "image/jpeg" });
const fb = B.insert("finds", { captured_by: B_ID, captured_at: B.now(), hall: "9.1", gut: "good", tags_ai: [], certifications: [], stage: "found" });
await A.sync(); await B.sync(); await A.pull();
check(A.t("finds").has(fb.id) && B.t("finds").has(fa.id), "both phones see both finds");
check(B.t("media").get(ma.id)?.find_id === fa.id, "media row arrived with its find");

console.log("2. server AI fill + offline edit on the same row both survive");
A.patch("finds", fa.id, { gut: "good" });                         // A edits offline
await admin.query("update public.finds set title_ai = 'LED Sunset Lamp', processing_state = 'done' where id = $1", [fa.id]); // worker
await A.pull();                                                     // pull while A's patch is still pending
check(A.t("finds").get(fa.id).gut === "good", "pending local edit still shown after pull");
check(A.t("finds").get(fa.id).title_ai === "LED Sunset Lamp", "AI title visible on the phone");
await A.sync();
const s1 = (await admin.query("select gut, title_ai from public.finds where id = $1", [fa.id])).rows[0];
check(s1.gut === "good" && s1.title_ai === "LED Sunset Lamp", "server has both the edit and the AI fill");

console.log("3. two phones edit different fields of the same find offline");
await B.pull();
A.patch("finds", fb.id, { hall: "9.2" });
B.patch("finds", fb.id, { moq: 500 });
await B.sync(); await A.sync(); await B.pull();
const s2 = (await admin.query("select hall, moq from public.finds where id = $1", [fb.id])).rows[0];
check(s2.hall === "9.2" && s2.moq === 500, "server keeps both edits");
check(B.t("finds").get(fb.id).hall === "9.2" && B.t("finds").get(fb.id).moq === 500, "B has both edits after one pull");
await A.pull();
check(A.t("finds").get(fb.id).moq === 500 && B.t("finds").get(fb.id).hall === "9.2", "both phones have both edits");

console.log("4. AI columns cannot be overwritten by a stale phone");
A.patch("finds", fa.id, { title_ai: "stale junk", processing_state: "pending" });
await A.sync();
const s3 = (await admin.query("select title_ai, processing_state from public.finds where id = $1", [fa.id])).rows[0];
check(s3.title_ai === "LED Sunset Lamp" && s3.processing_state === "done", "protected columns ignored");
check(A.t("finds").get(fa.id).title_ai === "LED Sunset Lamp", "phone corrected on next pull");

console.log("5. paging: 1,200 new rows arrive in pages");
for (let i = 0; i < 1200; i++) B.insert("hunt_items", { title: `item ${i}`, priority: 3, source_urls: [] });
while (B.outbox.length) await B.push();
const pages = await A.pull(500);
check(A.t("hunt_items").size === 1200, `A received all 1200 hunt items (${pages} pages)`);

console.log("6. re-pulling is idempotent");
const before = JSON.stringify([...A.t("finds").values()].sort((x, y) => x.id.localeCompare(y.id)));
A.cursors = {}; await A.pull();
check(JSON.stringify([...A.t("finds").values()].sort((x, y) => x.id.localeCompare(y.id))) === before, "same state after a full re-pull");

console.log("7. a media upload completes the find and queues AI processing once");
A.patch("media", ma.id, { upload_state: "uploaded", storage_path: `finds/${fa.id}/${ma.id}.jpg` });
await admin.query("update public.finds set processing_state = 'pending' where id = $1", [fa.id]);
await A.sync();
const jobs = (await admin.query("select count(*)::int n from public.jobs where type = 'process_find' and payload->>'find_id' = $1 and status = 'queued'", [fa.id])).rows[0].n;
check(jobs === 1, "exactly one process_find job queued");

await A.db.end(); await B.db.end(); await admin.end();
if (failures) { console.log(`SYNC SIM FAILED (${failures})`); process.exit(1); }
console.log("SYNC SIM PASSED");
