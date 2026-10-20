import assert from 'node:assert/strict';
import { load } from './load.mjs';
const { IPv4, VLSM, IPv6, STP, Adaptive, CONFIG } = load();
let passed = 0; const t = (name, fn) => { fn(); passed++; };
const deq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const I = IPv4.toInt, S = IPv4.toStr;

// ---------- Casos fixos (seção 20) ----------
t('192.168.30.100/27', () => { const i = IPv4.info(I('192.168.30.100'), 27); assert.equal(S(i.network), '192.168.30.96'); assert.equal(S(i.broadcast), '192.168.30.127'); assert.equal(i.usable, 30); });
t('172.16.150.1/22', () => { const i = IPv4.info(I('172.16.150.1'), 22); assert.equal(S(i.network), '172.16.148.0'); assert.equal(i.mask, '255.255.252.0'); assert.equal(S(i.broadcast), '172.16.151.255'); });
t('bc 20.4.135.255/23', () => assert.equal(S(IPv4.network(I('20.4.135.255'), 23)), '20.4.134.0'));
t('60 hosts → /26', () => assert.equal(IPv4.minPrefixForHosts(60), 26));
t('150 hosts → /24', () => assert.equal(IPv4.minPrefixForHosts(150), 24));
t('14 hosts → /28', () => assert.equal(IPv4.minPrefixForHosts(14), 28));
t('2 hosts → /30', () => assert.equal(IPv4.minPrefixForHosts(2), 30));
t('/22 → 1022', () => assert.equal(IPv4.usableHosts(IPv4.prefixFromMask('255.255.252.0')), 1022));
t('/21 → 2046', () => assert.equal(IPv4.usableHosts(IPv4.prefixFromMask('255.255.248.0')), 2046));
t('/31 /32', () => { assert.equal(IPv4.usableHosts(31), 2); assert.equal(IPv4.usableHosts(32), 1); });
t('3 bits → 8', () => assert.equal(IPv4.bitsForSubnets(8), 3));
t('10 sub-redes → 4 bits', () => assert.equal(IPv4.bitsForSubnets(10), 4));
t('mask parse', () => { assert.equal(IPv4.prefixFromMask('255.255.255.192'), 26); assert.equal(IPv4.prefixFromMask('255.255.0.255'), null); assert.equal(IPv4.parsePrefix('/27'), 27); assert.equal(IPv4.parsePrefix('255.255.255.224'), 27); });
t('jump', () => { deq([IPv4.jump(27).jump, IPv4.jump(27).octetIndex], [32, 3]); deq([IPv4.jump(22).jump, IPv4.jump(22).octetIndex], [4, 2]); assert.equal(IPv4.jump(24).jump, 256); });
t('classes', () => { assert.equal(IPv4.classOf(186).cls, 'B'); assert.equal(IPv4.classOf(127).cls, 'Loopback'); assert.equal(IPv4.classOf(126).cls, 'A'); assert.equal(IPv4.classOf(223).cls, 'C'); assert.equal(IPv4.classOf(224).cls, 'D'); });
t('privados', () => { assert.ok(IPv4.isPrivate(I('172.31.255.1'))); assert.ok(!IPv4.isPrivate(I('172.32.0.1'))); assert.ok(IPv4.isPrivate(I('10.9.9.9'))); });
t('sumarização exata', () => { const s = IPv4.summarize([{ net: I('192.168.32.0'), prefix: 24 }, { net: I('192.168.33.0'), prefix: 24 }]); assert.equal(S(s.net), '192.168.32.0'); assert.equal(s.prefix, 23); assert.ok(s.exact); });
t('sumarização não exata', () => { const s = IPv4.summarize([{ net: I('192.168.33.0'), prefix: 24 }, { net: I('192.168.34.0'), prefix: 24 }]); assert.equal(S(s.net), '192.168.32.0'); assert.equal(s.prefix, 22); assert.ok(!s.exact); assert.equal(s.extra, 2 * 256); });
t('sumarização 4 redes', () => { const s = IPv4.summarize([0, 1, 2, 3].map(k => ({ net: I(`10.1.${4 + k}.0`), prefix: 24 }))); assert.equal(S(s.net), '10.1.4.0'); assert.equal(s.prefix, 22); assert.ok(s.exact); });
t('VLSM prof', () => {
  const r = VLSM.allocate(I('192.168.50.0'), 24, [{ name: 'A', hosts: 50 }, { name: 'B', hosts: 20 }, { name: 'C', hosts: 10 }, { name: 'D', hosts: 5 }, { name: 'E', hosts: 2 }, { name: 'F', hosts: 2 }]);
  assert.ok(r.ok);
  deq(r.allocations.map(a => `${S(a.net)}/${a.prefix}`), ['192.168.50.0/26', '192.168.50.64/27', '192.168.50.96/28', '192.168.50.112/29', '192.168.50.120/30', '192.168.50.124/30']);
  assert.equal(S(r.allocations[0].last), '192.168.50.62');
});
t('VLSM simulado', () => { const r = VLSM.allocate(I('192.168.40.0'), 24, [{ name: 'X', hosts: 8 }, { name: 'Y', hosts: 70 }, { name: 'Z', hosts: 25 }]); deq(r.allocations.map(a => `${a.name}:${S(a.net)}/${a.prefix}`), ['Y:192.168.40.0/25', 'Z:192.168.40.128/27', 'X:192.168.40.160/28']); });
t('VLSM desafio 250', () => { const r = VLSM.allocate(I('192.168.250.0'), 24, ['Eng', 'Fin', 'Adm'].map(n => ({ name: n, hosts: 30 }))); deq(r.allocations.map(a => `${S(a.net)}/${a.prefix}`), ['192.168.250.0/27', '192.168.250.32/27', '192.168.250.64/27']); });
t('VLSM não cabe', () => assert.ok(!VLSM.allocate(I('192.168.1.0'), 24, [{ name: 'A', hosts: 200 }, { name: 'B', hosts: 100 }]).ok));
t('alinhamento Q19', () => { const c = VLSM.checkAlignment(I('192.168.1.32'), 26); assert.ok(!c.aligned); assert.equal(S(c.realNetwork), '192.168.1.0'); assert.equal(S(c.nextValid), '192.168.1.64'); deq(VLSM.findOverlaps([{ name: 'sw', net: I('192.168.1.0'), prefix: 27 }, { name: 'srv', net: I('192.168.1.0'), prefix: 26 }]), [['sw', 'srv']]); });

