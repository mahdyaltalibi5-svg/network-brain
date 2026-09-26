-- Supabase-specific: storage bucket + policies, pg_cron schedules. Guarded so plain Postgres tests can skip.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('exports', 'exports', false) on conflict (id) do nothing;
    execute $p$create policy media_team_read on storage.objects for select to authenticated
      using (bucket_id in ('media','exports') and public.is_team())$p$;
    execute $p$create policy media_team_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and public.is_team())$p$;
  end if;
end $$;

/**
 * Cron: the worker Edge Function is called every minute through pg_net.
 * Requires two Vault secrets (see docs/SETUP.md):
 *   project_url      e.g. https://abcd.supabase.co
 *   worker_secret    same value as the WORKER_SECRET Edge Function env var
 */
create or replace function public.invoke_worker(p_task text default null) returns void
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'worker_secret';
  if url is null or secret is null then raise warning 'invoke_worker: vault secrets missing'; return; end if;
  perform net.http_post(
    url := url || '/functions/v1/worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', secret),
    body := coalesce(jsonb_build_object('task', p_task), '{}'::jsonb),
    timeout_milliseconds := 5000
  );
end $$;
revoke execute on function public.invoke_worker(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    -- times in UTC. Asia/Shanghai = UTC+8. America/Denver = UTC-6 (MDT) / UTC-7 (MST).
    perform cron.schedule('worker-tick',       '* * * * *',  $c$select public.invoke_worker()$c$);
    perform cron.schedule('requeue-stale',     '*/5 * * * *', $c$select public.requeue_stale_jobs()$c$);
    perform cron.schedule('nightly-research',  '0 17 * * *', $c$select public.enqueue_nightly_research()$c$);           -- 01:00 CST
    perform cron.schedule('content-pack',      '0 14 * * *', $c$select public.enqueue_job('content_pack', jsonb_build_object('date', (now() at time zone 'Asia/Shanghai')::date))$c$); -- 22:00 CST
    perform cron.schedule('morning-digest',    '0 23 * * *', $c$select public.enqueue_job('morning_digest', '{}'::jsonb)$c$);  -- 07:00 CST
    perform cron.schedule('export-backup',     '0 19 * * *', $c$select public.enqueue_job('export_backup', '{}'::jsonb)$c$);   -- 03:00 CST
    perform cron.schedule('metrics-pull',      '0 15 * * *', $c$select public.enqueue_job('metrics_pull', '{}'::jsonb)$c$);    -- ~09:00 Denver
  end if;
end $$;

-- Realtime: broadcast changes on the tables the feed listens to.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.finds, public.pings, public.scores, public.votes, public.research;
  end if;
end $$;
