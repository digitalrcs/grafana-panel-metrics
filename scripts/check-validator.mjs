import { readFileSync } from 'node:fs';
const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (report.id !== 'digitalrcs-panelmetrics-panel' || typeof report.version !== 'string' || !report['plugin-validator'] || typeof report['plugin-validator'] !== 'object') {
  throw new Error('Missing or unexpected validator report identity/results');
}
const findings = Object.values(report['plugin-validator']).flat();
const unexpected = findings.filter((f) => ['error', 'warning'].includes(f.Severity) && f.Name !== 'unsigned-plugin');
if (unexpected.length) {
  console.error(JSON.stringify(unexpected, null, 2));
  process.exitCode = 1;
} else {
  console.log('No validator errors or unexpected warnings. Initial unsigned submission warning is permitted.');
}
