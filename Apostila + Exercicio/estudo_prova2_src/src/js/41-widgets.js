/* ==========================================================================
   Widgets interativos e simuladores (SVG nativo)
   ========================================================================== */
const Widgets = {};

/* ---- Bits: IP + prefixo → rede/host coloridos, AND, rede/broadcast ---- */
Widgets.bits = () => {
  let ip = IPv4.toInt('192.168.10.34'), p = 24;
  const ipIn = h('input', { class: 'input', value: '192.168.10.34', 'aria-label': 'Endereço IPv4', oninput: e => { const v = IPv4.toInt(e.target.value); if (v !== null) { ip = v; e.target.classList.remove('bad'); draw(); } else e.target.classList.add('bad'); } });
  const pIn = h('input', { type: 'range', min: '8', max: '30', value: '24', 'aria-label': 'Prefixo', oninput: e => { p = +e.target.value; draw(); } });
  const pLbl = h('strong', {});
  const out = h('div', { class: 'stack' });
  function bitsRow(n, label) {
    const row = h('div', { class: 'bits', 'aria-label': label });
    const b = IPv4.toBin(n).split('.');
    b.forEach((oct, o) => row.append(h('div', { class: 'octet' }, [...oct].map((bit, k) => h('span', { class: `bit ${o * 8 + k < p ? 'net' : 'host'}` }, bit)))));
    return row;
  }
  function draw() {
    pLbl.textContent = `/${p} = ${IPv4.maskStr(p)}`;
    const i = IPv4.info(ip, p);
    out.innerHTML = '';
    out.append(
      h('div', { class: 'small muted' }, 'IP'), bitsRow(ip, 'bits do IP'),
      h('div', { class: 'small muted' }, 'Máscara'), bitsRow(IPv4.maskInt(p), 'bits da máscara'),
      h('div', { class: 'small muted' }, 'IP AND máscara = rede'), bitsRow(i.network, 'bits da rede'),
      h('div', { class: 'row small' }, h('span', { class: 'badge primary' }, `${p} bits de rede`), h('span', { class: 'badge comp' }, `${32 - p} bits de host`)),
      h('div', { class: 'grid cols-4' }, ...[['Rede', IPv4.toStr(i.network)], ['Primeiro host', IPv4.toStr(i.first)], ['Último host', IPv4.toStr(i.last)], ['Broadcast', IPv4.toStr(i.broadcast)], ['Hosts', i.usable.toLocaleString('pt-BR')], ['Classe histórica', IPv4.classOf(ip >>> 24).cls], ['Privado?', IPv4.isPrivate(ip) ? 'sim' : 'não']].map(([l, v]) => h('div', { class: 'stat' }, h('span', { class: 'l' }, l), h('span', { class: 'mono' }, v)))));
  }
  draw();
  return h('div', { class: 'card stack' }, h('div', { class: 'card-kicker' }, 'Laboratório de bits'), h('div', { class: 'grid cols-2' }, h('div', { class: 'field' }, h('label', {}, 'Endereço IPv4'), ipIn), h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Prefixo: ', pLbl), pIn)), out, h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Rosa = bits de rede · âmbar = bits de host. Mova o prefixo e veja o bloco mudar.'));
};

