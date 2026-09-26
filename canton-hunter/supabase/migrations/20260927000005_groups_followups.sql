-- Same product at many booths: AI gives each find a generic product key; finds with similar keys share a group
-- so the team can compare quotes side by side. The group id is client-writable ("not the same product").
alter table public.finds add column product_key_ai text;
alter table public.finds add column product_group_id uuid;
create index finds_group on public.finds (product_group_id);

-- Supplier follow-ups after the fair: bilingual drafts, sent by hand over WeChat or email.
create table public.followups (
  id uuid primary key,
  supplier_id uuid not null references public.suppliers(id),
  find_ids uuid[] not null default '{}',
  channel text not null default 'wechat' check (channel in ('wechat','email')),
  purpose text not null default 'quote' check (purpose in ('quote','sample','negotiate','order','custom')),
  subject text,
  body_en text,
  body_zh text,
  asks text[] not null default '{}',
  status text not null default 'draft' check (status in ('drafting','draft','sent','replied','closed')),
  sent_at timestamptz,
  sent_by uuid references public.profiles(id),
  reply_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);
create index followups_supplier on public.followups (supplier_id);
create trigger followups_touch before insert or update on public.followups for each row execute function public.touch_server_updated_at();
alter table public.followups enable row level security;
create policy team_select on public.followups for select to authenticated using (public.is_team());
create policy team_insert on public.followups for insert to authenticated with check (public.is_team());
create policy team_update on public.followups for update to authenticated using (public.is_team()) with check (public.is_team());

-- sync: followups becomes a client table; product_key_ai is AI-owned
create or replace function public.sync_client_tables() returns text[] language sql immutable as $$
  select array['hunt_items','hall_assignments','suppliers','supplier_dupe_candidates','finds','media',
    'votes','pings','cost_calcs','pipeline_events','vetting','samples','content_items','launches','followups']
$$;

create or replace function public.sync_protected_columns(t text) returns text[] language sql immutable as $$
  select case t
    when 'finds' then array['server_updated_at','search_doc','processing_state','title_ai','description_ai','category_ai',
                            'tags_ai','giftable_ai','demo_score_ai','compliance_ai','hts_guess_ai','ai_confidence','product_key_ai']
    when 'launches' then array['server_updated_at','status','shopify_product_id','shopify_handle','landing_url',
                               'meta_campaign_id','meta_adset_id','meta_ad_ids','meta_status','activated_by','activated_at','last_error']
    when 'cost_calcs' then array['server_updated_at','outputs','config_snapshot','computed_at']
    when 'suppliers' then array['server_updated_at','is_factory_ai']
    else array['server_updated_at']
  end
$$;

-- sync_pull: add followups to the table list
create or replace function public.sync_pull(cursors jsonb default '{}', lim int default 500, overlap_seconds int default 0)
returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  t text; since timestamptz; rows jsonb; out_rows jsonb := '{}'; out_cursors jsonb := '{}'; more boolean := false; n int; maxts timestamptz;
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  foreach t in array array['profiles','config','hunt_items','hall_assignments','suppliers','supplier_dupe_candidates',
    'finds','media','votes','pings','research','cost_calcs','scores','pipeline_events','vetting','samples',
    'content_items','launches','launch_metrics','followups']
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

-- allow the new user-requested job
create or replace function public.request_job(p_type text, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  if p_type not in ('research_find','process_find','content_pack','build_hunt_list','metrics_pull','score_find','draft_followups') then
    raise exception 'job type % not allowed', p_type;
  end if;
  if p_type = 'process_find' then
    update public.finds set processing_state = 'pending', updated_at = now() where id = (p_payload->>'find_id')::uuid;
  end if;
  perform public.enqueue_job(p_type, p_payload, 0, auth.uid());
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.followups;
  end if;
end $$;
