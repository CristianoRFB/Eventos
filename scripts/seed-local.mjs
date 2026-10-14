import { hashPassword } from "better-auth/crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Deliberately synthetic, local-only accounts. Never run against a cloud DB.
const accounts = [
  ["platform-local", "plataforma@example.test", "Administração local"],
  ["owner-a", "owner-a@example.test", "Ana — Organizadora Aurora"],
  ["owner-b", "owner-b@example.test", "Bruno — Organizadora Horizonte"],
  ["editor-a", "editor-a@example.test", "Editora Aurora"],
  ["reviewer-a", "reviewer-a@example.test", "Revisora Aurora"],
  ["shared-local", "shared@example.test", "Colaborador de duas organizadoras"],
  ["invitee-local", "invitee@example.test", "Pessoa convidada — fictícia"],
];
const password = "TEST_ONLY-Local-2026!";
const hashed = await hashPassword(password);
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = Date.now();
const statements = ["PRAGMA foreign_keys=ON;"];
for (const [id, email, name] of accounts) {
  statements.push(
    `INSERT OR IGNORE INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (${literal(id)},${literal(name)},${literal(email)},1,${now},${now});`,
  );
  statements.push(
    `INSERT OR IGNORE INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES (${literal(`account-${id}`)},${literal(id)},'credential',${literal(id)},${literal(hashed)},${now},${now});`,
  );
}
statements.push(
  "INSERT OR IGNORE INTO platform_owners (user_id) VALUES ('platform-local');",
);
for (const [id, name, slug, color] of [
  ["org-a", "Organizadora Aurora — fictícia", "aurora-demo", "#c2410c"],
  ["org-b", "Organizadora Horizonte — fictícia", "horizonte-demo", "#4338ca"],
]) {
  statements.push(
    `INSERT OR IGNORE INTO organizations (id,name,slug,tokens_json) VALUES (${literal(id)},${literal(name)},${literal(slug)},${literal(JSON.stringify({ primary: color }))});`,
  );
  const suffix = id.slice(-1);
  statements.push(
    `INSERT OR IGNORE INTO memberships (id,organization_id,user_id,role) VALUES ('member-${suffix}',${literal(id)},'owner-${suffix}','organization_owner');`,
  );
  statements.push(
    `INSERT OR IGNORE INTO memberships (id,organization_id,user_id,role) VALUES ('shared-${suffix}',${literal(id)},'shared-local','content_editor');`,
  );
  statements.push(
    `INSERT OR IGNORE INTO events (id,organization_id,name,slug) VALUES ('event-${suffix}',${literal(id)},'Encontro ${suffix.toUpperCase()} — fictício','encontro-demo');`,
  );
  statements.push(
    `INSERT OR IGNORE INTO event_assignments (id,organization_id,event_id,user_id,permissions_json) VALUES ('shared-assignment-${suffix}',${literal(id)},'event-${suffix}','shared-local','["event.read","edition.read","content.read","content.write","content.preview","media.read","media.write"]');`,
  );
  statements.push(
    `UPDATE event_assignments SET permissions_json='["event.read","edition.read","content.read","content.write","content.preview","media.read","media.write"]' WHERE id='shared-assignment-${suffix}';`,
  );
}
// Two active, explicitly synthetic local hosts exercise the public F4 router.
// These .test bindings are fixtures only and are never created in Cloudflare.
for (const suffix of ["a", "b"]) {
  const orgId = `org-${suffix}`;
  const eventId = `event-${suffix}`;
  const editionId = `edition-${suffix}`;
  statements.push(
    `UPDATE events SET status='active' WHERE organization_id=${literal(orgId)} AND id=${literal(eventId)};`,
  );
  statements.push(
    `INSERT OR IGNORE INTO editions(id,organization_id,event_id,edition_key,name,city,time_zone,start_at,end_at,status) VALUES (${literal(editionId)},${literal(orgId)},${literal(eventId)},'2027',${literal(`Encontro ${suffix.toUpperCase()} — edição fictícia 2027`)},'Cidade fictícia','America/Sao_Paulo','2027-06-12T12:00:00.000Z','2027-06-12T22:00:00.000Z','active');`,
  );
  statements.push(
    `INSERT OR IGNORE INTO domain_bindings(id,organization_id,hostname,destination,destination_id,status,ownership_verified,hostname_status,ssl_status,dns_verified) VALUES (${literal(`binding-${suffix}`)},${literal(orgId)},${literal(`evento-${suffix}.example.test`)},'FIXED_EDITION',${literal(editionId)},'active',1,'active','active',1);`,
  );
}
for (const [id, role] of [
  ["editor-a", "content_editor"],
  ["reviewer-a", "reviewer_staff"],
]) {
  statements.push(
    `INSERT OR IGNORE INTO memberships (id,organization_id,user_id,role) VALUES (${literal(`member-${id}`)},'org-a',${literal(id)},${literal(role)});`,
  );
  const permissions =
    role === "content_editor"
      ? [
          "event.read",
          "edition.read",
          "content.read",
          "content.write",
          "content.preview",
          "media.read",
          "media.write",
        ]
      : ["event.read", "edition.read", "applications.review"];
  statements.push(
    `INSERT OR IGNORE INTO event_assignments (id,organization_id,event_id,user_id,permissions_json) VALUES (${literal(`assignment-${id}`)},'org-a','event-a',${literal(id)},${literal(JSON.stringify(permissions))});`,
  );
  statements.push(
    `UPDATE event_assignments SET permissions_json=${literal(JSON.stringify(permissions))} WHERE id=${literal(`assignment-${id}`)};`,
  );
}
mkdirSync("tmp", { recursive: true });
const target = resolve("tmp/seed.local.sql");
const idempotentStatements = statements.map((statement) => {
  const match = statement.match(
    /^INSERT OR IGNORE INTO memberships \(id,organization_id,user_id,role\) VALUES \((.*)\);$/,
  );
  if (!match) return statement;
  const id = match[1].split(",")[0];
  return `INSERT INTO memberships (id,organization_id,user_id,role) SELECT ${match[1]} WHERE NOT EXISTS (SELECT 1 FROM memberships WHERE id=${id});`;
});
writeFileSync(target, idempotentStatements.join("\n"));
const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/wrangler/bin/wrangler.js"),
    "d1",
    "execute",
    "DB",
    "--local",
    "--file",
    target,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  "Fixtures locais A/B prontas. Contas example.test; senha TEST_ONLY-Local-2026! (somente local).",
);
