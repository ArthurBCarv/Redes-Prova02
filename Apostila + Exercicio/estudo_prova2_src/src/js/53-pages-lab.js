/* ==========================================================================
   Página: Laboratório Cisco IOS (terminal educacional + topologia + tarefas)
   ========================================================================== */
const VCOLOR = v => ({ 1: '#B7A694', 10: '#D9784F', 20: '#5F8FB0', 30: '#8AA352', 99: '#9A7BB0', 1000: '#C9A227' }[v] || '#B7A694');

function labState(id) {
  const st = App.st; const sc = Labs.byId[id];
  if (!st.lab.states[id]) {
    const lab = sc.build();
    const sessions = {}; const logs = {};
    for (const d of Object.keys(lab.devices)) { sessions[d] = IOS.newSession(d); logs[d] = [{ k: 'sys', t: `${lab.devices[d].hostname} — terminal educacional (subconjunto do Cisco IOS). Digite "?" para ver os comandos aceitos.` }]; }
    st.lab.states[id] = { lab, sessions, logs, pings: [], answers: {}, credited: false, active: Object.keys(lab.devices)[0], solutionSeen: false };
  }
  return st.lab.states[id];
}

function labLayout(lab, id) {
  const pos = {};
  const devs = Object.entries(lab.devices);
  if (id === 'stp') { Object.assign(pos, { S1: [170, 80], S2: [530, 80], S3: [350, 220] }); }
  else {
    const sws = devs.filter(([, d]) => d.type === 'switch').map(([k]) => k);
    const rts = devs.filter(([, d]) => d.type === 'router').map(([k]) => k);
    sws.forEach((s, i) => { pos[s] = [sws.length === 1 ? 300 : 170 + i * (360 / Math.max(1, sws.length - 1)), 140]; });
    rts.forEach((r, i) => { pos[r] = [580, 140 + i * 60]; });
  }
  const hostsBySw = {};
  for (const hst of Object.values(lab.hosts)) (hostsBySw[hst.sw] = hostsBySw[hst.sw] || []).push(hst);
  for (const [sw, list] of Object.entries(hostsBySw)) {
    const [x, y] = pos[sw];
    list.forEach((hst, i) => { const off = (i - (list.length - 1) / 2) * 190; pos[hst.id] = id === 'stp' ? [x + (x < 350 ? -110 : x > 350 ? 110 : 0), y + (y > 150 ? 70 : -55)] : [x + off, y + 140]; });
  }
  return pos;
}

