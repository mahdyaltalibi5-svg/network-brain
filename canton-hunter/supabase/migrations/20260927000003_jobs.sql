-- ---------- job queue ----------
create or replace function public.enqueue_job(p_type text, p_payload jsonb, p_delay_seconds int default 0, p_created_by uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_payload ? 'find_id' then
    insert into public.jobs (type, payload, run_after, created_by)
    values (p_type, p_payload, now() + make_interval(secs => p_delay_seconds), p_created_by)
    on conflict (type, (payload->>'find_id')) where status = 'queued' and payload ? 'find_id' do nothing;
  else
    insert into public.jobs (type, payload, run_after, created_by)
    values (p_type, p_payload, now() + make_interval(secs => p_delay_seconds), p_created_by);
  end if;
end $$;

/** Claim up to n ready jobs (service role / worker). */
create or replace function public.claim_jobs(n int default 5) returns setof public.jobs
language sql security definer set search_path = public as $$
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now()
    order by run_after, created_at
    limit n
    for update skip locked
  )
  returning j.*
$$;

create or replace function public.finish_job(p_id uuid, p_ok boolean, p_error text default null, p_result jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = p_id for update;
  if not found then return; end if;
  if p_ok then
    update public.jobs set status = 'done', result = p_result, last_error = null, updated_at = now() where id = p_id;
  elsif j.attempts >= j.max_attempts then
    update public.jobs set status = 'error', last_error = p_error, updated_at = now() where id = p_id;
    if j.type = 'process_find' then
      update public.finds set processing_state = 'error', updated_at = now() where id = (j.payload->>'find_id')::uuid;
    end if;
  else
    -- exponential backoff: 30s, 2m, 8m ...; delete a conflicting queued duplicate first
    delete from public.jobs d where d.status = 'queued' and d.type = j.type and d.payload ? 'find_id'
      and d.payload->>'find_id' = j.payload->>'find_id' and d.id <> j.id;
    update public.jobs set status = 'queued', last_error = p_error, locked_at = null,
      run_after = now() + make_interval(secs => 30 * power(4, j.attempts - 1)::int), updated_at = now()
    where id = p_id;
  end if;
end $$;

create or replace function public.requeue_stale_jobs() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- drop stale running jobs that already have a queued twin, then requeue the rest
  delete from public.jobs s where s.status = 'running' and s.locked_at < now() - interval '10 minutes'
    and s.payload ? 'find_id'
    and exists (select 1 from public.jobs q where q.status = 'queued' and q.type = s.type and q.payload->>'find_id' = s.payload->>'find_id');
  update public.jobs set status = 'queued', locked_at = null, updated_at = now()
  where status = 'running' and locked_at < now() - interval '10 minutes';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- automatic enqueues ----------
/** Enqueue process_find once the find exists and all its media rows are uploaded (≥1 product photo). */
create or replace function public.maybe_enqueue_process(p_find_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare f public.finds; pending int; photos int;
begin
  select * into f from public.finds where id = p_find_id;
  if not found or f.processing_state <> 'pending' or f.deleted_at is not null then return; end if;
  select count(*) filter (where upload_state <> 'uploaded'),
         count(*) filter (where kind = 'product_photo' and upload_state = 'uploaded')
    into pending, photos
  from public.media where find_id = p_find_id and deleted_at is null and kind in ('product_photo','card_photo','qr_photo');
  if pending = 0 and photos > 0 then
    perform public.enqueue_job('process_find', jsonb_build_object('find_id', p_find_id));
  end if;
end $$;

create or replace function public.trg_media_enqueue() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.find_id is not null and new.upload_state = 'uploaded' then
    perform public.maybe_enqueue_process(new.find_id);
  end if;
  return null;
end $$;
create trigger media_enqueue after insert or update of upload_state on public.media
  for each row execute function public.trg_media_enqueue();

create or replace function public.trg_find_enqueue() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.maybe_enqueue_process(new.id);
  elsif (new.fob_price_cents, new.fob_currency, new.moq, new.unit_weight_g, new.box_dims_mm, new.lead_time_days,
         new.demo_score_ai, new.fragile, new.oem_logo, new.compliance_ai, new.compliance_override, new.giftable_ai,
         new.gut, new.stage, new.hts_guess_ai)
        is distinct from
        (old.fob_price_cents, old.fob_currency, old.moq, old.unit_weight_g, old.box_dims_mm, old.lead_time_days,
         old.demo_score_ai, old.fragile, old.oem_logo, old.compliance_ai, old.compliance_override, old.giftable_ai,
         old.gut, old.stage, old.hts_guess_ai) then
    perform public.enqueue_job('score_find', jsonb_build_object('find_id', new.id), 2);
  end if;
  return null;
end $$;
create trigger finds_enqueue after insert or update on public.finds
  for each row execute function public.trg_find_enqueue();

create or replace function public.trg_rescore() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_job('score_find', jsonb_build_object('find_id', new.find_id), 2);
  return null;
end $$;
create trigger votes_rescore after insert or update on public.votes for each row execute function public.trg_rescore();
create trigger research_rescore after insert or update on public.research for each row execute function public.trg_rescore();
create trigger cost_calcs_rescore after insert or update of inputs on public.cost_calcs for each row execute function public.trg_rescore();

create or replace function public.trg_ping_enqueue() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_job('send_ping', jsonb_build_object('ping_id', new.id));
  end if;
  return null;
end $$;
create trigger pings_enqueue after insert on public.pings for each row execute function public.trg_ping_enqueue();

-- ---------- user-requested jobs ----------
create or replace function public.request_job(p_type text, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  if p_type not in ('research_find','process_find','content_pack','build_hunt_list','metrics_pull','score_find') then
    raise exception 'job type % not allowed', p_type;
  end if;
  if p_type = 'process_find' then
    update public.finds set processing_state = 'pending', updated_at = now() where id = (p_payload->>'find_id')::uuid;
  end if;
  perform public.enqueue_job(p_type, p_payload, 0, auth.uid());
end $$;

/**
 * Launch state machine. Actions: plan, approve, build (Shopify + Meta, both PAUSED), activate, pause, kill.
 * 'activate' is the only path that spends money; it records who tapped it.
 */
create or replace function public.launch_action(p_launch_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare l public.launches;
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  select * into l from public.launches where id = p_launch_id for update;
  if not found then raise exception 'launch not found'; end if;
  case p_action
    when 'plan' then
      update public.launches set status = 'planning', last_error = null, updated_at = now() where id = l.id;
      perform public.enqueue_job('launch_plan', jsonb_build_object('launch_id', l.id), 0, auth.uid());
    when 'approve' then
      if l.plan is null then raise exception 'no plan to approve'; end if;
      update public.launches set status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now() where id = l.id;
    when 'build' then
      if l.status not in ('approved','error','built') then raise exception 'approve the plan first'; end if;
      update public.launches set status = 'building', last_error = null, updated_at = now() where id = l.id;
      perform public.enqueue_job('launch_build', jsonb_build_object('launch_id', l.id), 0, auth.uid());
    when 'activate' then
      if l.meta_campaign_id is null then raise exception 'campaign not built yet'; end if;
      perform public.enqueue_job('launch_activate', jsonb_build_object('launch_id', l.id, 'by', auth.uid()), 0, auth.uid());
    when 'pause' then
      perform public.enqueue_job('launch_pause', jsonb_build_object('launch_id', l.id, 'by', auth.uid()), 0, auth.uid());
    when 'kill' then
      perform public.enqueue_job('launch_pause', jsonb_build_object('launch_id', l.id, 'by', auth.uid(), 'kill', true), 0, auth.uid());
    else raise exception 'unknown action %', p_action;
  end case;
end $$;

-- ---------- nightly enqueue helpers (called by pg_cron) ----------
create or replace function public.enqueue_nightly_research() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; f record;
begin
  for f in
    select fi.id from public.finds fi
    left join public.research r on r.find_id = fi.id
    where fi.deleted_at is null and r.id is null and fi.processing_state = 'done'
      and fi.created_at > now() - interval '3 days'
      and (fi.gut in ('fire','good') or fi.hunt_item_id is not null
           or exists (select 1 from public.votes v where v.find_id = fi.id and v.value >= 1 and v.deleted_at is null))
  loop
    perform public.enqueue_job('research_find', jsonb_build_object('find_id', f.id));
    n := n + 1;
  end loop;
  return n;
end $$;

grant execute on function public.request_job(text, jsonb), public.launch_action(uuid, text) to authenticated;
revoke execute on function public.claim_jobs(int), public.finish_job(uuid, boolean, text, jsonb),
  public.enqueue_job(text, jsonb, int, uuid), public.requeue_stale_jobs(), public.enqueue_nightly_research() from public, anon, authenticated;
