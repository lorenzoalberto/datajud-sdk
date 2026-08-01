import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const sandbox = mkdtempSync(join(tmpdir(), 'datajud-sdk-smoke-'));
const packOutput = execFileSync('npm', ['pack', '--json', '--pack-destination', sandbox], {
  cwd: project,
  encoding: 'utf8',
});
const packed = JSON.parse(packOutput);
const filename = packed[0]?.filename;

if (typeof filename !== 'string') {
  throw new Error('npm pack não informou o arquivo gerado.');
}

writeFileSync(
  join(sandbox, 'package.json'),
  JSON.stringify({ private: true, type: 'module' }),
);
execFileSync('npm', ['install', '--ignore-scripts', join(sandbox, filename)], {
  cwd: sandbox,
  stdio: 'inherit',
});
writeFileSync(
  join(sandbox, 'smoke.mjs'),
  [
    "import { DataJudClient, QueryBuilder, normalizeNumeroProcesso } from '@lorenzoalberto/datajud-sdk';",
    "if (typeof DataJudClient !== 'function') throw new Error('DataJudClient ausente');",
    "if (new QueryBuilder().build().match_all === undefined) throw new Error('QueryBuilder inválido');",
    "if (normalizeNumeroProcesso('0000000-00.0000.0.00.0000').length !== 20) throw new Error('helper inválido');",
  ].join('\n'),
);
execFileSync(process.execPath, [join(sandbox, 'smoke.mjs')], {
  cwd: sandbox,
  stdio: 'inherit',
});

const manifest = JSON.parse(
  readFileSync(
    join(sandbox, 'node_modules/@lorenzoalberto/datajud-sdk/package.json'),
    'utf8',
  ),
);
if (manifest.name !== '@lorenzoalberto/datajud-sdk') {
  throw new Error('Manifesto publicado inválido.');
}

console.log(`Smoke test concluído com ${filename}.`);