function labTopology(S, id) {
  const lab = IOS.applyDhcp(S.lab);
  const pos = labLayout(lab, id);
  const stp = id === 'stp' ? IOS.stpForVlan(lab, 1).r : null;
  let inner = '';
  for (const l of lab.links) {
    const [x1, y1] = pos[l.a], [x2, y2] = pos[l.b];
    const A = lab.devices[l.a], B = lab.devices[l.b];
    const swSide = A.type === 'switch' ? [l.a, l.pa] : [l.b, l.pb];
    const trunk = IOS.trunkUp(lab, swSide[0], swSide[1]);
    const down = (A.type === 'switch' && A.ports[l.pa].shutdown) || (B.type === 'switch' && B.ports[l.pb].shutdown) || (A.type === 'router' && A.ifaces[l.pa].shutdown) || (B.type === 'router' && B.ifaces[l.pb].shutdown);
    const blocked = stp && ((stp.ports[`${l.a}|${l.pa}`] || {}).role === 'blocked' || (stp.ports[`${l.b}|${l.pb}`] || {}).role === 'blocked');
    inner += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="link ${down ? 'down' : blocked ? 'blocked' : trunk ? 'trunk' : ''}"/>`;
    inner += `<text x="${x1 + (x2 - x1) * 0.2}" y="${y1 + (y2 - y1) * 0.2 - 8}" text-anchor="middle" class="lbl-s">${sx(l.pa)}</text><text x="${x1 + (x2 - x1) * 0.8}" y="${y1 + (y2 - y1) * 0.8 - 8}" text-anchor="middle" class="lbl-s">${sx(l.pb)}</text>`;
    if (trunk && !down) inner += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 16}" text-anchor="middle" class="lbl-s" fill="var(--accent-text)">${blocked ? 'trunk (porta bloqueada pelo STP)' : 'trunk'}</text>`;
  }
  for (const hst of Object.values(lab.hosts)) {
    const [x, y] = pos[hst.id], [sx2, sy] = pos[hst.sw];
    const p = lab.devices[hst.sw].ports[hst.port];
    inner += `<line x1="${x}" y1="${y}" x2="${sx2}" y2="${sy}" class="link ${p.shutdown ? 'down' : ''}" style="stroke:${p.mode === 'trunk' ? 'var(--error)' : VCOLOR(p.access)}"/><text x="${(x + sx2) / 2 + 6}" y="${(y + sy) / 2}" class="lbl-s">${sx(hst.port)} · VLAN ${p.mode === 'trunk' ? 'trunk!' : p.access}</text>`;
    inner += nodeBox(x, y, hst.id, hst.ip || (hst.dhcp ? 'DHCP: sem IP' : 'sem IP'), 'pc');
  }
  for (const [k, d] of Object.entries(lab.devices)) { const [x, y] = pos[k]; inner += nodeBox(x, y, d.hostname, d.type === 'router' ? 'roteador' : d.l3 ? 'switch L3' : 'switch L2', d.type === 'router' ? 'router' : 'sw'); if (stp && stp.rootOf[k] === k) inner += `<text x="${x}" y="${y - 32}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--primary-strong)">Root Bridge</text>`; }
  const xs = Object.values(pos).map(p => p[0]), ys = Object.values(pos).map(p => p[1]);
  const x0 = Math.min(...xs) - 100, y0 = Math.min(...ys) - 60, w = Math.max(...xs) - x0 + 100, hh = Math.max(...ys) - y0 + 50;
  const el = svg(w, hh, inner, 'Topologia do laboratório'); el.setAttribute('viewBox', `${x0} ${y0} ${w} ${hh}`);
  return el;
}

Pages.laboratorio = () => {
  const st = App.st;
  return h('div', { class: 'content' }, pageHead('Laboratório', 'Configure switches e roteadores num terminal educacional e verifique o efeito real na rede simulada. É um subconjunto do Cisco IOS — só os comandos dos materiais (digite "?" no terminal para ver a lista).'),
    h('div', { class: 'grid cols-2' }, Labs.scenarios.map(sc => {
      const S = st.lab.states[sc.id];
      const done = S ? sc.tasks.filter(t => t.check(S.lab, S)).length : 0;
      return h('a', { class: 'card stack', href: `#/laboratorio/${sc.id}`, style: { textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'row between' }, h('span', { class: 'card-kicker' }, DIFF_LABEL[sc.level]), sc.challenge ? h('span', { class: 'badge comp' }, 'Desafio sem passo a passo') : null), h('h3', { style: { margin: 0 } }, sc.title), h('p', { class: 'small', style: { margin: 0 } }, sc.goal), h('div', { class: 'tiny muted' }, `Fonte: ${sc.source}`), h('div', { class: 'progress ok' }, h('span', { style: { width: pct(done / sc.tasks.length) } })), h('div', { class: 'tiny muted' }, `${done}/${sc.tasks.length} tarefas concluídas`));
    })),
    h('section', { class: 'card stack', style: { marginTop: '24px' } }, h('h2', {}, 'Simuladores visuais'), h('p', { class: 'small muted', style: { margin: 0 } }, 'Os simuladores de MAC, STP, VLAN, 802.1Q e a animação Inter-VLAN estão nos módulos e também aqui:'),
      h('div', { class: 'tabs', role: 'tablist' }, ...[['macSim', 'Aprendizado MAC'], ['stpSim', 'STP'], ['vlanSim', 'VLANs'], ['dot1q', '802.1Q'], ['interVlan', 'Inter-VLAN']].map(([w, l], i) => h('button', { role: 'tab', 'aria-selected': String(i === 0), onclick: e => { $$('.tabs button', e.currentTarget.parentElement.parentElement).forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget))); const host = $('#sim-host'); host.innerHTML = ''; host.append(Widgets[w]()); } }, l))),
      h('div', { id: 'sim-host' }, Widgets.macSim())));
};

