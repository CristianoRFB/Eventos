import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = 'docs/implementation/diagrams';
const sourceDirectory = 'docs/versions/v0.1.0-architecture/diagrams/source';
const moduleUrl = import.meta.resolve('@mermaid-js/mermaid-cli');
const cliPath = fileURLToPath(new URL('./cli.js', moduleUrl));
const cliPackage = JSON.parse(readFileSync(new URL('../package.json', moduleUrl), 'utf8'));
const hash = (relative) =>
  createHash('sha256')
    .update(readFileSync(path.join(root, relative)))
    .digest('hex');

mkdirSync(path.join(root, outputDirectory), { recursive: true });
const configPath = path.join(root, outputDirectory, 'mermaid-config.json');
writeFileSync(
  configPath,
  `${JSON.stringify({ theme: 'neutral', securityLevel: 'strict', fontFamily: 'Arial' }, null, 2)}\n`,
);

const sources = readdirSync(path.join(root, sourceDirectory))
  .filter((name) => name.endsWith('.mmd'))
  .sort();
if (sources.length !== 16) throw new Error(`Expected 16 preserved sources, found ${sources.length}`);
const manifest = {
  classification: 'PLANNED_DESIGN',
  runtimeReconciliation: 'NOT_STARTED',
  renderer: '@mermaid-js/mermaid-cli',
  rendererVersion: cliPackage.version,
  generatedAtUtc: new Date().toISOString(),
  userTimezone: 'America/Sao_Paulo',
  note: 'Rendered from preserved design sources; these SVGs do not prove implemented runtime or deployed resources.',
  diagrams: [],
};

for (const name of sources) {
  const id = path.basename(name, '.mmd');
  const source = `${sourceDirectory}/${name}`;
  const svg = `${outputDirectory}/${id}.svg`;
  const log = `${outputDirectory}/${id}.log.txt`;
  const args = [
    cliPath,
    '-i',
    path.join(root, source),
    '-o',
    path.join(root, svg),
    '-c',
    configPath,
    '-b',
    'transparent',
    '--size',
    '1800',
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const status = result.status === 0 && !result.error ? 'PASS' : 'FAIL';
  writeFileSync(
    path.join(root, log),
    [
      `Renderer: @mermaid-js/mermaid-cli ${cliPackage.version}`,
      `Source: ${source}`,
      `Source SHA-256: ${hash(source)}`,
      `Exit code: ${result.status}`,
      `Classification: PLANNED_DESIGN; runtime reconciliation NOT_STARTED`,
      result.stdout ?? '',
      result.stderr ?? '',
      result.error?.message ?? '',
    ].join('\n'),
  );
  manifest.diagrams.push({
    id,
    source,
    sourceSha256: hash(source),
    status,
    exitCode: result.status,
    svg,
    svgSha256: status === 'PASS' ? hash(svg) : null,
    log,
  });
  process.stdout.write(`${id}: ${status}\n`);
}
writeFileSync(path.join(root, outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
if (manifest.diagrams.some((diagram) => diagram.status !== 'PASS')) process.exitCode = 1;
