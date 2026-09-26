// Job worker. pg_cron calls this every minute (see migrations/..._storage_cron.sql) with x-worker-secret.
// It claims queued jobs (FOR UPDATE SKIP LOCKED), runs them, and records success/failure with backoff.
import { db, type Row } from "../_shared/db.ts";
import { env } from "../_shared/env.ts";
import { launchActivate, launchBuild, launchPause, launchPlan, metricsPull } from "./jobs/launch.ts";
import { processFind } from "./jobs/processFind.ts";
import { buildHuntList, researchFind } from "./jobs/research.ts";
import { scoreFind } from "./jobs/scoreFind.ts";
import { contentPack, exportBackup, morningDigest, sendPing } from "./jobs/team.ts";

// deno-lint-ignore no-explicit-any
type Handler = (payload: any) => Promise<Row>;
const HANDLERS: Record<string, Handler> = {
  process_find: processFind,
  score_find: scoreFind,
  research_find: researchFind,
  build_hunt_list: buildHuntList,
  send_ping: sendPing,
  morning_digest: morningDigest,
  content_pack: contentPack,
  export_backup: exportBackup,
  launch_plan: launchPlan,
  launch_build: launchBuild,
  launch_activate: launchActivate,
  launch_pause: launchPause,
  metrics_pull: metricsPull,
};

/** Stop claiming new work after this long; in-flight jobs finish. Keep under the Edge Function wall clock. */
const CLAIM_WINDOW_MS = 50_000;
const BATCH = 4;

async function runJob(job: Row): Promise<void> {
  const handler = HANDLERS[job.type];
  const sb = db();
  try {
    if (!handler) throw new Error(`no handler for job type ${job.type}`);
    const result = await handler(job.payload ?? {});
    await sb.rpc("finish_job", { p_id: job.id, p_ok: true, p_error: null, p_result: result ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`job ${job.type} ${job.id} failed:`, msg);
    await sb.rpc("finish_job", { p_id: job.id, p_ok: false, p_error: msg.slice(0, 2000), p_result: null });
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-worker-secret") !== env("WORKER_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }
  const started = Date.now();
  let ran = 0;
  while (Date.now() - started < CLAIM_WINDOW_MS) {
    const { data: jobs, error } = await db().rpc("claim_jobs", { n: BATCH });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!jobs?.length) break;
    await Promise.all((jobs as Row[]).map(runJob));
    ran += jobs.length;
  }
  return Response.json({ ran, ms: Date.now() - started });
});
