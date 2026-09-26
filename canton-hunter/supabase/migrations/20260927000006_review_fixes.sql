-- Fixes from code review.

-- 1. score_find upserts cost_calcs with unchanged inputs; only a real change to inputs should rescore
drop trigger if exists cost_calcs_rescore on public.cost_calcs;
create trigger cost_calcs_rescore_ins after insert on public.cost_calcs
  for each row execute function public.trg_rescore();
create trigger cost_calcs_rescore_upd after update of inputs on public.cost_calcs
  for each row when (old.inputs is distinct from new.inputs) execute function public.trg_rescore();

-- 4. never claim or requeue a job past max_attempts; stale ones that ran out become errors
create or replace function public.claim_jobs(n int default 5) returns setof public.jobs
language sql security definer set search_path = public as $$
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now() and attempts < max_attempts
    order by run_after, created_at
    limit n
    for update skip locked
  )
  returning j.*
$$;

create or replace function public.requeue_stale_jobs() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- out of attempts: give up (and surface it on the find)
  update public.finds f set processing_state = 'error'
  from public.jobs j
  where j.status = 'running' and j.locked_at < now() - interval '10 minutes' and j.attempts >= j.max_attempts
    and j.type = 'process_find' and f.id = (j.payload->>'find_id')::uuid;
  update public.jobs set status = 'error', last_error = coalesce(last_error, 'timed out'), updated_at = now()
  where status = 'running' and locked_at < now() - interval '10 minutes' and attempts >= max_attempts;
  -- drop stale running jobs that already have a queued twin, then requeue the rest
  delete from public.jobs s where s.status = 'running' and s.locked_at < now() - interval '10 minutes'
    and s.payload ? 'find_id'
    and exists (select 1 from public.jobs q where q.status = 'queued' and q.type = s.type and q.payload->>'find_id' = s.payload->>'find_id');
  update public.jobs set status = 'queued', locked_at = null, updated_at = now()
  where status = 'running' and locked_at < now() - interval '10 minutes';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.claim_jobs(int), public.requeue_stale_jobs() from public, anon, authenticated;
