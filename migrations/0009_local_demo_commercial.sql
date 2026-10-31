-- F8 mechanical contract only. No pricing, charges or production assignments.
-- No tenant is enrolled implicitly; authorization is enforced by the server.
CREATE TABLE IF NOT EXISTS commercial_assignments (
  organization_id TEXT PRIMARY KEY NOT NULL
    REFERENCES organizations(id) ON DELETE RESTRICT,
  plan_id TEXT NOT NULL CHECK(length(plan_id) BETWEEN 1 AND 80),
  subscription_status TEXT NOT NULL
    CHECK(subscription_status IN ('trial','active','past_due','suspended','cancelled','demo')),
  trial_until TEXT,
  entitlement_overrides_json TEXT NOT NULL DEFAULT '{}'
    CHECK(json_valid(entitlement_overrides_json) AND json_type(entitlement_overrides_json)='object'),
  limit_overrides_json TEXT NOT NULL DEFAULT '{}'
    CHECK(json_valid(limit_overrides_json) AND json_type(limit_overrides_json)='object'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
