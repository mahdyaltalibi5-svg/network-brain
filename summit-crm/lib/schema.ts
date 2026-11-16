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
];
