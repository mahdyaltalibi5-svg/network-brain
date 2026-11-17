/** Idempotent schema: safe to run on every cold start. */
export const schema = [
  `CREATE TABLE IF NOT EXISTS leads (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL CHECK (source IN ('meta', 'website', 'manual')),
    meta_lead_id  TEXT UNIQUE,
    full_name     TEXT,
    email         TEXT,
    phone         TEXT,
    occasion      TEXT,
    notes         TEXT,
    answers       JSONB NOT NULL DEFAULT '[]'::jsonb,
    stage         TEXT NOT NULL DEFAULT 'new',
    value_cents   INTEGER,
    booked_at     TIMESTAMPTZ,
    ordered_at    TIMESTAMPTZ,
    campaign_id   TEXT,
    campaign_name TEXT,
    adset_id      TEXT,
    adset_name    TEXT,
    ad_id         TEXT,
    ad_name       TEXT,
    form_id       TEXT,
    platform      TEXT,
    fbc           TEXT,
    fbp           TEXT,
    lead_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads (stage, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS leads_campaign_idx ON leads (campaign_id)`,
  `CREATE TABLE IF NOT EXISTS activities (
    id         TEXT PRIMARY KEY,
    lead_id    TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    body       TEXT NOT NULL,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS activities_lead_idx ON activities (lead_id, created_at DESC)`,
  // Speed to lead: when someone first reached out, and how many reminders have gone out.
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS nudges INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS leads_waiting_idx ON leads (lead_created_at) WHERE first_contact_at IS NULL`,
  // Follow-ups and client profile.
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_note TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_notified BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_date DATE`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_label TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS measurements JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `CREATE INDEX IF NOT EXISTS leads_follow_up_idx ON leads (follow_up_at) WHERE follow_up_at IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS garments (
    id          TEXT PRIMARY KEY,
    lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    fabric      TEXT,
    details     TEXT,
    status      TEXT NOT NULL DEFAULT 'planned',
    price_cents INTEGER,
    due_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS garments_lead_idx ON garments (lead_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS files (
    id         TEXT PRIMARY KEY,
    lead_id    TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    data       BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS files_lead_idx ON files (lead_id, created_at)`,
  // Phones/laptops that receive lead alerts (Web Push).
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint   TEXT PRIMARY KEY,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    label      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Small key/value store for settings made in the CRM (the Meta connection). Secrets are encrypted.
  `CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Website agent: one conversation per request ("make the hero say…"), its full Claude
  // message history (append-only), and the files it changed, staged until Kobe publishes.
  `CREATE TABLE IF NOT EXISTS agent_sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'idle',
    base_sha    TEXT NOT NULL,
    messages    JSONB NOT NULL DEFAULT '[]',
    summary     TEXT,
    change_id   TEXT,
    error       TEXT,
    cost_cents  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS agent_files (
    session_id TEXT NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    original   TEXT,
    content    TEXT NOT NULL,
    PRIMARY KEY (session_id, path)
  )`,
  // Website edits published from the CRM.
  `CREATE TABLE IF NOT EXISTS site_changes (
    id            TEXT PRIMARY KEY,
    summary       TEXT NOT NULL,
    settings      JSONB NOT NULL,
    commit_sha    TEXT,
    deployment_id TEXT,
    status        TEXT NOT NULL DEFAULT 'publishing',
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE site_changes ADD COLUMN IF NOT EXISTS revert_of TEXT`,
  `ALTER TABLE site_changes ADD COLUMN IF NOT EXISTS files JSONB`,
  // Meta ad account mirror, synced automatically: every campaign, ad set and ad, and each ad's
  // results per day. The Ads page reads from here (fast, and history survives).
  `CREATE TABLE IF NOT EXISTS meta_ads (
    id               TEXT PRIMARY KEY,
    level            TEXT NOT NULL,
    name             TEXT NOT NULL,
    status           TEXT,
    campaign_id      TEXT,
    adset_id         TEXT,
    objective        TEXT,
    daily_budget     INTEGER,
    lifetime_budget  INTEGER,
    thumbnail_url    TEXT,
    headline         TEXT,
    body             TEXT,
    synced_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS meta_daily (
    day          DATE NOT NULL,
    ad_id        TEXT NOT NULL,
    campaign_id  TEXT,
    adset_id     TEXT,
    spend_cents  INTEGER NOT NULL DEFAULT 0,
    impressions  INTEGER NOT NULL DEFAULT 0,
    reach        INTEGER NOT NULL DEFAULT 0,
    clicks       INTEGER NOT NULL DEFAULT 0,
    leads        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, ad_id)
  )`,
  `CREATE INDEX IF NOT EXISTS meta_daily_campaign_idx ON meta_daily (campaign_id, day)`,
];
