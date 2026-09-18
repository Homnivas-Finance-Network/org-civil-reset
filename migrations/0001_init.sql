-- Homnivas Card PWA — D1 schema (SQLite dialect)
-- IF NOT EXISTS on every statement on purpose: this file is meant to be
-- safe to re-run on every deploy (Cloudflare's Git-integration build step
-- runs it automatically each time), not just once by hand.

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  token TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  name TEXT,
  phone TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'link_sent',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_access_token ON leads(access_token);
CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(agent_id);

CREATE TABLE IF NOT EXISTS lead_sessions (
  token TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_sessions_lead ON lead_sessions(lead_id);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id),
  full_name TEXT,
  dob TEXT,
  pan_number TEXT,
  address TEXT,
  pincode TEXT,
  employment_type TEXT,
  monthly_income_band TEXT,
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  doc_type TEXT NOT NULL,                    -- 'pan' | 'aadhaar_front' | 'aadhaar_back' | 'selfie'
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_resource_type TEXT NOT NULL DEFAULT 'image',
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kyc_lead ON kyc_documents(lead_id);

CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  terms_version TEXT NOT NULL,
  terms_hash TEXT NOT NULL,
  signed_name TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  pdf_cloudinary_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_agreements_lead ON agreements(lead_id);

CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT REFERENCES agents(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_status_history_lead ON status_history(lead_id, created_at);
