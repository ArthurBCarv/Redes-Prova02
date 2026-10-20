/* ==========================================================================
   Terminal educacional Cisco IOS — SUBCONJUNTO de comandos (não é um emulador completo)
   Modelo: lab = { devices:{id:Device}, links:[{a,pa,b,pb}], hosts:{id:Host} }
   Switch: {type:'switch', l3?:bool, hostname, vlans:{id:{name}}, ports:{name:Port}, svis:{vlan:{ip,mask,shutdown}}, ipRouting, stp:{mode, priority:{vlan:n}}, mac, saved, secret, noDomainLookup}
   Port: {mode:'dynamic auto'|'access'|'trunk'|'dynamic desirable', access:1, allowed:'all'|[ids], native:1, shutdown:false, nonegotiate, portfast, bpduguard, cost, encapDot1q, desc}
   Router: {type:'router', hostname, ifaces:{name:{ip,mask,shutdown,encap,desc}}, dhcp:{pools:{name:{network,mask,router,dns}}, excluded:[[a,b]]}, routes:[{net,mask,nh}]}
   Host: {id, sw, port, ip, mask, gw, dhcp:bool, mac}
   ========================================================================== */
const IOS = (() => {
  const clone = o => JSON.parse(JSON.stringify(o));
  const I = IPv4.toInt;

  /* ---------- nomes de interface ---------- */
  function normIface(raw) {
    const s = String(raw).trim().replace(/\s+/g, '');
    const m = s.match(/^([a-z]+)(\d+\/\d+(?:\/\d+)?)(?:\.(\d+))?$/i);
    if (!m) return null;
    const t = m[1].toLowerCase();
    let pre = null;
    if ('fastethernet'.startsWith(t) || t === 'fa' || t === 'f') pre = 'Fa';
    else if ('gigabitethernet'.startsWith(t) || t === 'gi' || t === 'g') pre = 'Gi';
    if (!pre) return null;
    return `${pre}${m[2]}${m[3] ? '.' + m[3] : ''}`;
  }
  const longName = n => n.replace(/^Fa/, 'FastEthernet').replace(/^Gi/, 'GigabitEthernet');
  /** "1,10,20-22" → [1,10,20,21,22] */
  function parseVlanList(s) {
    const out = [];
    for (const part of String(s).split(',')) {
      const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return null;
      const a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b > 4094 || b < a) return null;
      for (let v = a; v <= b; v++) out.push(v);
    }
    return out;
  }
  const vlanListStr = arr => { if (arr === 'all') return '1-4094'; const a = [...arr].sort((x, y) => x - y); const out = []; for (let i = 0; i < a.length;) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j > i ? `${a[i]}-${a[j]}` : `${a[i]}`); i = j + 1; } return out.join(','); };

  /* ---------- fábricas ---------- */
  function makeSwitch(hostname, portSpec, opts = {}) {
    const ports = {};
    for (const p of portSpec) ports[p] = { mode: 'dynamic auto', access: 1, allowed: 'all', native: 1, shutdown: false };
    return { type: 'switch', l3: !!opts.l3, hostname, vlans: { 1: { name: 'default' } }, ports, svis: { 1: { ip: null, mask: null, shutdown: true } }, ipRouting: false, stp: { mode: 'pvst', priority: {} }, mac: opts.mac || '0001.4200.0001', saved: false };
  }
  function makeRouter(hostname, ifaces) {
    const f = {}; for (const i of ifaces) f[i] = { ip: null, mask: null, shutdown: true };
    return { type: 'router', hostname, ifaces: f, dhcp: { pools: {}, excluded: [] }, routes: [], saved: false };
  }
  const faRange = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => `Fa0/${a + i}`);

  /* ---------- sessão ---------- */
  const newSession = device => ({ device, mode: 'user', ctx: null, history: [] });
  function prompt(lab, s) {
    const d = lab.devices[s.device]; const h = d.hostname;
    return { user: `${h}>`, priv: `${h}#`, config: `${h}(config)#`, if: `${h}(config-if)#`, range: `${h}(config-if-range)#`, subif: `${h}(config-subif)#`, vlan: `${h}(config-vlan)#`, dhcp: `${h}(dhcp-config)#` }[s.mode];
  }

  /* ---------- abreviações ---------- */
  const k = (tok, word, min = 1) => !!tok && tok.length >= min && word.startsWith(tok.toLowerCase());
  const ERR_INVALID = "% Invalid input detected at '^' marker.";
  const ERR_INCOMPLETE = '% Incomplete command.';

  /* ---------- helpers de estado ---------- */
  function vlanExists(sw, v) { return !!sw.vlans[v]; }
  function portVlans(p) { return p.mode === 'trunk' ? (p.allowed === 'all' ? 'all' : p.allowed) : null; }

  /* ======================= EXECUÇÃO ======================= */
  /** Executa uma linha. Retorna {lab, session, out:[...linhas], ok:boolean} sem mutar os argumentos. */
  function exec(labIn, sessIn, line) {
    const lab = clone(labIn), s = clone(sessIn);
    const out = [];
    const raw = String(line).trim();
    s.history = [...(s.history || []), raw].slice(-50);
    if (!raw || raw.startsWith('!')) return { lab, session: s, out, ok: true };
    let t = raw.split(/\s+/);
    const dev = lab.devices[s.device];
    const fail = msg => { out.push(msg); return { lab, session: s, out, ok: false }; };
    const done = () => ({ lab, session: s, out, ok: true });

    // "do" em modos de configuração
    if (s.mode !== 'user' && s.mode !== 'priv' && k(t[0], 'do', 2)) {
      const r = k(t[1], 'show', 2) ? execShow(lab, s.device, t.slice(2)) : null;
      if (r) { out.push(...r); return done(); }
      if (k(t[1], 'write', 2) || k(t[1], 'wr', 2) || (k(t[1], 'copy', 2))) { dev.saved = true; out.push('Building configuration...', '[OK]'); return done(); }
      return fail(ERR_INVALID);
    }
    // end / exit universais
    if (k(t[0], 'end', 3) && !['user', 'priv'].includes(s.mode)) { s.mode = 'priv'; s.ctx = null; return done(); }
    if (k(t[0], 'exit', 3)) {
      if (s.mode === 'user') { out.push('(sessão encerrada — pressione Enter para reabrir)'); return done(); }
      if (s.mode === 'priv') { s.mode = 'user'; return done(); }
      if (s.mode === 'config') { s.mode = 'priv'; return done(); }
      s.mode = 'config'; s.ctx = null; return done();
    }
    if (raw === '?' || t[t.length - 1] === '?') { out.push(...help(s.mode, dev.type)); return done(); }

    switch (s.mode) {
      case 'user':
        if (k(t[0], 'enable', 2)) { s.mode = 'priv'; return done(); }
        if (k(t[0], 'show', 2)) { const r = execShow(lab, s.device, t.slice(1)); return r ? (out.push(...r), done()) : fail(ERR_INVALID); }
        if (k(t[0], 'ping', 2)) return (out.push(...pingFromDevice(lab, s.device, t[1])), done());
        return fail(`${ERR_INVALID}\nDica: no modo usuário (">") use "enable" para ir ao modo privilegiado.`);
      case 'priv':
        if (k(t[0], 'configure', 4) && (t.length === 1 || k(t[1], 'terminal', 1))) { s.mode = 'config'; out.push('Enter configuration commands, one per line.  End with CNTL/Z.'); return done(); }
        if (k(t[0], 'show', 2)) { const r = execShow(lab, s.device, t.slice(1)); return r ? (out.push(...r), done()) : fail(ERR_INVALID); }
        if (k(t[0], 'copy', 2) && t[1] && k(t[1], 'running-config', 3) && t[2] && k(t[2], 'startup-config', 3)) { dev.saved = true; out.push('Destination filename [startup-config]?', 'Building configuration...', '[OK]'); return done(); }
        if (k(t[0], 'write', 2) || raw.toLowerCase() === 'wr') { dev.saved = true; out.push('Building configuration...', '[OK]'); return done(); }
        if (k(t[0], 'disable', 4)) { s.mode = 'user'; return done(); }
        if (k(t[0], 'ping', 2)) return (out.push(...pingFromDevice(lab, s.device, t[1])), done());
        if (k(t[0], 'delete', 3) && /vlan\.dat$/i.test(t[1] || '')) {
          if (dev.type !== 'switch') return fail('%Error: arquivo inexistente');
          dev.vlans = { 1: { name: 'default' } }; for (const p of Object.values(dev.ports)) p.access = 1;
          out.push('Delete filename [vlan.dat]?', 'Delete flash:/vlan.dat? [confirm]', '(banco de VLANs apagado; portas voltam à VLAN 1)'); return done();
        }
        if (t[0] === 'conf' || t[0] === 'config') { s.mode = 'config'; return done(); }
        return fail(`${ERR_INVALID}${/^(vlan|interface|int|hostname|ip|switchport)/i.test(t[0]) ? '\nDica: esse comando é do modo de configuração. Use "configure terminal" primeiro.' : ''}`);
      case 'config': return cfgGlobal();
      case 'vlan': return cfgVlan();
      case 'if': case 'range': case 'subif': return cfgIf();
      case 'dhcp': return cfgDhcp();
    }
    return fail(ERR_INVALID);

    /* --- modo (config) --- */
    function cfgGlobal() {
      if (k(t[0], 'hostname', 3)) { if (!t[1]) return fail(ERR_INCOMPLETE); dev.hostname = t[1]; return done(); }
      if (k(t[0], 'no', 2) && k(t[1], 'ip', 2) && k(t[2], 'domain-lookup', 3)) { dev.noDomainLookup = true; return done(); }
      if (k(t[0], 'enable', 2) && k(t[1], 'secret', 2)) { if (!t[2]) return fail(ERR_INCOMPLETE); dev.secret = true; return done(); }
      if (k(t[0], 'interface', 2)) {
        if (!t[1]) return fail(ERR_INCOMPLETE);
        if (k(t[1], 'range', 1) && dev.type === 'switch') {
          const spec = t.slice(2).join(' ');
          const m = spec.match(/^([a-z]+\s*\d+\/)(\d+)\s*-\s*(?:[a-z]+\s*\d+\/)?(\d+)$/i);
          if (!m) return fail('% Formato: interface range fa0/2 - 5');
          const pre = normIface(m[1] + m[2]); if (!pre) return fail(ERR_INVALID);
          const base = pre.replace(/\d+$/, '');
          const list = []; for (let n = +m[2]; n <= +m[3]; n++) { const nm = base + n; if (!dev.ports[nm]) return fail(`% Interface ${nm} não existe neste equipamento.`); list.push(nm); }
          s.mode = 'range'; s.ctx = { ifaces: list }; return done();
        }
        if (k(t[1], 'vlan', 1) && dev.type === 'switch') {
          const v = +t[2]; if (!(v >= 1 && v <= 4094)) return fail(ERR_INVALID);
          dev.svis[v] = dev.svis[v] || { ip: null, mask: null, shutdown: true };
          s.mode = 'if'; s.ctx = { svi: v }; return done();
        }
        const name = normIface(t.slice(1).join(''));
        if (!name) return fail(ERR_INVALID);
        if (dev.type === 'router') {
          const parent = name.split('.')[0];
          if (!dev.ifaces[parent]) return fail(`% Interface ${parent} não existe neste roteador (disponíveis: ${Object.keys(dev.ifaces).filter(n => !n.includes('.')).join(', ')}).`);
          if (name.includes('.')) { dev.ifaces[name] = dev.ifaces[name] || { ip: null, mask: null, shutdown: false, encap: null }; s.mode = 'subif'; }
          else s.mode = 'if';
          s.ctx = { iface: name }; return done();
        }
        if (name.includes('.')) return fail('% Subinterfaces são configuradas no roteador, não no switch.');
        if (!dev.ports[name]) return fail(`% Interface ${name} não existe neste switch.`);
        s.mode = 'if'; s.ctx = { iface: name }; return done();
      }
      if (k(t[0], 'vlan', 2) && dev.type === 'switch') {
        const v = +t[1]; if (!(v >= 1 && v <= 4094) || !/^\d+$/.test(t[1] || '')) return fail(t[1] ? '% VLAN ID inválido (1–4094).' : ERR_INCOMPLETE);
        if (v >= 1002 && v <= 1005) return fail('% VLANs 1002–1005 são reservadas.');
        dev.vlans[v] = dev.vlans[v] || { name: `VLAN${String(v).padStart(4, '0')}` };
        s.mode = 'vlan'; s.ctx = { vlan: v }; return done();
      }
      if (k(t[0], 'no', 2) && k(t[1], 'vlan', 2) && dev.type === 'switch') {
        const v = +t[2]; if (v === 1) return fail('%Default VLAN 1 may not be deleted.');
        delete dev.vlans[v]; return done();
      }
      if (k(t[0], 'ip', 2) && k(t[1], 'routing', 3)) { if (dev.type !== 'switch' || !dev.l3) return fail(dev.type === 'router' ? '(roteadores já roteiam por padrão)' : '% Este switch é de camada 2 (2960) e não suporta "ip routing".'); dev.ipRouting = true; return done(); }
      if (k(t[0], 'no', 2) && k(t[1], 'ip', 2) && k(t[2], 'routing', 3)) { dev.ipRouting = false; return done(); }
      if (k(t[0], 'spanning-tree', 2) && dev.type === 'switch') {
        if (k(t[1], 'mode', 1)) { if (k(t[2], 'rapid-pvst', 1)) dev.stp.mode = 'rapid-pvst'; else if (k(t[2], 'pvst', 1)) dev.stp.mode = 'pvst'; else return fail(ERR_INVALID); return done(); }
        if (k(t[1], 'vlan', 1)) {
          const v = +t[2];
          if (k(t[3], 'priority', 2)) { const p = +t[4]; if (!(p >= 0 && p <= 61440) || p % 4096) return fail('% Bridge Priority must be in increments of 4096.\n% Allowed values are: 0 4096 8192 12288 16384 20480 24576 28672 32768 36864 40960 45056 49152 53248 57344 61440'); dev.stp.priority[v] = p; return done(); }
          if (k(t[3], 'root', 2) && k(t[4], 'primary', 2)) { dev.stp.priority[v] = 24576; out.push('(root primary: prioridade ajustada para 24576 neste simulador)'); return done(); }
          return fail(ERR_INVALID);
        }
        return fail(ERR_INVALID);
      }
      if (k(t[0], 'ip', 2) && k(t[1], 'dhcp', 2) && dev.type === 'router') {
        if (k(t[2], 'pool', 1)) { if (!t[3]) return fail(ERR_INCOMPLETE); dev.dhcp.pools[t[3]] = dev.dhcp.pools[t[3]] || { network: null, mask: null, router: null, dns: null }; s.mode = 'dhcp'; s.ctx = { pool: t[3] }; return done(); }
        if (k(t[2], 'excluded-address', 2)) { const a = I(t[3] || ''), b = t[4] ? I(t[4]) : a; if (a === null || b === null) return fail(ERR_INVALID); dev.dhcp.excluded.push([t[3], t[4] || t[3]]); return done(); }
        return fail(ERR_INVALID);
      }
      if (k(t[0], 'ip', 2) && k(t[1], 'route', 3) && (dev.type === 'router' || dev.ipRouting)) {
        if (I(t[2] || '') === null || IPv4.prefixFromMask(t[3] || '') === null || !t[4]) return fail('% Sintaxe: ip route REDE MÁSCARA PRÓXIMO-SALTO|INTERFACE');
        dev.routes.push({ net: t[2], mask: t[3], nh: t[4] }); return done();
      }
      if (k(t[0], 'banner', 2) || k(t[0], 'line', 2) || k(t[0], 'service', 2)) { out.push('(comando aceito, mas não simulado neste laboratório)'); return done(); }
      if (k(t[0], 'switchport', 2) || k(t[0], 'encapsulation', 3) || (k(t[0], 'ip', 2) && k(t[1], 'address', 2))) return fail(`${ERR_INVALID}\nDica: esse comando é de interface. Entre com "interface ..." primeiro.`);
      if (k(t[0], 'show', 2)) return fail(`${ERR_INVALID}\nDica: no modo de configuração use "do show ...".`);
      return fail(ERR_INVALID);
    }

    function cfgVlan() {
      const sw = dev;
      if (k(t[0], 'name', 2)) { if (!t[1]) return fail(ERR_INCOMPLETE); sw.vlans[s.ctx.vlan].name = t.slice(1).join('_'); return done(); }
      if (k(t[0], 'vlan', 2)) { s.mode = 'config'; return cfgGlobal(); }
      if (k(t[0], 'interface', 2)) { s.mode = 'config'; return cfgGlobal(); }
      { const prev = { mode: s.mode, ctx: s.ctx }; s.mode = 'config'; s.ctx = null; out.length = 0; const r = cfgGlobal(); if (!r.ok) { s.mode = prev.mode; s.ctx = prev.ctx; } return r; }
    }

    function cfgIf() {
      if (k(t[0], 'interface', 2)) { s.mode = 'config'; s.ctx = null; return cfgGlobal(); }
      // ---- roteador ----
      if (dev.type === 'router') {
        const f = dev.ifaces[s.ctx.iface];
        if (k(t[0], 'encapsulation', 3)) { if (s.mode !== 'subif') return fail('% Use encapsulation em uma subinterface (ex.: interface g0/0.10).'); if (!k(t[1], 'dot1q', 2)) return fail(ERR_INVALID); const v = +t[2]; if (!(v >= 1 && v <= 4094)) return fail(ERR_INCOMPLETE); f.encap = v; return done(); }
        if (k(t[0], 'ip', 2) && k(t[1], 'address', 2)) {
          if (s.mode === 'subif' && !f.encap) return fail('% Configuring IP routing on a LAN subinterface is only allowed if that subinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q, or ISL vLAN.');
          return setIp(f);
        }
        if (k(t[0], 'no', 2) && k(t[1], 'ip', 2) && k(t[2], 'address', 2)) { f.ip = f.mask = null; return done(); }
        if (k(t[0], 'shutdown', 4)) { f.shutdown = true; out.push(`%LINK-5-CHANGED: Interface ${longName(s.ctx.iface)}, changed state to administratively down`); return done(); }
        if (k(t[0], 'no', 2) && k(t[1], 'shutdown', 4)) { f.shutdown = false; out.push(`%LINK-5-CHANGED: Interface ${longName(s.ctx.iface)}, changed state to up`); return done(); }
        if (k(t[0], 'description', 3)) { f.desc = t.slice(1).join(' '); return done(); }
        if (k(t[0], 'bandwidth', 3)) { f.bw = +t[1]; return done(); }
        if (k(t[0], 'switchport', 2)) return fail(`${ERR_INVALID}\nDica: "switchport" é comando de switch; no roteador use subinterfaces com "encapsulation dot1Q".`);
      { const prev = { mode: s.mode, ctx: s.ctx }; s.mode = 'config'; s.ctx = null; out.length = 0; const r = cfgGlobal(); if (!r.ok) { s.mode = prev.mode; s.ctx = prev.ctx; } return r; }

      }
      // ---- switch: SVI ----
      if (s.ctx.svi) {
        const v = dev.svis[s.ctx.svi];
        if (k(t[0], 'ip', 2) && k(t[1], 'address', 2)) return setIp(v);
        if (k(t[0], 'no', 2) && k(t[1], 'ip', 2) && k(t[2], 'address', 2)) { v.ip = v.mask = null; return done(); }
        if (k(t[0], 'shutdown', 4)) { v.shutdown = true; return done(); }
        if (k(t[0], 'no', 2) && k(t[1], 'shutdown', 4)) { v.shutdown = false; out.push(`%LINK-5-CHANGED: Interface Vlan${s.ctx.svi}, changed state to up`); if (!vlanExists(dev, s.ctx.svi)) out.push(`(aviso: a VLAN ${s.ctx.svi} não existe no banco de VLANs — a SVI ficará down até ela ser criada)`); return done(); }
        if (k(t[0], 'description', 3)) return done();
      { const prev = { mode: s.mode, ctx: s.ctx }; s.mode = 'config'; s.ctx = null; out.length = 0; const r = cfgGlobal(); if (!r.ok) { s.mode = prev.mode; s.ctx = prev.ctx; } return r; }

      }
      // ---- switch: portas físicas ----
      const names = s.mode === 'range' ? s.ctx.ifaces : [s.ctx.iface];
      const ports = names.map(n => dev.ports[n]);
      const all = fn => { ports.forEach(fn); return done(); };
      if (k(t[0], 'switchport', 2)) {
        if (k(t[1], 'mode', 1)) {
          if (k(t[2], 'access', 1)) return all(p => { p.mode = 'access'; });
          if (k(t[2], 'trunk', 1)) return all(p => { p.mode = 'trunk'; });
          if (k(t[2], 'dynamic', 2)) { if (k(t[3], 'auto', 1)) return all(p => { p.mode = 'dynamic auto'; }); if (k(t[3], 'desirable', 1)) return all(p => { p.mode = 'dynamic desirable'; }); }
          return fail(ERR_INVALID);
        }
        if (k(t[1], 'access', 1) && k(t[2], 'vlan', 1)) {
          const v = +t[3]; if (!(v >= 1 && v <= 4094)) return fail(ERR_INCOMPLETE);
          if (!dev.vlans[v]) { dev.vlans[v] = { name: `VLAN${String(v).padStart(4, '0')}` }; out.push('% Access VLAN does not exist. Creating vlan ' + v); }
          return all(p => { p.access = v; });
        }
        if (k(t[1], 'trunk', 1)) {
          if (k(t[2], 'encapsulation', 1)) { if (!k(t[3], 'dot1q', 2)) return fail(ERR_INVALID); return all(p => { p.encapDot1q = true; }); }
          if (k(t[2], 'native', 1) && k(t[3], 'vlan', 1)) { const v = +t[4]; if (!(v >= 1 && v <= 4094)) return fail(ERR_INCOMPLETE); return all(p => { p.native = v; }); }
          if (k(t[2], 'allowed', 1) && k(t[3], 'vlan', 1)) {
            const op = t[4]; if (!op) return fail(ERR_INCOMPLETE);
            if (k(op, 'all', 2)) return all(p => { p.allowed = 'all'; });
            if (k(op, 'none', 2)) return all(p => { p.allowed = []; });
            if (k(op, 'add', 2) || k(op, 'remove', 2) || k(op, 'except', 2)) {
              const list = parseVlanList(t[5] || ''); if (!list) return fail(ERR_INVALID);
              return all(p => {
                const cur = p.allowed === 'all' ? null : new Set(p.allowed);
                if (k(op, 'add', 2)) { if (cur) { list.forEach(v => cur.add(v)); p.allowed = [...cur]; } }
                else if (k(op, 'remove', 2)) { const base = cur || new Set(Array.from({ length: 4094 }, (_, i) => i + 1)); list.forEach(v => base.delete(v)); p.allowed = base.size === 4094 ? 'all' : [...base]; }
                else { const base = new Set(Array.from({ length: 4094 }, (_, i) => i + 1)); list.forEach(v => base.delete(v)); p.allowed = [...base]; }
              });
            }
            const list = parseVlanList(op); if (!list) return fail('% Lista de VLANs inválida. Ex.: switchport trunk allowed vlan 10,20,99');
            return all(p => { p.allowed = list; });
          }
          return fail(ERR_INVALID);
        }
        if (k(t[1], 'nonegotiate', 2)) return all(p => { p.nonegotiate = true; });
        return fail(ERR_INVALID);
      }
      if (k(t[0], 'no', 2) && k(t[1], 'switchport', 2) && k(t[2], 'access', 1) && k(t[3], 'vlan', 1)) return all(p => { p.access = 1; });
      if (k(t[0], 'shutdown', 4)) { ports.forEach(p => { p.shutdown = true; }); names.forEach(n => out.push(`%LINK-5-CHANGED: Interface ${longName(n)}, changed state to administratively down`)); return done(); }
      if (k(t[0], 'no', 2) && k(t[1], 'shutdown', 4)) { ports.forEach(p => { p.shutdown = false; }); names.forEach(n => out.push(`%LINK-5-CHANGED: Interface ${longName(n)}, changed state to up`)); return done(); }
      if (k(t[0], 'spanning-tree', 2)) {
        if (k(t[1], 'portfast', 2)) { out.push('%Warning: portfast should only be enabled on ports connected to a single host.'); return all(p => { p.portfast = true; }); }
        if (k(t[1], 'bpduguard', 2) && k(t[2], 'enable', 1)) return all(p => { p.bpduguard = true; });
        if (k(t[1], 'cost', 2)) { const c = +t[2]; if (!(c >= 1)) return fail(ERR_INCOMPLETE); return all(p => { p.cost = c; }); }
        return fail(ERR_INVALID);
      }
      if (k(t[0], 'description', 3)) return all(p => { p.desc = t.slice(1).join(' '); });
      if (k(t[0], 'ip', 2) && k(t[1], 'address', 2)) return fail(`${ERR_INVALID}\nDica: em switch L2 o IP vai na SVI ("interface vlan 99"), não na porta física.`);
      if (k(t[0], 'encapsulation', 3)) return fail(`${ERR_INVALID}\nDica: "encapsulation dot1Q N" é do roteador (subinterface). No switch use "switchport mode trunk".`);
      { const prev = { mode: s.mode, ctx: s.ctx }; s.mode = 'config'; s.ctx = null; out.length = 0; const r = cfgGlobal(); if (!r.ok) { s.mode = prev.mode; s.ctx = prev.ctx; } return r; }

    }

    function setIp(f) {
      const ip = I(t[2] || ''), p = IPv4.prefixFromMask(t[3] || '');
      if (ip === null || p === null) return fail('% Sintaxe: ip address A.B.C.D MÁSCARA (ex.: ip address 192.168.10.1 255.255.255.0)');
      if (p < 31 && (IPv4.network(ip, p) === ip || IPv4.broadcast(ip, p) === ip)) return fail(`% Bad mask /${p} for address ${t[2]} (é endereço de rede ou broadcast)`);
      f.ip = t[2]; f.mask = t[3]; return done();
    }

    function cfgDhcp() {
      const pool = dev.dhcp.pools[s.ctx.pool];
      if (k(t[0], 'network', 3)) { if (I(t[1] || '') === null || IPv4.prefixFromMask(t[2] || '') === null) return fail('% Sintaxe: network REDE MÁSCARA'); pool.network = t[1]; pool.mask = t[2]; return done(); }
      if (k(t[0], 'default-router', 3)) { if (I(t[1] || '') === null) return fail(ERR_INCOMPLETE); pool.router = t[1]; return done(); }
      if (k(t[0], 'dns-server', 3)) { pool.dns = t[1]; return done(); }
      { const prev = { mode: s.mode, ctx: s.ctx }; s.mode = 'config'; s.ctx = null; out.length = 0; const r = cfgGlobal(); if (!r.ok) { s.mode = prev.mode; s.ctx = prev.ctx; } return r; }

    }
  }

  function help(mode, type) {
    const m = {
      user: ['enable', 'ping A.B.C.D', 'show ...'],
      priv: ['configure terminal', 'show vlan brief | interfaces trunk | mac address-table | spanning-tree | ip route | ip interface brief | running-config', 'copy running-config startup-config', 'write', 'ping A.B.C.D', 'disable', 'delete vlan.dat'],
      config: type === 'router' ? ['hostname NOME', 'interface g0/0 | interface g0/0.10', 'ip dhcp pool NOME', 'ip dhcp excluded-address A [B]', 'ip route REDE MÁSCARA PRÓXIMO-SALTO', 'end', 'exit', 'do show ...'] : ['hostname NOME', 'vlan N', 'no vlan N', 'interface fa0/1 | interface range fa0/1 - 5 | interface vlan N', 'ip routing (só switch L3)', 'spanning-tree vlan N priority P', 'spanning-tree mode rapid-pvst', 'end', 'exit', 'do show ...'],
      vlan: ['name NOME', 'exit', 'end'],
      if: type === 'router' ? ['ip address A M', 'no shutdown', 'shutdown', 'description TEXTO', 'exit', 'end'] : ['switchport mode access | trunk', 'switchport access vlan N', 'switchport trunk allowed vlan LISTA', 'switchport trunk native vlan N', 'switchport nonegotiate', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'ip address A M (só em interface vlan)', 'no shutdown', 'exit', 'end'],
      range: ['switchport mode access', 'switchport access vlan N', 'shutdown | no shutdown', 'exit'],
      subif: ['encapsulation dot1Q N', 'ip address A M', 'exit'],
      dhcp: ['network REDE MÁSCARA', 'default-router A', 'dns-server A', 'exit'],
    };
    return ['Comandos disponíveis neste simulador (subconjunto):', ...(m[mode] || []).map(x => '  ' + x)];
  }

  /* ======================= SHOW ======================= */
  function execShow(lab, devId, t) {
    const d = lab.devices[devId];
    if (!t.length) return null;
    if (k(t[0], 'vlan', 1) && d.type === 'switch') return showVlan(d);
    if (k(t[0], 'interfaces', 2) && k(t[1], 'trunk', 1) && d.type === 'switch') return showTrunk(lab, devId);
    if (k(t[0], 'mac', 1) && d.type === 'switch') return showMac(lab, devId);
    if (k(t[0], 'spanning-tree', 2) && d.type === 'switch') return showStp(lab, devId, t[1] && k(t[1], 'summary', 2));
    if (k(t[0], 'ip', 2) && k(t[1], 'route', 1)) return showRoute(lab, devId);
    if (k(t[0], 'ip', 2) && k(t[1], 'interface', 2)) return showIpIntBrief(lab, devId);
    if (k(t[0], 'ip', 2) && k(t[1], 'dhcp', 2)) return showDhcp(lab, devId);
    if (k(t[0], 'running-config', 3)) return showRun(d);
    if (k(t[0], 'startup-config', 3)) return d.saved ? ['(configuração salva — igual à running-config no momento em que foi salva)'] : ['startup-config is not present'];
    if (k(t[0], 'flash', 2)) return ['Directory of flash:/', '    1  -rw-     4414  <no date>  c2960-lanbasek9-mz.bin', d.type === 'switch' && Object.keys(d.vlans).length > 1 ? '    2  -rw-      736  <no date>  vlan.dat' : ''].filter(Boolean);
    if (k(t[0], 'history', 2)) return ['(histórico disponível com as setas ↑/↓)'];
    return null;
  }
  function showVlan(d) {
    const lines = ['VLAN Name                             Status    Ports', '---- -------------------------------- --------- -------------------------------'];
    const vids = Object.keys(d.vlans).map(Number).sort((a, b) => a - b);
    for (const v of vids) {
      const ports = Object.entries(d.ports).filter(([, p]) => p.mode !== 'trunk' && p.access === v).map(([n]) => n);
      const chunks = []; for (let i = 0; i < ports.length; i += 4) chunks.push(ports.slice(i, i + 4).join(', '));
      lines.push(`${String(v).padEnd(4)} ${d.vlans[v].name.padEnd(32).slice(0, 32)} active    ${chunks[0] || ''}`);
      for (const c of chunks.slice(1)) lines.push(`${''.padEnd(48)}${c}`);
    }
    lines.push('1002 fddi-default                     act/unsup', '1003 token-ring-default               act/unsup', '1004 fddinet-default                  act/unsup', '1005 trnet-default                    act/unsup');
    return lines;
  }
  function trunkUp(lab, devId, pname) {
    const d = lab.devices[devId], p = d.ports[pname];
    if (!p || p.shutdown) return false;
    const peer = peerOf(lab, devId, pname);
    if (!peer) return p.mode === 'trunk';
    const pd = lab.devices[peer.dev];
    if (pd.type === 'router') return p.mode === 'trunk' && !pd.ifaces[peer.port].shutdown;
    const pp = pd.ports[peer.port];
    if (pp.shutdown) return false;
    const m1 = p.mode, m2 = pp.mode;
    if (m1 === 'trunk' && m2 === 'trunk') return true;
    if (m1 === 'access' || m2 === 'access') return false;
    if ((m1 === 'trunk' && !p.nonegotiate && m2.startsWith('dynamic')) || (m2 === 'trunk' && !pp.nonegotiate && m1.startsWith('dynamic'))) return true;
    if (m1 === 'dynamic desirable' || m2 === 'dynamic desirable') return true; // DTP negocia
    return false; // auto + auto não forma trunk
  }
  function showTrunk(lab, devId) {
    const d = lab.devices[devId];
    const trunks = Object.keys(d.ports).filter(n => trunkUp(lab, devId, n));
    if (!trunks.length) return [''];
    const L = ['Port        Mode             Encapsulation  Status        Native vlan'];
    for (const n of trunks) { const p = d.ports[n]; L.push(`${n.padEnd(12)}${(p.mode === 'trunk' ? 'on' : p.mode.replace('dynamic ', '')).padEnd(17)}802.1q         trunking      ${p.native}`); }
    L.push('', 'Port        Vlans allowed on trunk');
    for (const n of trunks) L.push(`${n.padEnd(12)}${vlanListStr(d.ports[n].allowed)}`);
    L.push('', 'Port        Vlans allowed and active in management domain');
    for (const n of trunks) { const al = d.ports[n].allowed; const act = Object.keys(d.vlans).map(Number).filter(v => al === 'all' || al.includes(v)); L.push(`${n.padEnd(12)}${vlanListStr(act)}`); }
    return L;
  }
  function peerOf(lab, devId, port) {
    for (const l of lab.links) { if (l.a === devId && l.pa === port) return { dev: l.b, port: l.pb }; if (l.b === devId && l.pb === port) return { dev: l.a, port: l.pa }; }
    return null;
  }
  function showMac(lab, devId) {
    const L = ['          Mac Address Table', '-------------------------------------------', '', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----'];
    const learned = (lab.macSeen && lab.macSeen[devId]) || [];
    for (const e of learned) L.push(`${String(e.vlan).padEnd(8)}${e.mac.padEnd(18)}DYNAMIC     ${e.port}`);
    if (!learned.length) L.push('(vazia — o switch só aprende MACs de origem quando recebe quadros; faça um ping entre os PCs)');
    return L;
  }
  function stpForVlan(lab, vlan) {
    const sws = Object.entries(lab.devices).filter(([, d]) => d.type === 'switch').map(([id, d]) => ({ id, priority: (d.stp.priority[vlan] ?? 32768) + vlan, mac: d.mac }));
    const links = [];
    for (const l of lab.links) {
      const A = lab.devices[l.a], B = lab.devices[l.b];
      if (A.type !== 'switch' || B.type !== 'switch') continue;
      const carries = (id, pn) => { const p = lab.devices[id].ports[pn]; if (!trunkUp(lab, id, pn)) return !p.shutdown && p.mode !== 'trunk' && p.access === vlan; return p.allowed === 'all' || p.allowed.includes(vlan); };
      const up = carries(l.a, l.pa) && carries(l.b, l.pb);
      const num = n => +n.split('/').pop() + (n.startsWith('Gi') ? 24 : 0);
      const cost = A.ports[l.pa].cost || (l.pa.startsWith('Gi') && l.pb.startsWith('Gi') ? 4 : 19);
      links.push({ id: `${l.a}${l.pa}`, a: l.a, pa: { name: l.pa, num: num(l.pa) }, b: l.b, pb: { name: l.pb, num: num(l.pb) }, cost, up });
    }
    return { sws, links, r: STP.compute(sws, links) };
  }
  function showStp(lab, devId, summary) {
    const d = lab.devices[devId];
    const vlans = Object.keys(d.vlans).map(Number).filter(v => v < 1002);
    const L = [];
    if (summary) return [`Switch is in ${d.stp.mode} mode`, `Root bridge for: ${vlans.filter(v => stpForVlan(lab, v).r.rootOf[devId] === devId).map(v => 'VLAN' + String(v).padStart(4, '0')).join(', ') || 'none'}`];
    for (const v of vlans) {
      const { sws, r } = stpForVlan(lab, v);
      const rootId = r.rootOf[devId]; const root = sws.find(x => x.id === rootId); const me = sws.find(x => x.id === devId);
      L.push(`VLAN${String(v).padStart(4, '0')}`, `  Spanning tree enabled protocol ${d.stp.mode === 'rapid-pvst' ? 'rstp' : 'ieee'}`);
      L.push(`  Root ID    Priority    ${root.priority}`, `             Address     ${root.mac}`);
      if (rootId === devId) L.push('             This bridge is the root'); else L.push(`             Cost        ${r.cost[devId]}`, `             Port        ${r.rootPort[devId]}`);
      L.push('', `  Bridge ID  Priority    ${me.priority}  (priority ${me.priority - v} sys-id-ext ${v})`, `             Address     ${me.mac}`, '', 'Interface        Role Sts Cost      Prio.Nbr Type', '---------------- ---- --- --------- -------- ----');
      const rapid = d.stp.mode === 'rapid-pvst';
      for (const [pn, p] of Object.entries(d.ports)) {
        if (p.shutdown) continue;
        const key = `${devId}|${pn}`; const info = r.ports[key];
        const host = Object.values(lab.hosts || {}).find(h => h.sw === devId && h.port === pn);
        const tr = trunkUp(lab, devId, pn);
        if (info && info.role !== 'disabled') {
          const role = { root: 'Root', designated: 'Desg', blocked: rapid ? 'Altn' : 'Altn' }[info.role];
          const sts = info.role === 'blocked' ? (rapid ? 'BLK' : 'BLK') : 'FWD';
          L.push(`${pn.padEnd(17)}${role} ${sts} ${String(p.cost || 19).padEnd(10)}128.${(pn.split('/').pop()).padEnd(5)}P2p`);
        } else if (host && (tr || p.access === v)) L.push(`${pn.padEnd(17)}Desg FWD ${String(19).padEnd(10)}128.${(pn.split('/').pop()).padEnd(5)}P2p${p.portfast ? ' Edge' : ''}`);
        else if (peerOf(lab, devId, pn) && tr && (p.allowed === 'all' || p.allowed.includes(v))) L.push(`${pn.padEnd(17)}Desg FWD ${String(19).padEnd(10)}128.${(pn.split('/').pop()).padEnd(5)}P2p`);
      }
      L.push('');
      if (vlans.length > 3 && v !== vlans[0]) { L.push('(demais VLANs omitidas)'); break; }
    }
    return L;
  }
  function l3Ifaces(lab, devId) {
    const d = lab.devices[devId]; const out = [];
    if (d.type === 'router') {
      for (const [n, f] of Object.entries(d.ifaces)) {
        const parentDown = n.includes('.') ? d.ifaces[n.split('.')[0]].shutdown : false;
        const peer = peerOf(lab, devId, n.split('.')[0]);
        out.push({ name: n, ip: f.ip, mask: f.mask, admin: !f.shutdown && !parentDown, proto: !f.shutdown && !parentDown && !!peer, encap: f.encap });
      }
    } else for (const [v, f] of Object.entries(d.svis)) {
      const hasPort = Object.entries(d.ports).some(([pn, p]) => !p.shutdown && (trunkUp(lab, devId, pn) ? (p.allowed === 'all' || p.allowed.includes(+v)) : (p.access === +v && (peerOf(lab, devId, pn) || Object.values(lab.hosts || {}).some(h => h.sw === devId && h.port === pn)))));
      out.push({ name: `Vlan${v}`, ip: f.ip, mask: f.mask, admin: !f.shutdown, proto: !f.shutdown && !!d.vlans[v] && hasPort, svi: +v });
    }
    return out;
  }
  function showIpIntBrief(lab, devId) {
    const L = ['Interface              IP-Address      OK? Method Status                Protocol'];
    for (const f of l3Ifaces(lab, devId)) L.push(`${longName(f.name).padEnd(23)}${(f.ip || 'unassigned').padEnd(16)}YES ${f.ip ? 'manual' : 'unset '} ${(f.admin ? 'up' : 'administratively down').padEnd(22)}${f.proto ? 'up' : 'down'}`);
    const d = lab.devices[devId];
    if (d.type === 'switch') for (const [n, p] of Object.entries(d.ports)) { const up = !p.shutdown && (peerOf(lab, devId, n) || Object.values(lab.hosts || {}).some(h => h.sw === devId && h.port === n)); L.push(`${longName(n).padEnd(23)}${'unassigned'.padEnd(16)}YES unset  ${(p.shutdown ? 'administratively down' : up ? 'up' : 'down').padEnd(22)}${up ? 'up' : 'down'}`); }
    return L;
  }
  function routingTable(lab, devId) {
    const d = lab.devices[devId];
    const routes = [];
    if (d.type === 'switch' && !d.ipRouting) return null;
    for (const f of l3Ifaces(lab, devId)) if (f.ip && f.proto) { const p = IPv4.prefixFromMask(f.mask); routes.push({ code: 'C', net: IPv4.toStr(IPv4.network(I(f.ip), p)), prefix: p, via: f.name }); routes.push({ code: 'L', net: f.ip, prefix: 32, via: f.name }); }
    for (const r of d.routes || []) routes.push({ code: 'S', net: r.net, prefix: IPv4.prefixFromMask(r.mask), via: r.nh });
    return routes;
  }
  function showRoute(lab, devId) {
    const rt = routingTable(lab, devId);
    if (!rt) return ['Default gateway is not set', '', '(switch L2 sem "ip routing": não possui tabela de rotas IP)'];
    const L = ['Codes: L - local, C - connected, S - static', '', 'Gateway of last resort is not set', ''];
    for (const r of rt) L.push(`${r.code}    ${r.net}/${r.prefix} ${r.code === 'S' ? `[1/0] via ${r.via}` : `is directly connected, ${longName(r.via)}`}`);
    if (!rt.length) L.push('(nenhuma rota: configure IP e "no shutdown" nas interfaces)');
    return L;
  }
  function showDhcp(lab, devId) {
    const d = lab.devices[devId];
    if (d.type !== 'router') return null;
    const L = [];
    for (const [n, p] of Object.entries(d.dhcp.pools)) L.push(`Pool ${n} :`, `  Network ${p.network || '(não definida)'} ${p.mask || ''}`, `  Default router ${p.router || '(não definido)'}`);
    L.push('', 'IP address       Client-ID/Hardware address   Type');
    for (const h of Object.values(lab.hosts || {})) if (h.dhcp && h.ip) L.push(`${h.ip.padEnd(17)}${h.mac.padEnd(29)}Automatic`);
    return L;
  }
  function showRun(d) {
    const L = ['Building configuration...', '', `hostname ${d.hostname}`, '!'];
    if (d.secret) L.push('enable secret 5 $1$mERr$...', '!');
    if (d.noDomainLookup) L.push('no ip domain-lookup', '!');
    if (d.type === 'switch') {
      if (d.ipRouting) L.push('ip routing', '!');
      L.push(`spanning-tree mode ${d.stp.mode}`);
      for (const [v, p] of Object.entries(d.stp.priority)) L.push(`spanning-tree vlan ${v} priority ${p}`);
      L.push('!');
      for (const [v, x] of Object.entries(d.vlans)) if (+v !== 1) L.push(`vlan ${v}`, ` name ${x.name}`, '!');
      for (const [n, p] of Object.entries(d.ports)) {
        L.push(`interface ${longName(n)}`);
        if (p.desc) L.push(` description ${p.desc}`);
        if (p.mode === 'access') { L.push(' switchport mode access'); if (p.access !== 1) L.push(` switchport access vlan ${p.access}`); }
        else if (p.access !== 1) L.push(` switchport access vlan ${p.access}`);
        if (p.mode === 'trunk') { if (p.native !== 1) L.push(` switchport trunk native vlan ${p.native}`); if (p.allowed !== 'all') L.push(` switchport trunk allowed vlan ${vlanListStr(p.allowed)}`); L.push(' switchport mode trunk'); }
        if (p.mode === 'dynamic desirable') L.push(' switchport mode dynamic desirable');
        if (p.nonegotiate) L.push(' switchport nonegotiate');
        if (p.portfast) L.push(' spanning-tree portfast');
        if (p.bpduguard) L.push(' spanning-tree bpduguard enable');
        if (p.shutdown) L.push(' shutdown');
        L.push('!');
      }
      for (const [v, f] of Object.entries(d.svis)) { L.push(`interface Vlan${v}`, f.ip ? ` ip address ${f.ip} ${f.mask}` : ' no ip address'); if (f.shutdown) L.push(' shutdown'); L.push('!'); }
    } else {
      for (const [n, f] of Object.entries(d.ifaces)) { L.push(`interface ${longName(n)}`); if (f.encap) L.push(` encapsulation dot1Q ${f.encap}`); L.push(f.ip ? ` ip address ${f.ip} ${f.mask}` : ' no ip address'); if (f.shutdown) L.push(' shutdown'); L.push('!'); }
      for (const e of d.dhcp.excluded) L.push(`ip dhcp excluded-address ${e[0]}${e[1] !== e[0] ? ' ' + e[1] : ''}`);
      for (const [n, p] of Object.entries(d.dhcp.pools)) { L.push(`ip dhcp pool ${n}`); if (p.network) L.push(` network ${p.network} ${p.mask}`); if (p.router) L.push(` default-router ${p.router}`); if (p.dns) L.push(` dns-server ${p.dns}`); L.push('!'); }
      for (const r of d.routes) L.push(`ip route ${r.net} ${r.mask} ${r.nh}`);
    }
    L.push('end');
    return L;
  }

  /* ======================= CONECTIVIDADE ======================= */
  /** Segmentos L2: chave "sw|vlan". Retorna union-find de segmentos conectados via trunks/access. */
  function l2Components(lab) {
    const parent = {};
    const find = x => { parent[x] = parent[x] ?? x; return parent[x] === x ? x : (parent[x] = find(parent[x])); };
    const union = (a, b) => { parent[find(a)] = find(b); };
    const notes = [];
    for (const l of lab.links) {
      const A = lab.devices[l.a], B = lab.devices[l.b];
      if (A.type !== 'switch' || B.type !== 'switch') continue;
      const pa = A.ports[l.pa], pb = B.ports[l.pb];
      if (pa.shutdown || pb.shutdown) continue;
      if (trunkUp(lab, l.a, l.pa)) {
        if (pa.native !== pb.native) notes.push(`Native VLAN mismatch entre ${l.a} ${l.pa} (${pa.native}) e ${l.b} ${l.pb} (${pb.native}).`);
        const all = new Set([...Object.keys(A.vlans), ...Object.keys(B.vlans)].map(Number));
        for (const v of all) {
          const okA = pa.allowed === 'all' || pa.allowed.includes(v), okB = pb.allowed === 'all' || pb.allowed.includes(v);
          if (okA && okB && A.vlans[v] && B.vlans[v]) union(`${l.a}|${v}`, `${l.b}|${v}`);
        }
      } else if (pa.mode !== 'trunk' && pb.mode !== 'trunk' && A.vlans[pa.access] && B.vlans[pb.access]) union(`${l.a}|${pa.access}`, `${l.b}|${pb.access}`);
    }
    return { find, notes };
  }
  /** Interfaces L3 de cada dispositivo com o segmento L2 em que estão. */
  function l3Attachments(lab) {
    const att = [];
    for (const [id, d] of Object.entries(lab.devices)) {
      if (d.type === 'router') {
        for (const [n, f] of Object.entries(d.ifaces)) {
          if (!f.ip) continue;
          const phys = n.split('.')[0];
          if (f.shutdown || d.ifaces[phys].shutdown) continue;
          const peer = peerOf(lab, id, phys); if (!peer) continue;
          const sw = lab.devices[peer.dev]; if (sw.type !== 'switch') continue;
          const sp = sw.ports[peer.port]; if (sp.shutdown) continue;
          let vlan = null;
          if (f.encap) { if (sp.mode === 'trunk' && (sp.allowed === 'all' || sp.allowed.includes(f.encap)) && sw.vlans[f.encap]) vlan = f.encap; }
          else if (sp.mode !== 'trunk') vlan = sp.access;
          else vlan = sp.native; // interface física sem tag em trunk → VLAN nativa
          if (vlan && sw.vlans[vlan]) att.push({ dev: id, iface: n, ip: f.ip, mask: f.mask, seg: `${peer.dev}|${vlan}`, router: true });
        }
      } else {
        for (const [v, f] of Object.entries(d.svis)) if (f.ip && !f.shutdown && d.vlans[v]) att.push({ dev: id, iface: `Vlan${v}`, ip: f.ip, mask: f.mask, seg: `${id}|${v}`, router: d.l3 && d.ipRouting });
      }
    }
    return att;
  }
  function hostSeg(lab, h) {
    const sw = lab.devices[h.sw]; const p = sw.ports[h.port];
    if (p.shutdown) return { seg: null, why: `a porta ${h.port} de ${h.sw} está em shutdown` };
    if (p.mode === 'trunk') return { seg: null, why: `a porta ${h.port} de ${h.sw} (ligada a um PC) está em modo trunk; portas de PC devem ser access` };
    if (!sw.vlans[p.access]) return { seg: null, why: `a VLAN ${p.access} não existe em ${h.sw}` };
    return { seg: `${h.sw}|${p.access}`, vlan: p.access };
  }
  /** Simula DHCP: host com dhcp=true recebe IP do pool que casa com a sub-rede do gateway do seu segmento. */
  function applyDhcp(lab) {
    const L = clone(lab); const { find } = l2Components(L); const att = l3Attachments(L);
    const used = new Set(Object.values(L.hosts).filter(h => !h.dhcp && h.ip).map(h => h.ip));
    for (const h of Object.values(L.hosts)) {
      if (!h.dhcp) continue;
      h.ip = h.mask = h.gw = null;
      const hs = hostSeg(L, h); if (!hs.seg) continue;
      for (const a of att.filter(x => x.router && find(x.seg) === find(hs.seg))) {
        const r = L.devices[a.dev]; if (!r.dhcp) continue;
        const ap = IPv4.prefixFromMask(a.mask);
        for (const p of Object.values(r.dhcp.pools)) {
          if (!p.network || IPv4.network(I(p.network), ap) !== IPv4.network(I(a.ip), ap)) continue;
          const pp = IPv4.prefixFromMask(p.mask); const net = IPv4.network(I(p.network), pp);
          const excl = r.dhcp.excluded.map(([x, y]) => [I(x), I(y)]);
          for (let ip = net + 1; ip < IPv4.broadcast(net, pp); ip++) {
            const s = IPv4.toStr(ip);
            if (used.has(s) || s === a.ip || excl.some(([x, y]) => ip >= x && ip <= y)) continue;
            h.ip = s; h.mask = p.mask; h.gw = p.router; used.add(s); break;
          }
          if (h.ip) break;
        }
        if (h.ip) break;
      }
    }
    return L;
  }
  const sameNet = (ip1, ip2, mask) => { const p = IPv4.prefixFromMask(mask); return p !== null && IPv4.network(I(ip1), p) === IPv4.network(I(ip2), p); };

  /** Testa ping entre hosts; retorna {ok, steps:[...], reason, lab (com MACs aprendidos)} */
  function ping(labIn, srcId, dstId) {
    const lab = applyDhcp(labIn);
    const S = lab.hosts[srcId], D = lab.hosts[dstId];
    const steps = [];
    const res = (ok, reason) => ({ ok, reason, steps, lab });
    if (!S.ip || !S.mask) return res(false, `${srcId} não tem endereço IP${S.dhcp ? ' (DHCP não entregou endereço — confira o pool e o gateway do roteador)' : ''}.`);
    if (!D.ip || !D.mask) return res(false, `${dstId} não tem endereço IP${D.dhcp ? ' (DHCP não entregou endereço)' : ''}.`);
    const { find, notes } = l2Components(lab);
    const sa = hostSeg(lab, S), da = hostSeg(lab, D);
    if (!sa.seg) return res(false, `${srcId}: ${sa.why}.`);
    if (!da.seg) return res(false, `${dstId}: ${da.why}.`);
    const learn = (seg, mac, port) => { const [sw, vlan] = seg.split('|'); lab.macSeen = lab.macSeen || {}; const arr = (lab.macSeen[sw] = lab.macSeen[sw] || []); if (!arr.some(e => e.mac === mac && +e.vlan === +vlan)) arr.push({ vlan: +vlan, mac, port }); };
    learn(sa.seg, S.mac, S.port);
    if (sameNet(S.ip, D.ip, S.mask)) {
      steps.push(`${S.ip} e ${D.ip} estão na mesma sub-rede: ${srcId} usa ARP para descobrir o MAC de ${dstId} diretamente.`);
      if (find(sa.seg) !== find(da.seg)) return res(false, `Mesma sub-rede IP, mas sem caminho de camada 2 entre ${S.sw} (VLAN ${sa.vlan}) e ${D.sw} (VLAN ${da.vlan}). Verifique se a VLAN existe nos dois switches e se o trunk está ativo e permite essa VLAN.${notes.length ? ' ' + notes.join(' ') : ''}`);
      learn(da.seg, D.mac, D.port);
      for (const l of lab.links) { /* aprendizado no caminho entre switches */ const A = lab.devices[l.a], B = lab.devices[l.b]; if (A.type === 'switch' && B.type === 'switch' && trunkUp(lab, l.a, l.pa)) { learn(`${l.a}|${sa.vlan}`, D.mac, l.pa); learn(`${l.b}|${sa.vlan}`, S.mac, l.pb); } }
      steps.push(`Quadro entregue em camada 2 dentro da VLAN ${sa.vlan}.`);
      return res(true, 'Ping OK (mesma VLAN/sub-rede).');
    }
    steps.push(`${D.ip} está em outra sub-rede: ${srcId} envia ao gateway ${S.gw || '(nenhum)'}.`);
    if (!S.gw) return res(false, `${srcId} não tem gateway padrão configurado.`);
    if (!sameNet(S.ip, S.gw, S.mask)) return res(false, `O gateway ${S.gw} de ${srcId} não está na sub-rede do próprio host.`);
    const att = l3Attachments(lab);
    const gw = att.find(a => a.ip === S.gw && find(a.seg) === find(sa.seg));
    if (!gw) {
      const any = att.find(a => a.ip === S.gw);
      return res(false, any ? `O gateway ${S.gw} existe em ${any.dev} ${any.iface}, mas não está no mesmo domínio L2 (VLAN ${sa.vlan}) de ${srcId}. Confira o trunk até o roteador e a VLAN da subinterface.` : `Nenhuma interface L3 ativa responde por ${S.gw}. Configure a subinterface/SVI com esse IP e ative-a (no shutdown).`);
    }
    if (!gw.router) return res(false, `${gw.dev} tem a interface ${gw.iface} com ${S.gw}, mas não está roteando ("ip routing" desabilitado ou switch L2).`);
    steps.push(`ARP: ${srcId} descobre o MAC do gateway ${S.gw} (${gw.dev} ${gw.iface}).`);
    steps.push(`O quadro sai do PC sem tag; o switch o marca com a VLAN ${sa.vlan} ao enviá-lo pelo trunk.`);
    const out = att.find(a => a.dev === gw.dev && sameNet(a.ip, D.ip, a.mask) && find(a.seg) === find(da.seg));
    if (!out) return res(false, `${gw.dev} não tem interface ativa na sub-rede de ${D.ip} alcançando a VLAN ${da.vlan}.`);
    steps.push(`${gw.dev} remove o cabeçalho Ethernet, consulta a tabela de rotas (rede conectada em ${out.iface}) e cria um NOVO quadro: MAC de origem = ${out.iface}, destino = MAC de ${dstId}${out.iface.includes('.') ? `, com tag VLAN ${da.vlan}` : ''}.`);
    if (!D.gw || !sameNet(D.ip, D.gw, D.mask) || !att.find(a => a.ip === D.gw && find(a.seg) === find(da.seg) && a.router)) return res(false, `O pacote chega a ${dstId}, mas a resposta não volta: o gateway de ${dstId} (${D.gw || 'nenhum'}) está ausente ou incorreto.`);
    learn(da.seg, D.mac, D.port);
    steps.push(`${dstId} responde ao seu gateway ${D.gw}; o caminho de volta é simétrico.`);
    return res(true, `Ping OK via roteamento Inter-VLAN em ${gw.dev}.`);
  }
  function pingFromDevice(lab, devId, ip) {
    if (I(ip || '') === null) return ['% Unrecognized host or address.'];
    const dst = Object.entries(lab.hosts || {}).find(([, h]) => applyDhcp(lab).hosts[h.id]?.ip === ip);
    const own = l3Ifaces(lab, devId).filter(f => f.ip && f.proto);
    const reach = own.some(f => sameNet(f.ip, ip, f.mask)) && (dst || Object.values(lab.devices).some(d => (d.type === 'switch' ? Object.values(d.svis) : Object.values(d.ifaces)).some(x => x.ip === ip)));
    return ['Type escape sequence to abort.', `Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`, reach ? '.!!!!' : '.....', reach ? 'Success rate is 80 percent (4/5)' : 'Success rate is 0 percent (0/5)', ...(reach ? [] : ['(sem interface ativa na mesma sub-rede deste equipamento ou destino inexistente)'])];
  }

  return { normIface, parseVlanList, vlanListStr, makeSwitch, makeRouter, faRange, newSession, prompt, exec, execShow, ping, applyDhcp, trunkUp, l3Attachments, l2Components, stpForVlan, routingTable, showRun };
})();
