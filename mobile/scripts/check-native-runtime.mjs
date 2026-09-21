#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const metro = fs.readFileSync(path.join(ROOT, 'metro.config.js'), 'utf8');
const failures = [];

for (const name of ['react-native-reanimated', 'react-native-worklets']) {
  const requested = app.dependencies?.[name];
  if (!requested || requested.startsWith('file:')) failures.push(`${name} is not a real dependency`);

  const installedPath = path.join(ROOT, 'node_modules', name, 'package.json');
  if (!fs.existsSync(installedPath)) {
    failures.push(`${name} is not installed`);
    continue;
  }
  const installed = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
  console.log(`✓ ${name} ${installed.version}`);
}

if (/stubs\/reanimated|extraNodeModules[^]*reanimated/.test(metro)) {
  failures.push('Metro still redirects Reanimated to a stub');
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log('✓ native Reanimated/Worklets runtime is resolvable without stubs');
