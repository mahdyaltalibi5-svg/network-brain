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
