import assert from 'node:assert/strict';
import { load } from './load.mjs';
const { Bank, Check, IPv6, CONFIG, IPv4 } = load();
const ids = new Set();
const perGroup = {};
for (const q of Bank.exam) {
  assert.ok(!ids.has(q.id), 'id duplicado ' + q.id); ids.add(q.id);
  assert.ok(CONFIG.topics.find(t => t.id === q.topic), 'tópico ' + q.topic);
  assert.equal(q.hints.length, 3, q.id); assert.ok(q.hints.every(Boolean), q.id);
  assert.ok(q.fb.concept, q.id + ' concept'); assert.ok(q.fb.steps.length, q.id + ' steps');
  const vals = {}; for (const f of q.fields) vals[f.key] = f.type === 'ipv6short' ? IPv6.compress(q.answer[f.key]) : f.type === 'ipv6full' ? IPv6.expand(q.answer[f.key]) : String(q.answer[f.key]);
  assert.ok(Check.question(q, vals).ok, q.id);
  for (const f of q.fields) assert.ok(q.tags[f.key] || q.tags['*'] || q.tags.c, q.id + ' tag ' + f.key);
  for (const t of Object.values(q.tags)) if (t) assert.ok(CONFIG.errorTags[t], q.id + ' errorTag ' + t);
  const g = CONFIG.topics.find(t => t.id === q.topic).group; perGroup[g] = (perGroup[g] || 0) + 1;
}
// respostas numéricas conferidas com o engine
const I = IPv4.toInt;
assert.equal(IPv4.toStr(IPv4.network(I('192.168.12.139'), 26)), Bank.byId['v-cidr-1'].answer.n);
assert.equal(IPv4.toStr(IPv4.broadcast(I('172.16.18.50'), 20)), Bank.byId['v-cidr-4'].answer.b);
assert.equal(IPv6.compress('2001:0DB8:0000:0000:00A0:0000:0000:0007'), '2001:db8::a0:0:0:7');
for (const d of Bank.diagnostic) assert.ok(d.options[d.unknownIndex] === 'Não sei' && d.correct < d.unknownIndex);
assert.equal(Bank.diagnostic.length, 12);
console.log(`bank: ${Bank.exam.length} questões OK; por grupo`, JSON.stringify(perGroup));
