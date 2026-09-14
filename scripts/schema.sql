CREATE TABLE IF NOT EXISTS entries(
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK(kind IN ('project','paper','lab','settings')),
  slug text NOT NULL,
  draft jsonb NOT NULL,
  published jsonb,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE(kind,slug)
);
CREATE TABLE IF NOT EXISTS assets(
  id uuid PRIMARY KEY,
  entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  mime text NOT NULL,
  filename text NOT NULL,
  bytes integer NOT NULL CHECK(bytes>0),
  variants jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash text PRIMARY KEY,
  owner_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS rate_limits(
  rate_key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS object_gc(
  object_key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
