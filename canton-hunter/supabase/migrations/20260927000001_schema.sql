-- Canton Hunter core schema
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.touch_server_updated_at() returns trigger
language plpgsql as $$
begin
  new.server_updated_at := clock_timestamp();
  if new.updated_at is null then new.updated_at := now(); end if;
  -- clamp client clocks that are > 24h in the future
  if new.updated_at > now() + interval '24 hours' then new.updated_at := now(); end if;
  return new;
end $$;

-- Standard columns on every synced table:
--   id uuid pk (client generated), created_at, updated_at (client clock, LWW),
--   server_updated_at (server clock, pull cursor), deleted_at (soft delete), created_by

-- ---------- enums ----------
create type public.gut as enum ('fire','good','meh');
create type public.media_kind as enum ('product_photo','card_photo','qr_photo','video','voice');
create type public.upload_state as enum ('pending','uploading','uploaded','error');
create type public.processing_state as enum ('pending','processing','done','error');
create type public.stage as enum ('found','shortlisted','quote_requested','quote_received','sample_requested',
  'sample_in_hand','testing','negotiating','vetting','ordered','qc','shipped','landed','killed');
create type public.sample_status as enum ('requested','paid','in_hand','shipping','arrived');
create type public.launch_mode as enum ('waitlist','preorder');
create type public.recommendation as enum ('keep','kill','scale');
create type public.job_status as enum ('queued','running','done','error');

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key,                 -- = auth.users.id
  name text not null default '',
  color text,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  verified_at date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.hunt_items (
  id uuid primary key,
  title text not null,
  category text,
  why text,
  target_fob_cents int,
  target_retail_cents int,
  priority int not null default 3,
  source_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.hall_assignments (
  id uuid primary key,
  date date not null,
  user_id uuid not null references public.profiles(id),
  halls text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.suppliers (
  id uuid primary key,
  name_en text,
  name_cn text,
  contact_name text,
  title text,
  phones text[] not null default '{}',
  emails text[] not null default '{}',
  wechat_id text,
  wechat_qr_payload text,
  website text,
  address text,
  booth_code text,
  hall text,
  is_factory_ai boolean,
  is_factory_override boolean,
  alibaba_url text,
  notes text,
  merged_into_id uuid references public.suppliers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);
create index suppliers_name_trgm on public.suppliers using gin ((coalesce(name_en,'') || ' ' || coalesce(name_cn,'')) gin_trgm_ops);

create table public.supplier_dupe_candidates (
  id uuid primary key,
  supplier_a uuid not null references public.suppliers(id),
  supplier_b uuid not null references public.suppliers(id),
  score real not null,
  reasons text[] not null default '{}',
  status text not null default 'open' check (status in ('open','merged','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.finds (
  id uuid primary key,
  supplier_id uuid references public.suppliers(id),
  captured_by uuid references public.profiles(id),
  captured_at timestamptz not null default now(),
  day_index int,
  hall text,
  booth_code text,
  transcript text,
  gut public.gut,
  title_ai text, title_override text,
  description_ai text, description_override text,
  category_ai text, category_override text,
  tags_ai text[] not null default '{}',
  fob_price_cents int,
  fob_currency text,
  moq int,
  sample_cost_cents int,
  lead_time_days int,
  oem_logo boolean,
  packaging_custom boolean,
  sells_to_us_sellers boolean,
  certifications text[] not null default '{}',
  unit_weight_g int,
  box_dims_mm int[],
  fragile boolean,
  giftable_ai boolean,
  demo_score_ai int,
  compliance_ai jsonb,
  compliance_override jsonb,
  hts_guess_ai text,
  hunt_item_id uuid references public.hunt_items(id),
  processing_state public.processing_state not null default 'pending',
  stage public.stage not null default 'found',
  killed_reason text,
  ai_confidence jsonb,
  search_doc tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);
create index finds_search on public.finds using gin (search_doc);
create index finds_title_trgm on public.finds using gin ((coalesce(title_override, title_ai, '')) gin_trgm_ops);
create index finds_captured on public.finds (captured_at desc);
create index finds_supplier on public.finds (supplier_id);

create table public.media (
  id uuid primary key,
  find_id uuid references public.finds(id),
  supplier_id uuid references public.suppliers(id),
  kind public.media_kind not null,
  storage_path text,
  upload_state public.upload_state not null default 'pending',
  width int, height int, duration_ms int, bytes int,
  mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);
create index media_find on public.media (find_id);

create table public.votes (
  id uuid primary key,
  find_id uuid not null references public.finds(id),
  user_id uuid not null references public.profiles(id),
  value int not null check (value between -1 and 2),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid,
  unique (find_id, user_id)
);

create table public.pings (
  id uuid primary key,
  find_id uuid references public.finds(id),
  from_user uuid references public.profiles(id),
  hall text,
  booth_code text,
  message text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.research (
  id uuid primary key default gen_random_uuid(),
  find_id uuid not null unique references public.finds(id),
  status text not null default 'done',
  report jsonb,
  retail_low_cents int,
  retail_high_cents int,
  competition text check (competition in ('low','med','high','saturated')),
  ip_risk text check (ip_risk in ('low','med','high')),
  summary text,
  sources jsonb not null default '[]',
  model text,
  usage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.cost_calcs (
  id uuid primary key,
  find_id uuid not null unique references public.finds(id),
  inputs jsonb not null default '{}',     -- CostOverrides (mode, qty, retail_price_usd, ...)
  outputs jsonb,                          -- LandedCostOutput (server computed)
  config_snapshot jsonb,
  computed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  find_id uuid not null unique references public.finds(id),
  total real not null,
  rank_key real not null,
  breakdown jsonb not null,
  gates_failed text[] not null default '{}',
  margin_multiple real,
  arrive_by date,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);
create index scores_rank on public.scores (rank_key desc);

create table public.pipeline_events (
  id uuid primary key,
  find_id uuid not null references public.finds(id),
  from_stage public.stage,
  to_stage public.stage not null,
  by_user uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.vetting (
  id uuid primary key,
  find_id uuid not null unique references public.finds(id),
  checklist jsonb not null default '{}',   -- {key: {done: bool, by, at, note}}
  override_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.samples (
  id uuid primary key,
  find_id uuid references public.finds(id),
  supplier_id uuid references public.suppliers(id),
  status public.sample_status not null default 'requested',
  carried_by uuid references public.profiles(id),
  bag_label text,
  paid_cents int,
  declared_value_cents int,
  tracking text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  media_id uuid references public.media(id),
  kind text not null default 'clip' check (kind in ('clip','recap')),
  hooks text[] not null default '{}',
  caption text,
  hashtags text[] not null default '{}',
  on_screen_text text,
  script text,
  post_order int,
  posted boolean not null default false,
  posted_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.launches (
  id uuid primary key,
  find_id uuid not null references public.finds(id),
  status text not null default 'draft'
    check (status in ('draft','planning','plan_ready','approved','building','built','live','paused','killed','error')),
  mode public.launch_mode,
  ship_by_date date,
  price_cents int,
  plan jsonb,                -- LaunchPlan (AI), editable
  approved_by uuid, approved_at timestamptz,
  shopify_product_id text,
  shopify_handle text,
  landing_url text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_ids text[] not null default '{}',
  meta_status text not null default 'none' check (meta_status in ('none','paused','active')),
  activated_by uuid, activated_at timestamptz,
  kill_rules jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid
);

create table public.launch_metrics (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references public.launches(id),
  date date not null,
  spend_cents int not null default 0,
  impressions int not null default 0,
  clicks int not null default 0,
  lp_views int not null default 0,
  sessions int,
  add_to_carts int,
  waitlist_signups int not null default 0,
  preorders int not null default 0,
  revenue_cents int not null default 0,
  recommendation public.recommendation,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  created_by uuid,
  unique (launch_id, date)
);

-- server-only tables
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  status public.job_status not null default 'queued',
  attempts int not null default 0,
  max_attempts int not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  result jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_ready on public.jobs (status, run_after);
create unique index jobs_one_queued_per_find on public.jobs (type, (payload->>'find_id'))
  where status = 'queued' and payload ? 'find_id';

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  storage_path text not null,
  row_counts jsonb,
  created_at timestamptz not null default now()
);

-- ---------- triggers: server_updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','config','hunt_items','hall_assignments','suppliers','supplier_dupe_candidates',
    'finds','media','votes','pings','research','cost_calcs','scores','pipeline_events','vetting','samples',
    'content_items','launches','launch_metrics']
  loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.touch_server_updated_at()',
      t || '_touch', t);
  end loop;
end $$;

-- ---------- search doc ----------
create or replace function public.finds_search_doc() returns trigger
language plpgsql as $$
declare sup record;
begin
  select name_en, name_cn, contact_name into sup from public.suppliers where id = new.supplier_id;
  new.search_doc :=
    setweight(to_tsvector('english', coalesce(new.title_override, new.title_ai, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.tags_ai, ' ') || ' ' || coalesce(new.category_override, new.category_ai, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description_override, new.description_ai, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(sup.name_en,'') || ' ' || coalesce(sup.name_cn,'') || ' ' || coalesce(sup.contact_name,'') || ' ' || coalesce(new.booth_code,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.transcript, '')), 'D');
  return new;
end $$;
create trigger finds_search_doc before insert or update on public.finds
  for each row execute function public.finds_search_doc();

create or replace function public.search_finds(q text, lim int default 50)
returns setof public.finds language sql stable as $$
  select f.* from public.finds f
  where f.deleted_at is null
    and (f.search_doc @@ websearch_to_tsquery('english', q)
         or coalesce(f.title_override, f.title_ai, '') % q)
  order by ts_rank(f.search_doc, websearch_to_tsquery('english', q)) desc,
           similarity(coalesce(f.title_override, f.title_ai, ''), q) desc
  limit lim
$$;

-- ---------- profile on signup ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
