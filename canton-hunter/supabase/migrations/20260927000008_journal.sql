-- Advanced journal: stars, user tags, and a team notes thread per entry.
alter table public.finds add column if not exists starred boolean not null default false;
alter table public.finds add column if not exists tags_user text[] not null default '{}';

create table public.entry_notes (
  id uuid primary key,
  find_id uuid not null references public.finds(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);
create index entry_notes_find on public.entry_notes (find_id);
create trigger entry_notes_touch before insert or update on public.entry_notes for each row execute function public.touch_server_updated_at();
alter table public.entry_notes enable row level security;
create policy team_select on public.entry_notes for select to authenticated using (public.is_team());
create policy team_insert on public.entry_notes for insert to authenticated with check (public.is_team());
create policy team_update on public.entry_notes for update to authenticated using (public.is_team()) with check (public.is_team());

create or replace function public.sync_client_tables() returns text[] language sql immutable as $$
  select array['hunt_items','hall_assignments','suppliers','supplier_dupe_candidates','finds','media',
    'votes','pings','cost_calcs','pipeline_events','vetting','samples','content_items','launches','followups','entry_notes']
$$;

create or replace function public.sync_pull(cursors jsonb default '{}', lim int default 500, overlap_seconds int default 0)
returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  t text; since timestamptz; rows jsonb; out_rows jsonb := '{}'; out_cursors jsonb := '{}'; more boolean := false; n int; maxts timestamptz;
begin
  if not public.is_team() then raise exception 'not a team member'; end if;
  foreach t in array array['profiles','config','hunt_items','hall_assignments','suppliers','supplier_dupe_candidates',
    'finds','media','votes','pings','research','cost_calcs','scores','pipeline_events','vetting','samples',
    'content_items','launches','launch_metrics','followups','entry_notes']
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

-- user tags and team notes are searchable too
create or replace function public.finds_search_doc() returns trigger
language plpgsql as $$
declare sup record;
begin
  select name_en, name_cn, contact_name into sup from public.suppliers where id = new.supplier_id;
  new.search_doc :=
    setweight(to_tsvector('english', coalesce(new.title_override, new.title_ai, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.tags_ai, ' ') || ' ' || array_to_string(new.tags_user, ' ') || ' ' || coalesce(new.category_override, new.category_ai, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description_override, new.description_ai, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(sup.name_en,'') || ' ' || coalesce(sup.name_cn,'') || ' ' || coalesce(sup.contact_name,'') || ' ' || coalesce(new.booth_code,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.transcript, '')), 'D');
  return new;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.entry_notes;
  end if;
end $$;
