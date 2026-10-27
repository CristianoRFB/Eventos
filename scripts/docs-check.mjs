import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const issues = [];
const check = (condition, message) => {
  if (!condition) issues.push(message);
};
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
const hash = (relative) =>
  createHash('sha256')
    .update(readFileSync(path.join(root, relative)))
    .digest('hex');
/**
 * Historical design CSVs were authored with CRLF and some Git checkouts
 * normalize them to LF. Require byte-for-byte equality after normalizing
 * ONLY line endings on text sources, never on PNG/SVG evidence. The historical
 * SHA-256 remains unchanged; semantic edits still fail this provenance gate.
 */
const textHashMatches = (relative, expected) => {
  if (hash(relative) === expected) return true;
  if (!/\\.(csv|txt|md|mmd)$/i.test(relative)) return false;
  const normalized = read(relative).replace(/\\r\\n/g, '\\n').replace(/\\n/g, '\\r\\n');
  return createHash('sha256').update(normalized).digest('hex') === expected;
};

// Quoted CSV fields may contain commas, quotes and original multiline clauses.
function csv(relative) {
  const input = read(relative).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (!quoted && char === ',') {
      row.push(field);
      field = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  check(!quoted, `${relative}: unterminated quoted CSV field`);
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.map((values, index) => {
    check(
      values.length === headers.length,
      `${relative}: row ${index + 2} has ${values.length}/${headers.length} fields`,
    );
    return Object.fromEntries(headers.map((key, column) => [key, values[column]]));
  });
}

function required(relative) {
  check(existsSync(path.join(root, relative)), `Missing required file: ${relative}`);
}

const requiredFiles = [
  'AGENTS.md',
  'FEATURE_STATES.md',
  'docs/CURRENT.md',
  'docs/adr/ADR-005-authorized-repository-and-execution.md',
  'docs/implementation/MASTER_EXECUTION_STATUS.md',
  'docs/implementation/TRACEABILITY.md',
  'docs/implementation/preflight-git.txt',
  'docs/implementation/REQUIREMENTS_TRACEABILITY.csv',
  'docs/implementation/GLOBAL_REQUIREMENTS_TRACEABILITY.csv',
  'docs/implementation/FEATURE_TRACEABILITY.csv',
  'docs/implementation/SCREEN_TRACEABILITY.csv',
  'docs/implementation/DIAGRAM_STATUS.csv',
  'codex/CODEX_GOAL_MASTER_EVENTOS_77_FULL_SYSTEM.txt',
];
for (const relative of requiredFiles) required(relative);
if (issues.length) {
  for (const issue of issues) process.stderr.write(`FAIL ${issue}\n`);
  process.exit(1);
}

const phases = Array.from({ length: 13 }, (_, index) => `F${index}`);
const master = read('docs/implementation/MASTER_EXECUTION_STATUS.md');
for (const phase of phases) {
  const matches = [...master.matchAll(new RegExp(`^\\| ${phase} \\| ([A-Z_]+) \\|`, 'gm'))];
  check(matches.length === 1, `Master status must contain exactly one ${phase} row`);
}

const requirements = csv('docs/implementation/REQUIREMENTS_TRACEABILITY.csv');
const globals = csv('docs/implementation/GLOBAL_REQUIREMENTS_TRACEABILITY.csv');
const requirementIds = new Set();
for (const row of [...requirements, ...globals]) {
  check(!requirementIds.has(row.requirement_id), `Duplicate requirement ${row.requirement_id}`);
  requirementIds.add(row.requirement_id);
  required(row.source);
  if (!existsSync(path.join(root, row.source))) continue;
  check(textHashMatches(row.source, row.source_sha256), `${row.requirement_id}: source hash changed`);
  const sourceText = read(row.source)
    .split(/\r?\n/)
    .slice(Number(row.source_start_line) - 1, Number(row.source_end_line))
    .join('\n')
    .trim();
  check(sourceText === row.requirement.trim(), `${row.requirement_id}: source text/line mismatch`);
  check(Boolean(row.target_files_planned), `${row.requirement_id}: missing planned files`);
  check(Boolean(row.tests_planned), `${row.requirement_id}: missing planned tests`);
  check(Boolean(row.evidence_required), `${row.requirement_id}: missing proof requirement`);
  if (row.status === 'PASS') {
    check(Boolean(row.implementation_sha), `${row.requirement_id}: PASS without implementation SHA`);
    check(
      Boolean(row.evidence_actual) && !row.evidence_actual.startsWith('NONE'),
      `${row.requirement_id}: PASS without actual evidence`,
    );
  }
}
for (const phase of phases) {
  check(requirements.some((row) => row.phase === phase), `Requirement matrix missing ${phase}`);
}
check(requirements.length === 172, `Phase source coverage changed: ${requirements.length}/172 clauses`);
check(globals.length === 65, `Global source coverage changed: ${globals.length}/65 clauses`);

function checkInventory(originalPath, tracedPath, keyFields, expectedCount) {
  const original = csv(originalPath);
  const traced = csv(tracedPath);
  check(original.length === expectedCount, `${originalPath}: expected ${expectedCount} rows`);
  check(traced.length === original.length, `${tracedPath}: inventory coverage differs`);
  const key = (row) => keyFields.map((field) => row[field]).join('::');
  const tracedById = new Map(traced.map((row) => [key(row), row]));
  check(tracedById.size === traced.length, `${tracedPath}: duplicate inventory IDs`);
  for (const originalRow of original) {
    const id = key(originalRow);
    const tracedRow = tracedById.get(id);
    check(Boolean(tracedRow), `${tracedPath}: missing ${id}`);
    if (!tracedRow) continue;
    for (const [field, value] of Object.entries(originalRow)) {
      check(tracedRow[field] === value, `${tracedPath}: ${id}.${field} changed source semantics`);
    }
    check(tracedRow.source === originalPath, `${tracedPath}: ${id} source path mismatch`);
    check(textHashMatches(originalPath, tracedRow.source_sha256), `${tracedPath}: ${id} source hash mismatch`);
    if (tracedRow.status === 'PASS') {
      check(Boolean(tracedRow.implementation_sha), `${tracedPath}: ${id} PASS without SHA`);
      check(
        Boolean(tracedRow.evidence_actual) && !tracedRow.evidence_actual.startsWith('NONE'),
        `${tracedPath}: ${id} PASS without evidence`,
      );
    }
  }
}

checkInventory(
  'docs/versions/v0.1.0-architecture/FEATURE_INVENTORY.csv',
  'docs/implementation/FEATURE_TRACEABILITY.csv',
  ['feature_id'],
  38,
);
checkInventory(
  'docs/versions/v0.1.0-architecture/SCREENS_INVENTORY.csv',
  'docs/implementation/SCREEN_TRACEABILITY.csv',
  ['zone', 'screen_id'],
  60,
);

const diagramRows = csv('docs/implementation/DIAGRAM_STATUS.csv');
const sourceDirectory = 'docs/versions/v0.1.0-architecture/diagrams/source';
check(diagramRows.length === 16, 'Diagram traceability must preserve all 16 sources');
check(
  readdirSync(path.join(root, sourceDirectory)).filter((name) => name.endsWith('.mmd')).length === 16,
  'Historical Mermaid source inventory must remain 16',
);
for (const row of diagramRows) {
  required(row.source_path);
  required(row.historical_svg_path);
  check(textHashMatches(row.source_path, row.source_sha256), `${row.diagram_id}: historical source changed`);
  check(
    row.historical_renderer === 'GRAPHVIZ_DOT_AUXILIARY',
    `${row.diagram_id}: historical SVG must retain truthful renderer provenance`,
  );
}

const renderManifest = 'docs/implementation/diagrams/manifest.json';
let rendered = 0;
if (existsSync(path.join(root, renderManifest))) {
  const manifest = JSON.parse(read(renderManifest));
  check(manifest.classification === 'PLANNED_DESIGN', 'Rendered design must not claim runtime proof');
  check(manifest.diagrams.length === 16, 'Mermaid manifest must include all 16 sources');
  for (const row of manifest.diagrams) {
    required(row.source);
    check(textHashMatches(row.source, row.sourceSha256), `${row.id}: rendered source hash mismatch`);
    check(row.status === 'PASS', `${row.id}: Mermaid render is ${row.status}`);
    if (row.status !== 'PASS') continue;
    required(row.svg);
    if (!existsSync(path.join(root, row.svg))) continue;
    check(row.svgSha256 === hash(row.svg), `${row.id}: SVG hash mismatch`);
    check(/<svg\b/.test(read(row.svg)) && /<\/svg>/.test(read(row.svg)), `${row.id}: invalid SVG output`);
    rendered += 1;
  }
}

const markdownFiles = [
  'README.md',
  ...requiredFiles.filter((file) => file.endsWith('.md')),
];
for (const runtimeScreenshots of [
  'docs/implementation/screenshots/2026-10-19/manifest.json',
  'docs/implementation/screenshots/2026-10-20/manifest.json',
]) if (existsSync(path.join(root, runtimeScreenshots))) {
  const manifest = JSON.parse(read(runtimeScreenshots));
  check(manifest.classification === 'LOCAL_RUNTIME_SYNTHETIC', 'Runtime screenshots must be classified honestly');
  check(/^[a-f0-9]{40}$/.test(manifest.commit), 'Screenshot manifest missing source commit');
  for (const screenshot of manifest.screenshots) {
    const relative = path.posix.join(path.posix.dirname(runtimeScreenshots), screenshot.file);
    required(relative);
    if (!existsSync(path.join(root, relative))) continue;
    const bytes = readFileSync(path.join(root, relative));
    check(bytes.length > 24 && bytes.subarray(1,4).toString() === 'PNG', `${relative}: invalid PNG`);
    check(hash(relative) === screenshot.sha256, `${relative}: screenshot hash changed`);
    check(bytes.readUInt32BE(16) === screenshot.image_width && bytes.readUInt32BE(20) === screenshot.image_height, `${relative}: dimensions mismatch`);
    check(Boolean(screenshot.captured_at) && Boolean(screenshot.route_template), `${relative}: missing capture provenance`);
  }
}
function collectMarkdown(relative) {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const entryPath = `${relative}/${entry.name}`;
    if (entry.isDirectory()) collectMarkdown(entryPath);
    else if (entry.name.endsWith('.md')) markdownFiles.push(entryPath);
  }
}
collectMarkdown('docs/implementation');
for (const relative of new Set(markdownFiles)) {
  if (!existsSync(path.join(root, relative))) continue;
  for (const match of read(relative).matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(root, path.dirname(relative), decodeURIComponent(target));
    check(existsSync(resolved), `${relative}: broken local link ${target}`);
  }
}

if (issues.length) {
  for (const issue of issues) process.stderr.write(`FAIL ${issue}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `PASS docs: 13 phases; ${requirements.length} phase clauses; ${globals.length} global clauses; ` +
      `38 features; 60 screens; 16 preserved Mermaid sources; ${rendered} verified design renders.\n`,
  );
  process.stdout.write('This validates documented provenance/coverage; it does not certify runtime or cloud acceptance.\n');
}
