import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// The API integration suite reuses one synthetic invitee, so remove only that
// local membership before each run. The hard-coded --local flag is deliberate.
const emailHash = createHash("sha256")
  .update("invitee@example.test")
  .digest("hex");
const sql = `DELETE FROM event_assignments WHERE organization_id='org-a' AND user_id='invitee-local';
DELETE FROM memberships WHERE organization_id='org-a' AND user_id='invitee-local';
DELETE FROM invitations WHERE email_hash='${emailHash}';`;
const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/wrangler/bin/wrangler.js"),
    "d1",
    "execute",
    "DB",
    "--local",
    "--command",
    sql,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