Pages.labScenario = id => {
  const sc = Labs.byId[id]; if (!sc) return Pages.notFound();
  const st = App.st; const S = labState(id);
  App.routeTopic = sc.topics[0];
  const topo = h('div', { class: 'sim-stage' });
  const tasksBox = h('div', {}); const hostsBox = h('div', { class: 'stack' }); const pingBox = h('div', { class: 'stack' });
  function evalTasks() {
    const done = sc.tasks.map(t => t.check(S.lab, S));
    tasksBox.innerHTML = '';
    sc.tasks.forEach((t, i) => {
      const ask = t.ask ? h('div', { class: 'row', style: { marginTop: '6px' } }, t.ask.options.map(o => h('button', { class: `btn sm ${S.answers[t.ask.key] === o ? 'primary' : ''}`, onclick: () => { S.answers[t.ask.key] = o; App.save(); refresh(); if (!t.check(S.lab, S)) toast('Ainda não. Compare as prioridades e, em empate, o MAC.'); } }, o))) : null;
      tasksBox.append(h('div', { class: `task ${done[i] ? 'done' : ''}` }, h('span', { class: 'ck', 'aria-hidden': 'true' }, done[i] ? icon('check') : ''), h('div', { style: { flex: 1 } }, h('div', {}, h('span', { class: 'sr-only' }, done[i] ? 'Concluída: ' : 'Pendente: '), t.text), ask, t.hint && !sc.challenge ? h('details', { class: 'small muted' }, h('summary', {}, 'Dica'), t.hint) : null)));
    });
    const all = done.every(Boolean);
    if (all && !S.credited) {
      S.credited = true;
      for (const tid of sc.topics) if (st.topics[tid]) st.topics[tid] = { ...st.topics[tid], labConfigs: (st.topics[tid].labConfigs || 0) + 1 };
      for (const tid of sc.topics) st.topics[tid] = { ...st.topics[tid], status: Adaptive.status(st.topics[tid]) };
      App.save(); toast(S.solutionSeen ? 'Laboratório concluído (com a solução aberta).' : 'Laboratório concluído! Configuração válida registrada no seu progresso.');
    }
    return done;
  }
  function renderHosts() {
    const lab = IOS.applyDhcp(S.lab);
    hostsBox.innerHTML = '';
    for (const hs of Object.values(S.lab.hosts)) {
      const live = lab.hosts[hs.id];
      const inp = (key, label) => h('div', { class: 'field' }, h('span', { class: 'lbl' }, label), hs.dhcp ? h('span', { class: 'mono small' }, live[key] || '—') : h('input', { class: 'input', value: hs[key] || '', 'aria-label': `${label} de ${hs.id}`, onchange: e => { const v = e.target.value.trim(); if (v && IPv4.toInt(v) === null) { e.target.classList.add('bad'); return; } e.target.classList.remove('bad'); hs[key] = v || null; App.save(); refresh(); } }));
      hostsBox.append(h('div', { class: 'stack', style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px' } }, h('div', { class: 'row' }, h('strong', {}, hs.id), h('span', { class: 'badge' }, `${hs.sw} ${hs.port}`), hs.dhcp ? h('span', { class: 'badge comp' }, 'DHCP') : null), h('div', { class: 'fields' }, inp('ip', 'IP'), inp('mask', 'Máscara'), inp('gw', 'Gateway'))));
    }
  }
  function renderPing() {
    const ids = Object.keys(S.lab.hosts);
    const a = h('select', { class: 'input', style: { width: 'auto' }, 'aria-label': 'Origem do ping' }, ids.map(x => h('option', {}, x)));
    const b = h('select', { class: 'input', style: { width: 'auto' }, 'aria-label': 'Destino do ping' }, ids.map((x, i) => h('option', { selected: i === 1 }, x)));
    const out = h('div', { 'aria-live': 'polite' });
    pingBox.innerHTML = '';
    pingBox.append(h('div', { class: 'row' }, a, h('span', {}, '→'), b, h('button', { class: 'btn primary sm', onclick: () => {
      if (a.value === b.value) { toast('Escolha hosts diferentes.'); return; }
      const r = IOS.ping(S.lab, a.value, b.value);
      S.lab.macSeen = r.lab.macSeen; S.pings.push({ a: a.value, b: b.value, ok: r.ok, at: Date.now() }); S.pings = S.pings.slice(-30); App.save();
      out.innerHTML = '';
      out.append(h('div', { class: `note ${r.ok ? 'ok' : 'bad'}` }, h('strong', {}, r.ok ? 'Ping OK. ' : 'Falhou. '), r.reason, r.steps.length ? h('ol', { class: 'steps small', style: { marginTop: '8px' } }, r.steps.map(s => h('li', {}, s))) : null));
      refresh(false);
    } }, 'Ping')), out);
  }
  function refresh(withPing = true) { topo.innerHTML = ''; topo.append(labTopology(S, id)); evalTasks(); renderHosts(); if (withPing) { /* mantém o resultado do ping na tela */ } }

  /* ---- terminal ---- */
  const termOut = h('div', { class: 'term-out', tabindex: '0', 'aria-label': 'Saída do terminal', role: 'log' });
  const promptLbl = h('label', { for: `term-in-${id}` });
  const termIn = h('input', { id: `term-in-${id}`, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Comando IOS' });
  const termTabs = h('div', { class: 'term-tabs', role: 'tablist', 'aria-label': 'Equipamento' });
  let hIdx = -1;
  function renderTerm() {
    termTabs.innerHTML = '';
    for (const d of Object.keys(S.lab.devices)) termTabs.append(h('button', { role: 'tab', 'aria-selected': String(d === S.active), onclick: () => { S.active = d; App.save(); renderTerm(); termIn.focus(); } }, S.lab.devices[d].hostname));
    termOut.innerHTML = '';
    for (const l of S.logs[S.active].slice(-300)) termOut.append(h('div', { class: l.k }, l.t));
    termOut.scrollTop = termOut.scrollHeight;
    promptLbl.textContent = IOS.prompt(S.lab, S.sessions[S.active]);
  }
  termIn.addEventListener('keydown', e => {
    const sess = S.sessions[S.active];
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const hist = sess.history || []; if (!hist.length) return;
      e.preventDefault(); hIdx = e.key === 'ArrowUp' ? Math.min(hist.length - 1, hIdx + 1) : Math.max(-1, hIdx - 1);
      termIn.value = hIdx >= 0 ? hist[hist.length - 1 - hIdx] : ''; return;
    }
    if (e.key !== 'Enter') return;
    hIdx = -1;
    const line = termIn.value; termIn.value = '';
    const log = S.logs[S.active];
    log.push({ k: 'cmd', t: `${IOS.prompt(S.lab, sess)} ${line}` });
    const r = IOS.exec(S.lab, sess, line);
    S.lab = r.lab; S.sessions[S.active] = r.session;
    for (const o of r.out) log.push({ k: r.ok ? 'sys' : 'err', t: o });
    if (log.length > 400) log.splice(0, log.length - 400);
    if (!r.ok) {
      // registra só no histórico (pontos fracos), sem penalizar o domínio por erro de digitação
      st.history.push({ qid: `lab:${id}`, sig: '', topic: 'ios', difficulty: sc.level, kind: 'lab-cmd', result: 'incorrect', hints: 0, attempts: 1, wrongTags: ['ios-sintaxe'], tagsAll: ['ios-sintaxe'], context: 'lab', cmd: line.slice(0, 80), at: Date.now() });
      if (st.history.length > 3000) st.history.shift();
    }
    App.save(); renderTerm(); refresh(false);
  });

  const solution = h('div', { class: 'stack' });
  function renderSolution(show) {
    solution.innerHTML = '';
    if (!show) { solution.append(h('button', { class: 'btn ghost', onclick: async () => { if (sc.challenge && !await confirmDialog({ title: 'Ver a solução do desafio?', body: 'Tente primeiro: o desafio serve para você resolver sozinho. Ver a solução fica registrado.', ok: 'Ver solução' })) return; S.solutionSeen = true; App.save(); renderSolution(true); } }, 'Ver solução (comandos)')); return; }
    for (const [d, cmds] of Object.entries(sc.solution)) solution.append(h('div', {}, h('strong', {}, d), h('pre', { class: 'cli' }, cmds.join('\n'))));
  }
  renderSolution(S.solutionSeen);

  const page = h('div', { class: 'content' },
    pageHead(sc.title, sc.goal, h('span', {}, h('a', { href: '#/laboratorio' }, 'Laboratório'), ' / ', sc.title)),
    h('div', { class: 'row small', style: { marginTop: '-12px', marginBottom: '16px' } }, h('span', { class: 'badge prof' }, sc.source), h('span', { class: 'badge' }, DIFF_LABEL[sc.level])),
    h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', alignItems: 'start' } },
      h('div', { class: 'stack' }, h('div', { class: 'card tight stack' }, h('div', { class: 'card-kicker' }, 'Topologia (atualiza a cada comando)'), topo, h('div', { class: 'tiny muted' }, 'Linha âmbar grossa = trunk ativo · tracejado vermelho = bloqueado pelo STP · pontilhado = desligado · cores das portas = VLAN.')),
        h('div', { class: 'card tight stack' }, h('div', { class: 'card-kicker' }, 'Hosts'), hostsBox), h('div', { class: 'card tight stack' }, h('div', { class: 'card-kicker' }, 'Testar conectividade'), pingBox)),
      h('div', { class: 'stack' }, h('div', { class: 'card tight stack' }, h('div', { class: 'card-kicker' }, sc.challenge ? 'Critérios de verificação' : 'Tarefas'), tasksBox),
        sc.questions.length ? h('div', { class: 'card tight stack' }, h('div', { class: 'card-kicker' }, 'Perguntas do laboratório'), sc.questions.map(q => h('details', {}, h('summary', {}, q.q), h('p', { class: 'small', style: { marginTop: '6px' } }, q.a)))) : null,
        h('div', { class: 'card tight stack' }, h('div', { class: 'card-kicker' }, 'Solução'), solution, h('button', { class: 'btn sm danger', onclick: async () => { if (!await confirmDialog({ title: 'Reiniciar este laboratório?', body: 'Toda a configuração e o terminal deste cenário voltam ao estado inicial.', ok: 'Reiniciar', danger: true })) return; delete st.lab.states[id]; App.save(); route(); } }, icon('reset'), 'Reiniciar laboratório')))),
    h('section', { style: { marginTop: '16px' } }, h('div', { class: 'term' }, termTabs, termOut, h('div', { class: 'term-in' }, promptLbl, termIn)),
      h('p', { class: 'tiny muted' }, 'Aceita abreviações (en, conf t, int f0/1, sw mo acc, do sh vl br). ↑/↓ = histórico. Comandos fora do subconjunto implementado retornam "% Invalid input" com dica quando possível.')));
  renderTerm(); refresh(); renderPing();
  return page;
};
