-- Row level security: one team, every team member (a row in profiles) sees and writes everything.
create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and deleted_at is null)
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','config','hunt_items','hall_assignments','suppliers','supplier_dupe_candidates',
    'finds','media','votes','pings','research','cost_calcs','scores','pipeline_events','vetting','samples',
    'content_items','launches','launch_metrics']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy team_select on public.%I for select to authenticated using (public.is_team())', t);
  end loop;
  -- client-writable tables
  foreach t in array array['hunt_items','hall_assignments','suppliers','supplier_dupe_candidates','finds','media',
    'votes','pings','cost_calcs','pipeline_events','vetting','samples','content_items','launches']
  loop
    execute format('create policy team_insert on public.%I for insert to authenticated with check (public.is_team())', t);
    execute format('create policy team_update on public.%I for update to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;

alter table public.jobs enable row level security;     -- service role only
alter table public.exports enable row level security;  -- service role only

-- ---------- sync ----------
-- Tables the client may push, and columns it may never set.
create or replace function public.sync_client_tables() returns text[] language sql immutable as $$
  select array['hunt_items','hall_assignments','suppliers','supplier_dupe_candidates','finds','media',
    'votes','pings','cost_calcs','pipeline_events','vetting','samples','content_items','launches']
$$;

create or replace function public.sync_protected_columns(t text) returns text[] language sql immutable as $$
  select case t
    when 'finds' then array['server_updated_at','search_doc','processing_state','title_ai','description_ai','category_ai',
                            'tags_ai','giftable_ai','demo_score_ai','compliance_ai','hts_guess_ai','ai_confidence']
    when 'launches' then array['server_updated_at','status','shopify_product_id','shopify_handle','landing_url',
                               'meta_campaign_id','meta_adset_id','meta_ad_ids','meta_status','activated_by','activated_at','last_error']
    when 'cost_calcs' then array['server_updated_at','outputs','config_snapshot','computed_at']
    when 'suppliers' then array['server_updated_at','is_factory_ai']
    else array['server_updated_at']
  end
$$;

/**
 * Push a batch of row changes from a device. Each change: {"table": "...", "row": {...full row...}}.
 * Last-write-wins by updated_at. Protected (server-computed) columns are ignored on update but allowed
 * on first insert only for 'finds.processing_state' default. Returns accepted ids and per-row errors.
 */
create or replace function public.sync_push(changes jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  c jsonb; t text; r jsonb; cols text; upd text; rid text; n int; found_row boolean;
  accepted text[] := '{}';
  rejected jsonb := '[]'::jsonb;
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  for c in select value from jsonb_array_elements(changes) loop
    t := c->>'table';
    r := c->'row';
    rid := r->>'id';
    begin
      if t is null or not (t = any(public.sync_client_tables())) then
        raise exception 'table % not writable', t;
      end if;
      if r->>'updated_at' is null then r := r || jsonb_build_object('updated_at', now()); end if;

      select string_agg(quote_ident(col.column_name), ','),
             string_agg(format('%1$I = x.%1$I', col.column_name), ',')
        into cols, upd
      from information_schema.columns col
      where col.table_schema = 'public' and col.table_name = t
        and r ? col.column_name
        and not (col.column_name = any(public.sync_protected_columns(t)));

      -- existing row: update only the columns sent, and only if the change is newer (LWW)
      execute format(
        'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) x
         where t.id = x.id and t.updated_at < x.updated_at', t, upd) using r;
      get diagnostics n = row_count;
      if n = 0 then
        execute format('select exists (select 1 from public.%I where id = ($1->>''id'')::uuid)', t) into found_row using r;
        if not found_row then
          execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_record(null::public.%1$I, $1)', t, cols) using r;
        end if;
      end if;
      accepted := accepted || rid;
    exception when others then
      rejected := rejected || jsonb_build_object('id', rid, 'table', t, 'error', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('accepted', to_jsonb(accepted), 'rejected', rejected);
end $$;

/**
 * Pull changes since per-table cursors. cursors: {"finds": "2026-10-29T...", ...}; missing = from the start.
 * overlap_seconds re-reads a small window to catch rows committed out of order (client merges idempotently).
 */
create or replace function public.sync_pull(cursors jsonb default '{}', lim int default 500, overlap_seconds int default 0)
returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  t text; since timestamptz; rows jsonb; out_rows jsonb := '{}'; out_cursors jsonb := '{}'; more boolean := false; n int; maxts timestamptz;
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  foreach t in array array['profiles','config','hunt_items','hall_assignments','suppliers','supplier_dupe_candidates',
    'finds','media','votes','pings','research','cost_calcs','scores','pipeline_events','vetting','samples',
    'content_items','launches','launch_metrics']
  loop
    since := coalesce((cursors->>t)::timestamptz, '-infinity'::timestamptz) - make_interval(secs => overlap_seconds);
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x) - ''search_doc'' order by x.server_updated_at), ''[]''::jsonb), count(*), max(x.server_updated_at)
       from (select * from public.%I where server_updated_at > $1 order by server_updated_at limit $2) x', t)
      into rows, n, maxts using since, lim;
    if n > 0 then
      out_rows := out_rows || jsonb_build_object(t, rows);
      out_cursors := out_cursors || jsonb_build_object(t, maxts);
      if n >= lim then more := true; end if;
    end if;
  end loop;
  return jsonb_build_object('rows', out_rows, 'cursors', out_cursors, 'more', more, 'server_time', now());
end $$;

-- ---------- small RPCs ----------
create or replace function public.set_push_token(token text) returns void
language sql security definer set search_path = public as $$
  update public.profiles set expo_push_token = token, updated_at = now() where id = auth.uid()
$$;

create or replace function public.set_config(k text, v jsonb, verified boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  insert into public.config (key, value, verified_at, created_by)
  values (k, v, case when verified then current_date end, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(),
    verified_at = case when verified then current_date else public.config.verified_at end;
end $$;

grant execute on function public.sync_push(jsonb), public.sync_pull(jsonb, int, int),
  public.set_push_token(text), public.set_config(text, jsonb, boolean), public.search_finds(text, int)
  to authenticated;