/* ---- Barra de sub-redes de um /24 ---- */
const VLAN_COLORS = ['#F2C7B1', '#F6DFA9', '#CFE0B1', '#B8D3E4', '#D9C7E4', '#F0C9CF'];
Widgets.subnetBar = () => {
  let p = 26, oct = 100;
  const pIn = h('input', { type: 'range', min: '25', max: '30', value: '26', 'aria-label': 'Prefixo', oninput: e => { p = +e.target.value; draw(); } });
  const oIn = h('input', { class: 'input', type: 'number', min: '0', max: '255', value: '100', 'aria-label': 'Último octeto', oninput: e => { const v = +e.target.value; if (v >= 0 && v <= 255) { oct = v; draw(); } } });
  const bar = h('div', { class: 'blocks', 'aria-hidden': 'true' }); const info = h('div', { class: 'small' }); const lbl = h('strong');
  function draw() {
    const size = 2 ** (32 - p), n = 256 / size;
    lbl.textContent = `/${p} → ${n} blocos de ${size} (salto ${size})`;
    bar.innerHTML = '';
    for (let k = 0; k < n; k++) {
      const start = k * size, inside = oct >= start && oct < start + size;
      bar.append(h('div', { style: { flex: '1', background: inside ? 'var(--primary)' : VLAN_COLORS[k % VLAN_COLORS.length], color: inside ? '#fff' : '#2E2118' }, title: `.${start}–.${start + size - 1}` }, n <= 16 ? `.${start}` : ''));
    }
    const start = Math.floor(oct / size) * size;
    info.innerHTML = `IP <code>192.168.1.${oct}</code> → rede <strong>192.168.1.${start}</strong>, hosts .${start + 1}–.${start + size - 2}, broadcast <strong>192.168.1.${start + size - 1}</strong> (${size - 2} hosts).`;
  }
  draw();
  return h('div', { class: 'card stack' }, h('div', { class: 'card-kicker' }, 'Visualizador de blocos (192.168.1.0/24)'), h('div', { class: 'grid cols-2' }, h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Prefixo: ', lbl), pIn), h('div', { class: 'field' }, h('label', {}, 'Último octeto do IP'), oIn)), bar, info);
};

/* ---- mini bits (Saiba mais potências de 2) ---- */
Widgets.bitsMini = () => {
  let p = 26;
  const out = h('div', { class: 'stack' });
  const r = h('input', { type: 'range', min: '24', max: '30', value: '26', 'aria-label': 'Prefixo', oninput: e => { p = +e.target.value; draw(); } });
  function draw() {
    const hb = 32 - p; out.innerHTML = '';
    out.append(h('div', { class: 'bits' }, h('div', { class: 'octet' }, [...Array(8)].map((_, k) => h('span', { class: `bit ${24 + k < p ? 'net' : 'host'}` }, 24 + k < p ? '1' : 'x')))),
      h('p', { style: { margin: 0 }, html: `/${p}: ${hb} bits livres (x) → ${Array(hb).fill('2').join(' × ')} = <strong>${2 ** hb}</strong> endereços por bloco; blocos começam em múltiplos de ${2 ** hb}.` }));
  }
  draw();
  return h('div', { class: 'card tight stack' }, h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Prefixo no 4º octeto'), r), out);
};

/* ---- VLSM: ordem boa × ruim ---- */
Widgets.vlsmCompare = () => {
  const demands = [{ name: 'P2P', hosts: 2 }, { name: 'X', hosts: 100 }, { name: 'Y', hosts: 60 }];
  const base = IPv4.toInt('192.168.1.0');
  function naive() { // aloca na ordem dada, cada um na próxima fronteira
    let cursor = base; const out = [];
    for (const d of demands) { const p = IPv4.minPrefixForHosts(d.hosts), size = 2 ** (32 - p); const a = Math.ceil((cursor - base) / size) * size + base; if (a + size - 1 > base + 255) { out.push({ ...d, fail: true, p }); continue; } out.push({ ...d, net: a, size, p }); cursor = a + size; }
    return out;
  }
  const good = VLSM.allocate(base, 24, demands).allocations.map(a => ({ name: a.name, net: a.net, size: a.size, p: a.prefix }));
  const bar = list => { const b = h('div', { class: 'blocks' }); let cur = base; const items = list.filter(x => !x.fail).sort((a, c) => a.net - c.net); for (const a of items) { if (a.net > cur) b.append(h('div', { style: { flex: String(a.net - cur), background: 'var(--surface-3)' } }, 'livre')); b.append(h('div', { style: { flex: String(a.size), background: VLAN_COLORS[demands.findIndex(d => d.name === a.name)] } }, `${a.name} /${a.p}`)); cur = a.net + a.size; } if (cur < base + 256) b.append(h('div', { style: { flex: String(base + 256 - cur), background: 'var(--surface-3)' } }, 'livre')); return b; };
  const n = naive();
  return h('div', { class: 'card tight stack' }, h('div', { class: 'small' }, 'Demandas em 192.168.1.0/24: P2P = 2 hosts (/30), X = 100 hosts (/25), Y = 60 hosts (/26). Total necessário: 4 + 128 + 64 = 196 de 256 — cabe.'),
    h('div', { class: 'small' }, h('strong', {}, 'Na ordem do enunciado (P2P primeiro):')), bar(n), h('div', { class: 'note bad small', style: { margin: 0 } }, n.some(x => x.fail) ? `${n.filter(x => x.fail).map(x => x.name).join(', ')} não coube: o /30 em .0 impediu o /25 de começar em .0; o /25 foi para .128 e não sobrou fronteira /26 livre depois dele (.4–.127 ficou fragmentado).` : 'Coube.'),
    h('div', { class: 'small' }, h('strong', {}, 'Maior → menor:')), bar(good), h('div', { class: 'note ok small', style: { margin: 0 } }, 'X em .0/25, Y em .128/26, P2P em .192/30 — tudo cabe e o espaço livre (.196–.255) fica contínuo para demandas futuras.'));
};

/* ---- IPv6 ---- */
Widgets.ipv6 = () => {
  const inp = h('input', { class: 'input', value: '2001:0db8:0000:0000:0000:ff00:0042:8329', 'aria-label': 'Endereço IPv6', oninput: draw });
  const out = h('div', { class: 'stack' });
  function draw() {
    out.innerHTML = '';
    const g = IPv6.parse(inp.value);
    if (!g) { out.append(h('div', { class: 'note bad' }, 'Endereço inválido. Lembre: no máximo um "::", grupos de até 4 dígitos hexadecimais, 8 grupos no total.')); return; }
    const type = IPv6.classify(inp.value);
    out.append(h('div', { class: 'grid cols-2' }, h('div', { class: 'stat' }, h('span', { class: 'l' }, 'Forma completa'), h('span', { class: 'mono small' }, IPv6.expand(inp.value))), h('div', { class: 'stat' }, h('span', { class: 'l' }, 'Forma canônica (mais curta)'), h('span', { class: 'mono' }, IPv6.compress(inp.value)))),
      h('div', { class: 'row' }, h('span', { class: 'badge primary' }, type.name), type.cidr ? h('span', { class: 'badge' }, type.cidr) : null),
      h('div', { class: 'bits' }, g.map((x, i) => h('span', { class: `bit ${i < 4 ? 'net' : 'host'}`, style: { width: 'auto', padding: '0 6px' }, title: x.toString(2).padStart(16, '0') }, x.toString(16).padStart(4, '0')))),
      h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Rosa = 64 bits de prefixo (rede, num /64) · âmbar = 64 bits de identificador de interface.'),
      h('ol', { class: 'steps small' }, IPv6.explainCompress(inp.value).map(s => h('li', {}, s))));
  }
  draw();
  return h('div', { class: 'card stack' }, h('div', { class: 'card-kicker' }, 'Laboratório IPv6'), h('div', { class: 'field' }, h('label', {}, 'Digite qualquer endereço IPv6'), inp), out);
};

/* ---- Simulador de aprendizado MAC ---- */
Widgets.macSim = () => {
  const pcs = [{ id: 'A', mac: 'AA:AA:AA:00:00:01', port: 'Fa0/1', x: 90, y: 60 }, { id: 'B', mac: 'BB:BB:BB:00:00:02', port: 'Fa0/2', x: 90, y: 200 }, { id: 'C', mac: 'CC:CC:CC:00:00:03', port: 'Fa0/3', x: 510, y: 60 }, { id: 'D', mac: 'DD:DD:DD:00:00:04', port: 'Fa0/4', x: 510, y: 200 }];
  const SW = { x: 300, y: 130 };
  const script = [['A', 'B'], ['B', 'A'], ['C', '*'], ['A', 'B'], ['D', 'C'], ['C', 'D']];
  // pré-computa estados
  function simulate(seq) {
    const table = []; const frames = [];
    for (const [s, d] of seq) {
      const S = pcs.find(p => p.id === s);
      const learnedNew = !table.some(e => e.mac === S.mac);
      if (learnedNew) table.push({ mac: S.mac, port: S.port, pc: S.id });
      let action, outs;
      if (d === '*') { action = 'broadcast'; outs = pcs.filter(p => p.id !== s).map(p => p.id); }
      else { const e = table.find(x => x.pc === d); if (e) { action = 'forward'; outs = [d]; } else { action = 'flood'; outs = pcs.filter(p => p.id !== s).map(p => p.id); } }
      frames.push({ s, d, action, outs, learnedNew, table: table.map(x => ({ ...x })) });
    }
    return frames;
  }
  let seq = [...script];
  const host = h('div');
  const srcSel = h('select', { class: 'input', 'aria-label': 'Origem' }, pcs.map(p => h('option', { value: p.id }, `Origem ${p.id}`)));
  const dstSel = h('select', { class: 'input', 'aria-label': 'Destino' }, [...pcs.map(p => h('option', { value: p.id }, `Destino ${p.id}`)), h('option', { value: '*' }, 'Broadcast FF:FF…')]);
  const extra = h('div', { class: 'row' }, srcSel, dstSel, h('button', { class: 'btn sm primary', onclick: () => { if (srcSel.value === dstSel.value) { toast('Origem e destino iguais.'); return; } seq.push([srcSel.value, dstSel.value]); build(seq.length - 1); } }, 'Enviar quadro'), h('button', { class: 'btn sm ghost', onclick: () => { seq = [...script]; build(0); } }, 'Limpar tabela'));
  function build(start = 0) {
    const frames = simulate(seq);
    const steps = frames.map((f, k) => ({ title: `${f.s} → ${f.d === '*' ? 'broadcast' : f.d}`, text: `<p>Quadro de <strong>${f.s}</strong> (${pcs.find(p => p.id === f.s).mac}) para <strong>${f.d === '*' ? 'FF:FF:FF:FF:FF:FF' : pcs.find(p => p.id === f.d).mac}</strong>.</p><p>1) ${f.learnedNew ? `O switch <strong>aprende</strong> o MAC de origem de ${f.s} na porta ${pcs.find(p => p.id === f.s).port}.` : `O MAC de ${f.s} já estava na tabela (o tempo de vida é renovado).`} 2) ${f.action === 'forward' ? `Destino conhecido → <strong>encaminha só</strong> pela porta ${pcs.find(p => p.id === f.d).port}.` : f.action === 'flood' ? '<strong>Destino desconhecido → flooding</strong> para todas as portas, menos a de entrada.' : '<strong>Broadcast → enviado a todas</strong> as portas, menos a de entrada.'}</p>`, f }));
    const p = Player({ steps, render: (i, s) => draw(s.f), extra });
    host.innerHTML = ''; host.append(p);
    if (start) { const b = $$('.sim-steps button', p)[start]; if (b) b.click(); }
  }
  function draw(f) {
    const links = pcs.map(p => { const active = p.id === f.s || f.outs.includes(p.id); return `<line x1="${p.x}" y1="${p.y}" x2="${SW.x}" y2="${SW.y}" class="link ${active ? 'active' : ''}"/>`; }).join('');
    const nodes = pcs.map(p => nodeBox(p.x, p.y, `PC ${p.id}`, p.port, 'pc', p.id === f.s ? 'src' : '')).join('');
    const arrows = f.outs.map(o => { const p = pcs.find(x => x.id === o); return `<circle cx="${(p.x + SW.x) / 2}" cy="${(p.y + SW.y) / 2}" r="7" fill="var(--primary)"/>`; }).join('');
    const S = pcs.find(p => p.id === f.s);
    const src = `<circle cx="${(S.x + SW.x) / 2}" cy="${(S.y + SW.y) / 2}" r="7" fill="var(--accent)"/>`;
    const rows = f.table.map((e, k) => `<text x="610" y="${92 + k * 18}" class="lbl" font-family="var(--mono)">${e.mac.slice(0, 8)}… ${e.port}</text>`).join('');
    return svg(820, 260, `${links}${nodes}${nodeBox(SW.x, SW.y, 'Switch', '', 'sw')}${src}${arrows}<rect x="600" y="50" width="210" height="${Math.max(60, 40 + f.table.length * 18)}" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/><text x="612" y="72" font-weight="700" font-size="13">Tabela MAC</text>${rows || '<text x="612" y="94" class="lbl-s">(vazia)</text>'}<text x="20" y="250" class="lbl-s">● âmbar = quadro entrando · ● terracota = saídas</text>`, `Switch com 4 PCs; quadro de ${f.s}`);
  }
  build(0);
  return h('div', { class: 'stack' }, h('div', { class: 'card-kicker' }, 'Simulador: aprendizado MAC'), host);
};

/* ---- Simulador STP editável ---- */
Widgets.stpSim = () => {
  const P = (name, num) => ({ name, num });
  const state = {
    four: false,
    sws: [{ id: 'S1', priority: 32768, mac: '0001.aaaa.0003' }, { id: 'S2', priority: 32768, mac: '0001.aaaa.0001' }, { id: 'S3', priority: 32768, mac: '0001.aaaa.0002' }, { id: 'S4', priority: 32768, mac: '0001.aaaa.0004' }],
    links: [{ id: 'L12', a: 'S1', pa: P('Fa0/1', 1), b: 'S2', pb: P('Fa0/1', 1), cost: 19, up: true }, { id: 'L13', a: 'S1', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/1', 1), cost: 19, up: true }, { id: 'L23', a: 'S2', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/2', 2), cost: 19, up: true }, { id: 'L34', a: 'S3', pa: P('Fa0/3', 3), b: 'S4', pb: P('Fa0/1', 1), cost: 19, up: true }, { id: 'L24', a: 'S2', pa: P('Fa0/3', 3), b: 'S4', pb: P('Fa0/2', 2), cost: 19, up: true }],
  };
  const pos = { S1: [140, 70], S2: [460, 70], S3: [300, 230], S4: [600, 230] };
  const host = h('div'); const editor = h('div', { class: 'grid cols-2' });
  const active = () => ({ sws: state.sws.filter(s => state.four || s.id !== 'S4'), links: state.links.filter(l => state.four || (l.a !== 'S4' && l.b !== 'S4')) });
  function drawTopo(r, stage) {
    const { sws, links } = active();
    let inner = '';
    for (const l of links) {
      const [x1, y1] = pos[l.a], [x2, y2] = pos[l.b];
      const pa = r.ports[`${l.a}|${l.pa.name}`], pb = r.ports[`${l.b}|${l.pb.name}`];
      const blocked = (pa && pa.role === 'blocked') || (pb && pb.role === 'blocked');
      const cls = !l.up ? 'down' : stage >= 3 && blocked ? 'blocked' : stage >= 3 ? 'active' : '';
      inner += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="link ${cls}"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle" class="lbl-s">custo ${l.cost}${l.up ? '' : ' (caído)'}</text>`;
      for (const [sw, pn, info, fx, fy, tx, ty] of [[l.a, l.pa.name, pa, x1, y1, x2, y2], [l.b, l.pb.name, pb, x2, y2, x1, y1]]) {
        const px = fx + (tx - fx) * 0.22, py = fy + (ty - fy) * 0.22;
        const role = info ? info.role : 'disabled';
        const show = (stage >= 1 && role === 'root') || (stage >= 2 && role === 'designated') || (stage >= 3 && role === 'blocked');
        const cls = !show ? '' : role === 'root' ? 'rp' : role === 'designated' ? 'dp' : 'bl';
        const tag = !show ? '' : role === 'root' ? 'RP' : role === 'designated' ? 'DP' : 'BLK';
        inner += `<circle cx="${px}" cy="${py}" r="8" class="port ${cls}"/><text x="${px}" y="${py + 22}" text-anchor="middle" class="lbl-s">${pn}${tag ? ' · ' + tag : ''}</text>`;
      }
    }
    for (const s of sws) { const [x, y] = pos[s.id]; const isRoot = r.rootOf[s.id] === s.id; inner += nodeBox(x, y, s.id + (isRoot && stage >= 0 ? ' ★' : ''), `${s.priority} · …${s.mac.slice(-4)}`, 'sw'); if (isRoot) inner += `<text x="${x}" y="${y - 32}" text-anchor="middle" font-weight="700" fill="var(--primary-strong)" font-size="12">Root Bridge</text>`; }
    inner += '<text x="10" y="315" class="lbl-s">RP = Root Port (verde) · DP = Designated (azul) · BLK = bloqueada (vermelho tracejado)</text>';
    return svg(720, 325, inner, 'Topologia STP');
  }
  function build() {
    const { sws, links } = active();
    const r = STP.compute(sws, links);
    const root = sws.find(s => r.rootOf[s.id] === s.id);
    const steps = [
      { title: 'Eleição da raiz', text: `Todos começam se anunciando como raiz. Compara-se a Bridge ID (prioridade, depois MAC): <strong>${root.id}</strong> vence (prioridade ${root.priority}, MAC ${root.mac}).` },
      { title: 'Root Ports', text: `Cada switch não-root escolhe a porta de menor custo até a raiz: ${sws.filter(s => s.id !== root.id).map(s => `${s.id} → ${r.rootPort[s.id] || '—'} (custo ${r.cost[s.id]})`).join('; ')}.` },
      { title: 'Designated Ports', text: 'Em cada segmento, a ponta com menor custo até a raiz (empate → menor BID) é designada. Todas as portas da raiz são designadas.' },
      { title: 'Bloqueio', text: r.explain.filter(x => x.includes('bloqueada')).join('<br>') || 'Nenhuma porta bloqueada: a topologia ativa já não tem ciclos.' },
    ];
    host.innerHTML = '';
    host.append(Player({ steps, render: i => drawTopo(r, i) }));
  }
  function editorUI() {
    editor.innerHTML = '';
    const { sws, links } = active();
    editor.append(h('div', { class: 'card tight stack' }, h('strong', {}, 'Switches'), ...sws.map(s => h('div', { class: 'row' }, h('span', { style: { width: '28px', fontWeight: 700 } }, s.id),
      h('select', { class: 'input', style: { width: 'auto' }, 'aria-label': `Prioridade ${s.id}`, onchange: e => { s.priority = +e.target.value; build(); } }, [0, 4096, 8192, 24576, 28672, 32768, 61440].map(v => h('option', { value: v, selected: v === s.priority }, String(v)))),
      h('input', { class: 'input', style: { width: '150px' }, value: s.mac, 'aria-label': `MAC ${s.id}`, onchange: e => { if (/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(e.target.value)) { s.mac = e.target.value.toLowerCase(); build(); } else toast('Formato: xxxx.xxxx.xxxx'); } }))),
      h('label', { class: 'row small' }, h('input', { type: 'checkbox', checked: state.four, onchange: e => { state.four = e.target.checked; editorUI(); build(); } }), 'Incluir S4 (topologia com 4 switches)')),
      h('div', { class: 'card tight stack' }, h('strong', {}, 'Enlaces'), ...links.map(l => h('div', { class: 'row' }, h('span', { class: 'mono small', style: { width: '64px' } }, `${l.a}–${l.b}`),
        h('select', { class: 'input', style: { width: 'auto' }, 'aria-label': `Custo ${l.a}-${l.b}`, onchange: e => { l.cost = +e.target.value; build(); } }, [[4, '4 (1 Gb/s)'], [19, '19 (100 Mb/s)'], [100, '100 (10 Mb/s)']].map(([v, t]) => h('option', { value: v, selected: v === l.cost }, t))),
        h('button', { class: `btn sm ${l.up ? '' : 'danger'}`, onclick: () => { l.up = !l.up; editorUI(); build(); } }, l.up ? 'Derrubar' : 'Religar')))));
  }
  editorUI(); build();
  return h('div', { class: 'stack' }, h('div', { class: 'card-kicker' }, 'Simulador STP (802.1D) — altere prioridades, MACs, custos e enlaces'), host, editor, h('p', { class: 'tiny muted' }, 'Papéis mostrados no 802.1D. No RSTP a porta bloqueada tem papel Alternate e estado Discarding. Desempates: custo → BID do vizinho → Port ID.'));
};

/* ---- Simulador de VLAN (isolamento de broadcast) ---- */
Widgets.vlanSim = () => {
  const pcs = [{ id: 'A', v: 10, x: 80, y: 60 }, { id: 'B', v: 10, x: 80, y: 200 }, { id: 'C', v: 20, x: 520, y: 60 }, { id: 'D', v: 20, x: 520, y: 200 }];
  const SW = [300, 130];
  const steps = [
    { title: 'Mesma infraestrutura', text: 'Um único switch, quatro PCs: A e B na <strong>VLAN 10</strong> (192.168.10.0/24), C e D na <strong>VLAN 20</strong> (192.168.20.0/24). Fisicamente estão todos ligados ao mesmo equipamento.', f: null },
    { title: 'Broadcast na VLAN 10', text: 'A envia um broadcast (ex.: ARP). O switch só o replica para as portas da <strong>mesma VLAN</strong>: B recebe; C e D <strong>não</strong>.', f: { s: 'A', outs: ['B'] } },
    { title: 'Broadcast na VLAN 20', text: 'C envia um broadcast: só D recebe. São dois <strong>domínios de broadcast</strong> distintos no mesmo switch.', f: { s: 'C', outs: ['D'] } },
    { title: 'A tenta falar com C', text: 'A (192.168.10.x) percebe que C está em outra sub-rede e envia ao gateway. Sem um dispositivo de camada 3, <strong>não há como o quadro chegar a C</strong>: o switch L2 não encaminha entre VLANs.', f: { s: 'A', outs: [], blocked: 'C' } },
    { title: 'Com roteador (Inter-VLAN)', text: 'Com um roteador (ou switch L3) servindo de gateway para as duas VLANs, A → roteador → C. Veja a animação de Inter-VLAN mais abaixo.', f: { s: 'A', outs: ['C'], routed: true } },
  ];
  function render(i, s) {
    const f = s.f;
    let inner = pcs.map(p => `<line x1="${p.x}" y1="${p.y}" x2="${SW[0]}" y2="${SW[1]}" class="link" style="stroke:${p.v === 10 ? '#D9784F' : '#5F8FB0'};stroke-width:${f && (f.s === p.id || f.outs.includes(p.id)) ? 6 : 3}"/>`).join('');
    inner += pcs.map(p => `<g class="node"><rect x="${p.x - 32}" y="${p.y - 20}" width="64" height="40" rx="6" style="stroke:${p.v === 10 ? '#D9784F' : '#5F8FB0'};stroke-width:2"/><text x="${p.x}" y="${p.y - 2}" text-anchor="middle" font-size="13" font-weight="700">PC ${p.id}</text><text x="${p.x}" y="${p.y + 13}" text-anchor="middle" class="lbl-s">VLAN ${p.v}</text></g>`).join('');
    inner += nodeBox(SW[0], SW[1], 'Switch', 'L2');
    if (f) {
      const S = pcs.find(p => p.id === f.s); inner += `<circle cx="${(S.x + SW[0]) / 2}" cy="${(S.y + SW[1]) / 2}" r="8" fill="var(--accent)"/>`;
      for (const o of f.outs) { const p = pcs.find(x => x.id === o); inner += `<circle cx="${(p.x + SW[0]) / 2}" cy="${(p.y + SW[1]) / 2}" r="8" fill="var(--primary)"/>`; }
      if (f.blocked) { const p = pcs.find(x => x.id === f.blocked); inner += `<text x="${(p.x + SW[0]) / 2}" y="${(p.y + SW[1]) / 2 + 5}" text-anchor="middle" font-size="22" fill="var(--error)" font-weight="700">✕</text>`; }
      if (f.routed) inner += `<g class="node"><circle cx="300" cy="250" r="22"/><text x="300" y="255" text-anchor="middle" font-size="12" font-weight="700">R1</text></g><line x1="300" y1="152" x2="300" y2="228" class="link trunk"/><text x="312" y="200" class="lbl-s">trunk 10,20</text>`;
    }
    inner += '<rect x="610" y="40" width="14" height="14" fill="#D9784F"/><text x="630" y="52" class="lbl">VLAN 10</text><rect x="610" y="64" width="14" height="14" fill="#5F8FB0"/><text x="630" y="76" class="lbl">VLAN 20</text>';
    return svg(720, 285, inner, 'Isolamento entre VLANs');
  }
  return h('div', { class: 'stack' }, h('div', { class: 'card-kicker' }, 'Simulador: VLANs isolam domínios de broadcast'), Player({ steps, render }));
};

/* ---- 802.1Q: quadro e tag ---- */
Widgets.dot1q = () => {
  let vid = 10, pcp = 0, native = 1;
  const out = h('div', { class: 'stack' });
  const vidIn = h('input', { class: 'input', type: 'number', min: '1', max: '4094', value: '10', 'aria-label': 'VLAN do quadro', oninput: e => { const v = +e.target.value; if (v >= 1 && v <= 4094) { vid = v; draw(); } } });
  const pcpIn = h('select', { class: 'input', 'aria-label': 'PCP', onchange: e => { pcp = +e.target.value; draw(); } }, [0, 1, 2, 3, 4, 5, 6, 7].map(v => h('option', { value: v }, `${v}${v === 5 ? ' (voz)' : v === 0 ? ' (padrão)' : ''}`)));
  const natIn = h('input', { class: 'input', type: 'number', min: '1', max: '4094', value: '1', 'aria-label': 'VLAN nativa do trunk', oninput: e => { const v = +e.target.value; if (v >= 1 && v <= 4094) { native = v; draw(); } } });
  const field = (label, sub, w, cls = '') => `<div style="flex:${w};min-width:0" class="${cls}"><div style="font-weight:700;font-size:.8rem">${label}</div><div class="tiny" style="opacity:.85">${sub}</div></div>`;
  function draw() {
    const tagged = vid !== native;
    const bin = vid.toString(2).padStart(12, '0');
    out.innerHTML = '';
    const frame = (withTag) => h('div', { class: 'blocks', style: { height: 'auto', minHeight: '56px' }, html:
      `<div style="flex:2;background:var(--surface-3);padding:6px">${field('MAC destino', '6 B', 1)}</div><div style="flex:2;background:var(--surface-3);padding:6px">${field('MAC origem', '6 B', 1)}</div>` +
      (withTag ? `<div style="flex:3;background:var(--accent);padding:6px;color:#2E2118">${field('Tag 802.1Q (4 B)', `TPID 0x8100 · PCP ${pcp} · DEI 0 · VID ${vid}`, 1)}</div>` : '') +
      `<div style="flex:1.2;background:var(--surface-3);padding:6px">${field('EtherType', '0x0800', 1)}</div><div style="flex:3;background:var(--surface-2);padding:6px">${field('Dados (IP…)', '46–1500 B', 1)}</div><div style="flex:1;background:var(--surface-3);padding:6px">${field('FCS', '4 B', 1)}</div>` });
    out.append(
      h('div', { class: 'small' }, h('strong', {}, 'Na porta access (PC → switch): '), 'quadro comum, sem tag.'), frame(false),
      h('div', { class: 'small' }, h('strong', {}, 'No trunk (switch → switch/roteador): '), tagged ? `a VLAN ${vid} recebe a tag com VID ${vid}.` : `VLAN ${vid} = VLAN nativa → trafega SEM tag.`), frame(tagged),
      tagged ? h('div', { class: 'small mono', html: `TCI (16 bits) = PCP <strong>${pcp.toString(2).padStart(3, '0')}</strong> · DEI <strong>0</strong> · VID <strong>${bin}</strong> (= ${vid})` }) : h('div', { class: 'note correction small', style: { margin: 0 } }, 'Quadros da VLAN nativa vão sem tag. Se as pontas tiverem nativas diferentes, o quadro "muda" de VLAN do outro lado (native VLAN mismatch).'),
      h('p', { class: 'tiny muted', style: { margin: 0 } }, `O FCS é recalculado quando a tag é inserida ou retirada. VID de 12 bits → 4096 valores; 0 e 4095 são reservados.`));
  }
  draw();
  return h('div', { class: 'card stack' }, h('div', { class: 'card-kicker' }, 'Simulador 802.1Q: monte o quadro'), h('div', { class: 'grid cols-3' }, h('div', { class: 'field' }, h('label', {}, 'VLAN do quadro'), vidIn), h('div', { class: 'field' }, h('label', {}, 'PCP (prioridade)'), pcpIn), h('div', { class: 'field' }, h('label', {}, 'VLAN nativa do trunk'), natIn)), out);
};

/* ---- Animação Inter-VLAN (router-on-a-stick) ---- */
Widgets.interVlan = () => {
  const N = { A: [90, 220], B: [90, 60], SW: [330, 140], R: [600, 140] };
  const MAC = { A: '…0A:01', B: '…14:01', R: '…R1:00' };
  const steps = [
    { title: 'PC-A decide', at: 'A', text: 'PC-A (192.168.10.10/24, gateway 192.168.10.1) quer falar com PC-B (192.168.20.10). Aplicando a própria máscara, conclui: <strong>outra sub-rede</strong> → o quadro vai para o <strong>gateway</strong>, não direto para PC-B.', hdr: null },
    { title: 'ARP pelo gateway', at: 'SW', path: ['A', 'SW', 'R'], text: 'PC-A não conhece o MAC do gateway: envia um <strong>ARP request (broadcast)</strong> "quem tem 192.168.10.1?". O switch <strong>aprende o MAC de PC-A</strong> na Fa0/1 (VLAN 10) e inunda a VLAN 10 — inclusive pelo trunk, com <strong>tag 10</strong>.', hdr: { src: MAC.A, dst: 'FF:FF:FF:FF:FF:FF', tag: '10 (no trunk)', ip: 'ARP: quem tem 192.168.10.1?' } },
    { title: 'Resposta ARP', at: 'SW', path: ['R', 'SW', 'A'], text: 'A subinterface <strong>G0/0.10</strong> responde com seu MAC (unicast). O switch aprende o MAC do roteador na porta trunk, VLAN 10, e entrega a PC-A sem tag.', hdr: { src: MAC.R, dst: MAC.A, tag: '10 (no trunk)', ip: 'ARP reply: 192.168.10.1 está em ' + MAC.R } },
    { title: 'Quadro até o gateway', at: 'R', path: ['A', 'SW', 'R'], text: 'PC-A envia o pacote IP dentro de um quadro para o <strong>MAC do roteador</strong>. Entra na porta access sem tag; ao sair pelo trunk, o switch <strong>insere a tag 802.1Q com VID 10</strong>.', hdr: { src: MAC.A, dst: MAC.R, tag: '10', ip: '192.168.10.10 → 192.168.20.10, TTL 128' } },
    { title: 'Roteamento', at: 'R', text: 'R1 recebe pela G0/0.10 (tag 10), <strong>retira o cabeçalho Ethernet</strong>, lê o IP de destino e consulta a tabela: 192.168.20.0/24 está <strong>diretamente conectada em G0/0.20</strong>. Decrementa o TTL.', hdr: { src: '—', dst: '—', tag: '—', ip: 'IP: 192.168.10.10 → 192.168.20.10, TTL 127' } },
    { title: 'ARP na VLAN 20', at: 'R', path: ['R', 'SW', 'B'], text: 'Se ainda não conhece o MAC de PC-B, R1 faz ARP pela G0/0.20 (quadros com <strong>tag 20</strong> no trunk) e PC-B responde.', hdr: { src: MAC.R, dst: 'FF:FF:FF:FF:FF:FF', tag: '20', ip: 'ARP: quem tem 192.168.20.10?' } },
    { title: 'Novo encapsulamento', at: 'SW', path: ['R', 'SW', 'B'], text: 'R1 monta um <strong>quadro novo</strong>: MAC de origem = o seu, destino = MAC de PC-B, <strong>tag 20</strong>. O pacote IP é o mesmo (TTL 127). Não é "só trocar a VLAN": todo o cabeçalho Ethernet foi refeito.', hdr: { src: MAC.R, dst: MAC.B, tag: '20', ip: '192.168.10.10 → 192.168.20.10, TTL 127' } },
    { title: 'Entrega', at: 'B', path: ['SW', 'B'], text: 'O switch recebe pelo trunk com tag 20, encontra o MAC de PC-B na Fa0/2 (VLAN 20), <strong>retira a tag</strong> e entrega. A resposta de PC-B faz o caminho inverso pelo gateway 192.168.20.1.', hdr: { src: MAC.R, dst: MAC.B, tag: 'sem tag (porta access)', ip: '192.168.10.10 → 192.168.20.10' } },
  ];
  function render(i, s) {
    let inner = `<line x1="${N.A[0]}" y1="${N.A[1]}" x2="${N.SW[0]}" y2="${N.SW[1]}" class="link" style="stroke:#D9784F"/><line x1="${N.B[0]}" y1="${N.B[1]}" x2="${N.SW[0]}" y2="${N.SW[1]}" class="link" style="stroke:#5F8FB0"/><line x1="${N.SW[0]}" y1="${N.SW[1]}" x2="${N.R[0]}" y2="${N.R[1]}" class="link trunk"/>
      <text x="${(N.SW[0] + N.R[0]) / 2}" y="${N.SW[1] - 12}" text-anchor="middle" class="lbl">trunk 802.1Q (Fa0/24 ↔ G0/0)</text>
      ${nodeBox(N.A[0], N.A[1], 'PC-A', 'VLAN 10 · .10.10', 'pc')}${nodeBox(N.B[0], N.B[1], 'PC-B', 'VLAN 20 · .20.10', 'pc')}${nodeBox(N.SW[0], N.SW[1], 'S1', 'switch L2')}<g class="node"><circle cx="${N.R[0]}" cy="${N.R[1]}" r="30"/><text x="${N.R[0]}" y="${N.R[1] - 2}" text-anchor="middle" font-size="13" font-weight="700">R1</text><text x="${N.R[0]}" y="${N.R[1] + 13}" text-anchor="middle" class="lbl-s">.10.1 / .20.1</text></g>`;
    if (s.path) { const pts = s.path.map(k => N[k]); inner += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-dasharray="8 6" opacity=".8"/>`; }
    const at = N[s.at];
    inner += `<circle cx="${at[0]}" cy="${at[1] - 34}" r="9" fill="var(--accent)"><title>pacote</title></circle>`;
    if (s.hdr) inner += `<g><rect x="400" y="200" width="310" height="76" rx="8" fill="var(--surface)" stroke="var(--border-strong)"/><text x="412" y="219" class="lbl" font-weight="700">Quadro / pacote nesta etapa</text><text x="412" y="237" class="lbl-s">MAC origem ${sx(s.hdr.src)} → destino ${sx(s.hdr.dst)}</text><text x="412" y="253" class="lbl-s">Tag VLAN: ${sx(s.hdr.tag)}</text><text x="412" y="269" class="lbl-s">${sx(s.hdr.ip)}</text></g>`;
    return svg(720, 290, inner, 'Roteamento Inter-VLAN');
  }
  return h('div', { class: 'stack' }, h('div', { class: 'card-kicker' }, 'Animação: PC-A → Switch → Trunk → Roteador → Switch → PC-B'), Player({ steps, render }));
};