// ---------- IPv6 ----------
t('ipv6 compress', () => {
  assert.equal(IPv6.compress('2001:0db8:0000:0000:0000:0000:0000:0001'), '2001:db8::1');
  assert.equal(IPv6.compress('2001:0DB8:0000:0000:00A0:0000:0000:0007'), '2001:db8::a0:0:0:7');
  assert.equal(IPv6.compress('2001:db8:0:1:1:1:1:1'), '2001:db8:0:1:1:1:1:1');
  assert.equal(IPv6.compress('0:0:0:0:0:0:0:0'), '::');
  assert.equal(IPv6.compress('0:0:0:0:0:0:0:1'), '::1');
  assert.equal(IPv6.compress('fe80:0:0:0:0:0:0:0'), 'fe80::');
  assert.equal(IPv6.compress('2001:0:0:1:0:0:0:1'), '2001:0:0:1::1');
});
t('ipv6 expand', () => { assert.equal(IPv6.expand('2001:db8::1'), '2001:0db8:0000:0000:0000:0000:0000:0001'); assert.equal(IPv6.expand('::'), '0000:0000:0000:0000:0000:0000:0000:0000'); });
t('ipv6 inválidos', () => { for (const x of ['2001::db8::1', '2001:db8:::1', '12345::', '1:2:3:4:5:6:7:8:9', 'g::1', ':1::']) assert.equal(IPv6.parse(x), null, x); });
t('ipv6 tipos', () => { const c = s => IPv6.classify(s).id; assert.equal(c('fe80::1'), 'link-local'); assert.equal(c('febf::1'), 'link-local'); assert.equal(c('fec0::1'), 'other'); assert.equal(c('ff02::1'), 'multicast'); assert.equal(c('fd00::1'), 'ula'); assert.equal(c('2001:db8::1'), 'documentation'); assert.equal(c('2800:3f0::1'), 'global'); assert.equal(c('::1'), 'loopback'); assert.equal(c('::'), 'unspecified'); });

