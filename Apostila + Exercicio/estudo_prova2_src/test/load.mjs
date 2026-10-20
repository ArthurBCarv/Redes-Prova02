import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/js');
const NAMES = ['CONFIG', 'IPv4', 'VLSM', 'IPv6', 'STP', 'Adaptive', 'Check', 'Gen', 'makeRng', 'Bank', 'IOS', 'Store', 'Exam', 'Flash', 'Content'];
export function load(filter = /^[0-3]\d-.*\.js$/) {
  const ctx = vm.createContext({ console, Date, Math, JSON });
  const all = fs.readdirSync(dir).filter(f => filter.test(f)).sort();
  let code = all.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  code += '\n;({' + NAMES.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(',') + '})';
  return vm.runInContext(code, ctx, { filename: 'bundle.js' });
}
