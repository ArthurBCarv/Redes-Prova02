import assert from 'node:assert/strict';
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/js');
const ctx = vm.createContext({ console, Date, Math, JSON });
const code = fs.readdirSync(dir).filter(f => /^(0\d|1\d)-/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n;({IOS, Labs, IPv4})';
const { IOS, Labs } = vm.runInContext(code, ctx);
let n = 0;
function run(lab, dev, cmds) { let s = IOS.newSession(dev); for (const c of cmds) { const r = IOS.exec(lab, s, c); assert.ok(r.ok, `${dev}: "${c}" → ${r.out.join(' | ')} (modo ${s.mode})`); lab = r.lab; s = r.session; } return lab; }
for (const sc of Labs.scenarios) {
  let lab = sc.build();
  const ctxT = { pings: [{ a: 'PC-A', b: 'PC-B', ok: false }], answers: { root: 'S1' } };
  // antes da solução: tarefas de configuração não concluídas
  const pre = sc.tasks.filter(t => !t.observe && !t.ask).filter(t => t.check(lab, ctxT));
  assert.equal(pre.length, 0, sc.id + ' tarefas já concluídas antes: ' + pre.map(t => t.id));
  for (const [dev, cmds] of Object.entries(sc.solution)) lab = run(lab, dev, cmds);
  for (const t of sc.tasks) assert.ok(t.check(lab, ctxT), `${sc.id} ${t.id} falhou após solução`);
  n++;
}
// Lab 3.4.6: antes do trunk o ping falha (auto+auto), depois funciona
{
  let lab = Labs.byId.lab346.build();
  const sol = Labs.byId.lab346.solution;
  lab = run(lab, 'S1', sol.S1.slice(0, sol.S1.indexOf('interface f0/1')).concat(['end']));
  lab = run(lab, 'S2', sol.S2.slice(0, sol.S2.indexOf('interface f0/1')).concat(['end']));
  const r = IOS.ping(lab, 'PC-A', 'PC-B'); assert.ok(!r.ok); assert.match(r.reason, /trunk/);
  assert.ok(!IOS.trunkUp(lab, 'S1', 'Fa0/1'));
  // desirable negocia
  let l2 = run(lab, 'S1', ['enable', 'conf t', 'int f0/1', 'switchport mode dynamic desirable', 'end']);
  assert.ok(IOS.trunkUp(l2, 'S1', 'Fa0/1')); assert.ok(IOS.ping(l2, 'PC-A', 'PC-B').ok);
  // allowed sem VLAN 10 quebra
  let l3 = run(l2, 'S1', ['enable', 'conf t', 'int f0/1', 'switchport mode trunk', 'switchport trunk allowed vlan 20,99', 'end']);
  l3 = run(l3, 'S2', ['enable', 'conf t', 'int f0/1', 'switchport mode trunk', 'end']);
  assert.ok(!IOS.ping(l3, 'PC-A', 'PC-B').ok);
  n++;
}
// ROAS: subinterface sem encapsulation recusa IP; gateway errado detectado
{
  let lab = Labs.byId.roas.build();
  let s = IOS.newSession('R1');
  for (const c of ['en', 'conf t', 'int g0/0.10']) ({ lab, session: s } = IOS.exec(lab, s, c));
  const r = IOS.exec(lab, s, 'ip address 192.168.10.1 255.255.255.0'); assert.ok(!r.ok);
  for (const [d, cmds] of Object.entries(Labs.byId.roas.solution)) lab = run(lab, d, cmds);
  lab.hosts['PC-A'].gw = '192.168.10.254';
  const p = IOS.ping(lab, 'PC-A', 'PC-B'); assert.ok(!p.ok); assert.match(p.reason, /192\.168\.10\.254/);
  const rt = IOS.execShow(lab, 'R1', ['ip', 'route']); assert.ok(rt.some(l => l.includes('C    192.168.10.0/24')) && rt.some(l => l.includes('C    192.168.20.0/24')));
  n++;
}
// abreviações e erros úteis
{
  let lab = Labs.byId.lab346.build(); let s = IOS.newSession('S1');
  let r = IOS.exec(lab, s, 'vlan 10'); assert.ok(!r.ok); assert.match(r.out.join(), /Invalid/);
  ({ lab, session: s } = IOS.exec(lab, s, 'en')); ({ lab, session: s } = IOS.exec(lab, s, 'conf t'));
  r = IOS.exec(lab, s, 'show vlan brief'); assert.ok(!r.ok); assert.match(r.out.join(), /do show/);
  r = IOS.exec(lab, s, 'do sh vl br'); assert.ok(r.ok); assert.match(r.out.join('\n'), /default/);
  r = IOS.exec(lab, s, 'spanning-tree vlan 1 priority 1000'); assert.ok(!r.ok); assert.match(r.out.join(), /4096/);
  ({ lab, session: s } = IOS.exec(lab, s, 'int range fa0/2 - 5'));
  assert.equal(s.mode, 'range');
  ({ lab, session: s } = IOS.exec(lab, s, 'sw mo acc'));
  ({ lab, session: s } = IOS.exec(lab, s, 'sw acc vl 30'));
  assert.equal(lab.devices.S1.ports['Fa0/3'].access, 30); assert.ok(lab.devices.S1.vlans[30]);
  r = IOS.exec(lab, s, 'ip address 1.1.1.1 255.0.0.0'); assert.ok(!r.ok);
  ({ lab, session: s } = IOS.exec(lab, s, 'end')); assert.equal(s.mode, 'priv');
  const run1 = IOS.execShow(lab, 'S1', ['run']); assert.ok(run1.join('\n').includes('switchport access vlan 30'));
  n++;
}
// STP via lab: raiz S1 por MAC; após prioridade S3 vira raiz; bloqueio existe
{
  let lab = Labs.byId.stp.build();
  let st = IOS.stpForVlan(lab, 1); assert.equal(st.r.rootOf.S2, 'S1'); assert.ok(Object.values(st.r.ports).some(p => p.role === 'blocked'));
  lab = run(lab, 'S3', ['en', 'conf t', 'spanning-tree vlan 1 priority 4096', 'end']);
  st = IOS.stpForVlan(lab, 1); assert.equal(st.r.rootOf.S1, 'S3');
  const show = IOS.execShow(lab, 'S3', ['spanning-tree']).join('\n'); assert.match(show, /This bridge is the root/); assert.match(show, /4097/);
  n++;
}
console.log(`ios: ${n} grupos de testes OK`);