// ---------- STP ----------
const P = (name, num) => ({ name, num });
t('STP triângulo', () => {
  const sws = [{ id: 'S1', priority: 32768, mac: '0001.aaaa.0003' }, { id: 'S2', priority: 32768, mac: '0001.aaaa.0001' }, { id: 'S3', priority: 32768, mac: '0001.aaaa.0002' }];
  const links = [{ id: 'L12', a: 'S1', pa: P('Fa0/1', 1), b: 'S2', pb: P('Fa0/1', 1), cost: 19 }, { id: 'L13', a: 'S1', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/1', 1), cost: 19 }, { id: 'L23', a: 'S2', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/2', 2), cost: 19 }];
  const r = STP.compute(sws, links);
  assert.equal(r.rootOf.S1, 'S2'); // empate de prioridade → menor MAC
  assert.equal(r.rootPort.S1, 'Fa0/1'); assert.equal(r.rootPort.S3, 'Fa0/2');
});
t('STP desempate BID no segmento', () => {
  const sws = [{ id: 'S1', priority: 32768, mac: '0001.aaaa.0003' }, { id: 'S2', priority: 32768, mac: '0001.aaaa.0001' }, { id: 'S3', priority: 32768, mac: '0001.aaaa.0002' }];
  const links = [{ id: 'L12', a: 'S1', pa: P('Fa0/1', 1), b: 'S2', pb: P('Fa0/1', 1), cost: 19 }, { id: 'L13', a: 'S1', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/1', 1), cost: 19 }, { id: 'L23', a: 'S2', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/2', 2), cost: 19 }];
  const r = STP.compute(sws, links);
  assert.equal(r.ports['S3|Fa0/1'].role, 'designated');
  assert.equal(r.ports['S1|Fa0/2'].role, 'blocked');
});
t('STP prioridade vence MAC', () => {
  const sws = [{ id: 'A', priority: 4096, mac: 'ffff.ffff.ffff' }, { id: 'B', priority: 32768, mac: '0000.0000.0001' }];
  const r = STP.compute(sws, [{ id: 'l', a: 'A', pa: P('G0/1', 1), b: 'B', pb: P('G0/1', 1), cost: 4 }]);
  assert.equal(r.rootOf.B, 'A');
});
t('STP custo', () => {
  // S1 root; S3 alcança por S2 (4+4=8) melhor que direto (19)
  const sws = [{ id: 'S1', priority: 4096, mac: '0000.0000.0009' }, { id: 'S2', priority: 32768, mac: '0000.0000.0001' }, { id: 'S3', priority: 32768, mac: '0000.0000.0002' }];
  const links = [{ id: 'a', a: 'S1', pa: P('G0/1', 25), b: 'S2', pb: P('G0/1', 25), cost: 4 }, { id: 'b', a: 'S1', pa: P('Fa0/1', 1), b: 'S3', pb: P('Fa0/1', 1), cost: 19 }, { id: 'c', a: 'S2', pa: P('G0/2', 26), b: 'S3', pb: P('G0/2', 26), cost: 4 }];
  const r = STP.compute(sws, links);
  assert.equal(r.cost.S3, 8); assert.equal(r.rootPort.S3, 'G0/2'); assert.equal(r.ports['S3|Fa0/1'].role, 'blocked'); assert.equal(r.ports['S1|Fa0/1'].role, 'designated');
});
t('STP enlaces paralelos → port id do vizinho', () => {
  const sws = [{ id: 'R', priority: 0, mac: '0000.0000.0001' }, { id: 'X', priority: 32768, mac: '0000.0000.0002' }];
  const links = [{ id: '1', a: 'R', pa: P('Fa0/2', 2), b: 'X', pb: P('Fa0/1', 1), cost: 19 }, { id: '2', a: 'R', pa: P('Fa0/1', 1), b: 'X', pb: P('Fa0/2', 2), cost: 19 }];
  const r = STP.compute(sws, links);
  assert.equal(r.rootPort.X, 'Fa0/2'); // vizinho R Fa0/1 tem port id menor
  assert.equal(r.ports['X|Fa0/1'].role, 'blocked');
});
t('STP link caído reconverge', () => {
  const sws = [{ id: 'S1', priority: 4096, mac: '0000.0000.0009' }, { id: 'S2', priority: 32768, mac: '0000.0000.0001' }, { id: 'S3', priority: 32768, mac: '0000.0000.0002' }];
  const links = [{ id: 'a', a: 'S1', pa: P('Fa0/1', 1), b: 'S2', pb: P('Fa0/1', 1), cost: 19, up: false }, { id: 'b', a: 'S1', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/1', 1), cost: 19 }, { id: 'c', a: 'S2', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/2', 2), cost: 19 }];
  const r = STP.compute(sws, links);
  assert.equal(r.rootPort.S2, 'Fa0/2'); assert.equal(r.cost.S2, 38); assert.equal(r.ports['S2|Fa0/1'].role, 'disabled');
  assert.ok(!Object.values(r.ports).some(p => p.role === 'blocked'));
});

