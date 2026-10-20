import assert from 'node:assert/strict';
import { load } from './load.mjs';
const { Gen, Check, IPv4, IPv6 } = (() => { const m = load(); return m; })();
let n = 0;
for (const name of Gen.names) for (const d of Gen.DIFF) for (let s = 1; s <= 150; s++) {
  const q = Gen.make(name, d, s * 7919 + d.length);
  assert.ok(q.prompt && q.fields.length && q.hints.length === 3 && q.fb.steps.length, name);
  // a própria resposta deve ser aceita
  const vals = {}; for (const f of q.fields) vals[f.key] = f.type === 'ipv6short' ? IPv6.compress(q.answer[f.key]) : f.type === 'ipv6full' ? IPv6.expand(q.answer[f.key]) : String(q.answer[f.key]);
  const r = Check.question(q, vals); assert.ok(r.ok, name + ' ' + JSON.stringify(q.answer) + ' ' + JSON.stringify(r));
  // respostas vazias devem falhar
  assert.ok(!Check.question(q, {}).ok);
  for (const f of q.fields) if (f.type === 'choice') assert.ok(q.answer[f.key] >= 0 && q.answer[f.key] < f.options.length, name + ' choice idx');
  n++;
}
// formas equivalentes aceitas
assert.ok(Check.types.prefix('255.255.255.192', '/26'));
assert.ok(Check.types.prefix('26', '/26'));
assert.ok(!Check.types.prefix('/27', '/26'));
assert.ok(Check.types.cidr('192.168.32.0 /23', '192.168.32.0/23'));
assert.ok(Check.types.ipv6short('2001:DB8::1', '2001:0db8:0:0:0:0:0:1'));
assert.ok(!Check.types.ipv6short('2001:0db8::1', '2001:0db8:0:0:0:0:0:1'));
assert.ok(!Check.types.ipv6short('2001:db8:0:0::1', '2001:0db8:0:0:0:0:0:1'));
assert.ok(Check.types.number('1.022', 1022));
// evitar repetição
const avoid = new Set(); for (let i = 0; i < 20; i++) { const q = Gen.make('subnetInfo', 'basico', 42, avoid); assert.ok(!avoid.has(q.sig)); avoid.add(q.sig); }
console.log(`questions: ${n} questões geradas e validadas`);