// ---------- 1.000+ casos aleatórios com invariantes ----------
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
t('aleatórios IPv4', () => {
  for (let k = 0; k < 3000; k++) {
    const ip = ri(1, 223) * 2 ** 24 + ri(0, 255) * 65536 + ri(0, 255) * 256 + ri(0, 255);
    const p = ri(8, 30);
    const i = IPv4.info(ip, p);
    assert.ok(i.network <= ip && ip <= i.broadcast);
    assert.equal(i.network % i.total, 0);
    assert.equal(i.broadcast - i.network + 1, i.total);
    assert.equal(i.usable, i.total - 2);
    assert.equal(IPv4.toInt(IPv4.toStr(ip)), ip);
    assert.equal(IPv4.prefixFromMask(i.mask), p);
    // método do salto bate com AND binário
    const o = i.octetIndex; const ipO = Math.floor(ip / 2 ** (24 - 8 * o)) % 256; const netO = Math.floor(i.network / 2 ** (24 - 8 * o)) % 256;
    assert.equal(netO, Math.floor(ipO / i.jump) * i.jump);
  }
});
t('aleatórios VLSM', () => {
  for (let k = 0; k < 1500; k++) {
    const bp = ri(16, 26); const base = IPv4.network(ri(1, 223) * 2 ** 24 + ri(0, 65535) * 256, bp);
    const n = ri(2, 6); const demands = Array.from({ length: n }, (_, j) => ({ name: 'R' + j, hosts: ri(2, Math.max(2, Math.floor(2 ** (32 - bp) / (n + 1)))) }));
    const r = VLSM.allocate(base, bp, demands);
    if (!r.ok) continue;
    const list = r.allocations;
    deq(VLSM.findOverlaps(list.map(a => ({ name: a.name, net: a.net, prefix: a.prefix }))), []);
    for (const a of list) {
      assert.ok(IPv4.isAligned(a.net, a.prefix));
      assert.ok(a.net >= base && a.bc <= IPv4.broadcast(base, bp));
      assert.ok(IPv4.usableHosts(a.prefix) >= a.hosts);
      assert.ok(a.prefix === 30 || IPv4.usableHosts(a.prefix + 1) < a.hosts); // menor bloco possível
    }
  }
});
t('aleatórios IPv6 ida e volta', () => {
  for (let k = 0; k < 2000; k++) {
    const g = Array.from({ length: 8 }, () => (rnd() < 0.45 ? 0 : ri(0, 65535)));
    const full = g.map(x => x.toString(16).padStart(4, '0')).join(':');
    const c = IPv6.compress(full);
    assert.equal(IPv6.expand(c), full);
    assert.ok((c.match(/::/g) || []).length <= 1);
    assert.ok(IPv6.equal(c, full));
  }
});
t('aleatórios sumarização', () => {
  for (let k = 0; k < 1000; k++) {
    const p = ri(18, 28); const cnt = 2 ** ri(1, 3); const sp = p - Math.log2(cnt);
    const base = IPv4.network(ri(1, 223) * 2 ** 24 + ri(0, 2 ** 24 - 1), sp);
    const nets = Array.from({ length: cnt }, (_, j) => ({ net: base + j * 2 ** (32 - p), prefix: p }));
    const s = IPv4.summarize(nets);
    assert.equal(s.net, base); assert.equal(s.prefix, sp); assert.ok(s.exact);
  }
});

// ---------- Adaptativo: perfis ----------
const now = Date.parse('2026-10-19T20:00:00');
function sim(answers) { // answers: [[topic, result, kind]]
  const topics = {};
  for (const [id, result, kind, extra] of answers) topics[id] = Adaptive.recordAttempt(topics[id] || Adaptive.newTopicRecord(id), { result, kind: kind || 'k' + Math.random(), now, ...(extra || {}) });
  return topics;
}
t('Perfil A: erra máscaras → fundamentos antes de VLSM', () => {
  const ans = [['ipv4', 'independent', 'a'], ['ipv4', 'independent', 'b'], ['ipv4', 'independent', 'c']];
  for (let i = 0; i < 6; i++) ans.push(['mascara', 'incorrect', 'm' + i]);
  const topics = sim(ans);
  const rec = Adaptive.recommend({ topics, now, mode: 'complete', settings: {} });
  const rows = Object.fromEntries(rec.rows.map(r => [r.topicId, r]));
  assert.ok(rows.vlsm.blockedBy.length > 0, 'VLSM deve estar bloqueado');
  assert.ok(rows.cidr.blockedBy.includes('mascara'));
  // emergência no bloco de VLSM → recomendar fundamento
  const recE = Adaptive.recommend({ topics, now, mode: 'emergency', remainingMinutes: 400, block: CONFIG.blocks[2], settings: {} });
  assert.ok(['mascara', 'ipv4'].includes(recE.topicId), 'recomendou ' + recE.topicId);
  assert.equal(recE.type, 'learn');
  const ex = Adaptive.explain(recE);
  assert.ok(ex.lines.join(' ').includes('Máscaras'));
});
t('Perfil B: domina IPv4 → intermediário/avança', () => {
  const ans = [];
  ['a', 'b', 'c', 'd', 'e'].forEach(k => ans.push(['ipv4', 'independent', k]));
  ans.push(['mascara', 'independent', 'diag', { diagnostic: true }]);
  const topics = sim(ans);
  assert.equal(topics.ipv4.status, 'mastered');
  const rec = Adaptive.recommend({ topics, now, mode: 'emergency', remainingMinutes: 500, block: CONFIG.blocks[1], settings: {} });
  assert.equal(rec.topicId, 'mascara');
  assert.equal(rec.type, 'practice'); assert.equal(rec.difficulty, 'intermediario');
  const recBlock1 = Adaptive.recommend({ topics, now: now + 1000, mode: 'emergency', remainingMinutes: 550, block: CONFIG.blocks[0], settings: {} });
  assert.notEqual(recBlock1.topicId, 'ipv4'); // já dominado, não repete a aula
});
t('Perfil C: 2 h restantes → reorganiza com cobertura e reserva', () => {
  const topics = sim([['ipv4', 'incorrect', 'a'], ['stp', 'incorrect', 'b']]);
  const plan = Adaptive.planRemaining({ topics, now, settings: {} }, 120);
  const total = plan.reduce((s, p) => s + p.minutes, 0);
  assert.equal(total, 120);
  assert.ok(plan.some(p => p.kind === 'exam'));
  assert.ok(plan.some(p => p.kind === 'final'));
  const groups = new Set(plan.filter(p => p.kind === 'study').map(p => p.group));
  assert.equal(groups.size, 5);
  assert.ok(plan.filter(p => p.kind === 'study').every(p => p.minutes >= 10));
  const rec = Adaptive.recommend({ topics, now, mode: 'emergency', remainingMinutes: 90, settings: {} });
  assert.equal(rec.type, 'exam');
});
t('explain corresponde aos fatores', () => {
  const topics = sim([['ipv4', 'incorrect', 'a'], ['ipv4', 'incorrect', 'b']]);
  const rec = Adaptive.recommend({ topics, now, mode: 'complete', settings: {} });
  const ex = Adaptive.explain(rec);
  const w = CONFIG.defaults.weights; const f = rec.row.factors;
  const expected = f.importance * w.importance + f.learningGap * w.gap + f.prerequisiteRelevance * w.prereq + f.reviewUrgency * w.urgency - rec.row.repeatPenalty;
  assert.ok(Math.abs(expected - ex.score) < 1e-12);
  assert.ok(rec.rows.every(r => r.topicId === rec.topicId || r.blockedBy.length || r.score <= rec.row.score));
  assert.ok(ex.lines.some(l => l.includes('2 erro(s) seguido(s)')));
});
t('anti-repetição', () => {
  const topics = sim([['ipv4', 'incorrect', 'a']]);
  const r1 = Adaptive.recommend({ topics, now, mode: 'complete', settings: {}, recHistory: [] });
  const r2 = Adaptive.recommend({ topics, now, mode: 'complete', settings: {}, recHistory: Array(6).fill(r1.topicId) });
  assert.notEqual(r1.topicId, r2.topicId);
});
t('poucos acertos não viram domínio', () => {
  const topics = sim([['stp', 'independent', 'a'], ['stp', 'independent', 'b']]);
  assert.notEqual(topics.stp.status, 'mastered'); assert.ok(topics.stp.masteryScore < 0.75);
});
t('acerto assistido não é domínio', () => {
  const topics = sim([1, 2, 3, 4, 5].map(i => ['mac', 'assisted', 'k' + i]));
  assert.notEqual(topics.mac.status, 'mastered');
});
t('VLSM exige 2 problemas completos', () => {
  let topics = sim([['vlsm', 'independent', 'full', { fullVlsm: true, sig: 'p1' }], ['vlsm', 'independent', 'full', { fullVlsm: true, sig: 'p1' }]]);
  assert.notEqual(topics.vlsm.status, 'mastered');
  topics = sim([['vlsm', 'independent', 'full', { fullVlsm: true, sig: 'p1' }], ['vlsm', 'independent', 'full', { fullVlsm: true, sig: 'p2' }]]);
  assert.equal(topics.vlsm.status, 'mastered');
});

console.log(`engines: ${passed} testes OK`);
