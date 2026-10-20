/* ==========================================================================
   UI: helpers DOM, ícones, App (estado vivo + salvar), roteador, componentes
   ========================================================================== */
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- ícones SVG (traço uniforme 1.8) ---------- */
const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  plan: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M7 13h4M7 17h7"/>',
  learn: '<path d="M2 6l10-4 10 4-10 4z"/><path d="M6 8v6c0 2 3 4 6 4s6-2 6-4V8"/><path d="M22 6v6"/>',
  practice: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  lab: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 9l3 2-3 2M11 14h6"/><path d="M8 21h8"/>',
  exam: '<path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="M9 12l2 2 4-4"/>',
  weak: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
  review: '<path d="M4 4h12l4 4v12H4z"/><path d="M8 10h8M8 14h8M8 18h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.2 1.6 1.3 2.5h5.4c.1-.9.5-1.7 1.3-2.5A6 6 0 0 0 12 3z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
  next: '<path d="M6 4l10 8-10 8z"/><path d="M18 4v16"/>', prev: '<path d="M18 4L8 12l10 8z"/><path d="M6 4v16"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  flag: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 3h16"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  net: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-3h14v3"/>',
};
const icon = (name, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls); s.innerHTML = ICONS[name] || ''; return s; };

/* ---------- App: estado vivo ---------- */
const App = {
  st: null, storage: null, saveTimer: null, routeArea: 'inicio', routeTopic: null, lastInteract: Date.now(), openSm: new Set(),
  init() {
    try { this.storage = window.localStorage; this.storage.getItem('x'); } catch (e) { this.storage = { getItem: () => null, setItem: () => { throw new Error('indisponível'); } }; }
    const raw = Store.read(this.storage);
    const v = raw ? Store.validate(raw) : null;
    this.st = v && v.ok ? v.state : Store.defaultState();
    this.applyTheme();
  },
  save(now = false) {
    clearTimeout(this.saveTimer);
    const doit = () => { const ok = Store.write(this.storage, this.st); if (!ok && !this._warned) { this._warned = true; toast('Não foi possível salvar no armazenamento do navegador. Use Configurações → Exportar progresso para não perder seus dados.'); } };
    if (now) doit(); else this.saveTimer = setTimeout(doit, 400);
  },
  applyTheme() { const t = this.st.settings.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); },
  record(q, result, { hints = 0, attempts = 1, ms = 0, wrongKeys = [], context = 'practice' } = {}) {
    const tagOf = k => (q.tags && (q.tags[k] || q.tags['*'] || q.tags.c)) || null;
    const wrongTags = [...new Set(wrongKeys.map(tagOf).filter(Boolean))];
    if (result === 'incorrect' && !wrongTags.length) { const t = tagOf(q.fields[0].key); if (t) wrongTags.push(t); }
    const tagsAll = [...new Set(q.fields.map(f => tagOf(f.key)).filter(Boolean))];
    Store.recordAttempt(this.st, { qid: q.id, sig: q.sig, topic: q.topic, difficulty: q.difficulty, kind: q.kind || q.generator || 'geral', result, hints, attempts, ms, wrongTags, tagsAll, source: q.source, fullVlsm: !!q.fullVlsm, context, diagnostic: context === 'diagnostic' });
    this.save();
    updateNavCounts();
  },
  ctx(now = Date.now()) {
    const st = this.st;
    return { topics: st.topics, settings: st.settings, now, dueCards: Flash.dueByTopic(Cards.cards, st.flash.cards, now), recHistory: st.recHistory, mode: st.settings.mode, block: Schedule.current(st), remainingMinutes: Schedule.remainingMinutes(st), examDone: (st.exams || []).length > 0 };
  },
};

/* ---------- toast / diálogo ---------- */
function toast(msg, ms = 4200) {
  let w = $('.toast-wrap'); if (!w) { w = h('div', { class: 'toast-wrap', role: 'status', 'aria-live': 'polite' }); document.body.append(w); }
  const t = h('div', { class: 'toast' }, msg); w.append(t); setTimeout(() => t.remove(), ms);
}
function confirmDialog({ title, body, ok = 'Confirmar', cancel = 'Cancelar', danger = false }) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const close = v => { scrim.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') close(false); };
    const okBtn = h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => close(true) }, ok);
    const dlg = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-t' }, h('h2', { id: 'dlg-t' }, title), typeof body === 'string' ? h('p', {}, body) : body, h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '16px' } }, h('button', { class: 'btn ghost', onclick: () => close(false) }, cancel), okBtn));
    const scrim = h('div', { class: 'dialog-scrim', onclick: e => { if (e.target === scrim) close(false); } }, dlg);
    document.body.append(scrim); document.addEventListener('keydown', onKey); okBtn.focus();
  });
}

/* ---------- conteúdo com marcadores ---------- */
const BADGES = { prof: '<span class="badge prof" title="Conteúdo presente nos arquivos do professor">Material do professor</span>', comp: '<span class="badge comp" title="Explicação complementar, não detalhada nos PDFs">Complemento</span>' };
/** Converte HTML com {{sm:id}}, {{w:id}}, {{prof}}, {{comp}} em nós. */
function richContent(html, opts = {}) {
  const wrap = h('div', { class: 'prose rich' });
  wrap.innerHTML = html.replace(/\{\{(prof|comp)\}\}/g, (_, k) => BADGES[k]).replace(/\{\{sm:([\w-]+)\}\}/g, '<div data-sm="$1"></div>').replace(/\{\{w:([\w-]+)\}\}/g, '<div data-w="$1"></div>');
  for (const ph of $$('[data-sm]', wrap)) ph.replaceWith(opts.noSm ? document.createTextNode('') : saibaMaisBlock(ph.dataset.sm));
  for (const ph of $$('[data-w]', wrap)) { const w = Widgets[ph.dataset.w]; ph.replaceWith(w ? w() : h('span')); }
  for (const t of $$('table.tbl', wrap)) { if (!t.parentElement.classList.contains('tbl-wrap')) { const tw = h('div', { class: 'tbl-wrap' }); t.replaceWith(tw); tw.append(t); } }
  return wrap;
}

/* ---------- Saiba mais ---------- */
function saibaMaisBlock(id) {
  const data = Content.saibaMais[id];
  if (!data) return h('span');
  const box = h('div', { class: 'sm-wrap' });
  const btn = h('button', { class: 'sm-btn no-print', 'aria-expanded': 'false', 'aria-controls': `sm-${id}`, onclick: () => toggle() }, icon('spark'), 'Saiba mais: ', h('span', {}, data.title));
  let panel = null, openedAt = 0, timer = null;
  const LABELS = { porque: 'Por que existe?', dentro: 'Como funciona por dentro?', logica: 'Por que funciona dessa maneira?', diferente: 'O que aconteceria se fosse diferente?', exemplo: 'Exemplo interessante' };
  function tick() { if (document.visibilityState === 'visible' && panel) { App.st.study.saibaMaisMs += 5000; } }
  function toggle(force) {
    const open = force !== undefined ? force : !panel;
    if (open && !panel) {
      panel = h('section', { class: `sm-panel ${window.innerWidth <= 600 ? 'modal' : ''}`, id: `sm-${id}`, role: 'region', 'aria-label': data.title },
        h('header', {}, icon('spark'), h('h3', {}, data.title), h('span', { class: 'badge comp' }, 'Aprofundamento opcional'), h('button', { class: 'btn ghost sm icon-btn', 'aria-label': 'Fechar', onclick: () => toggle(false) }, icon('close'))),
        h('div', { class: 'sm-body' },
          h('div', { class: 'row' }, ...(data.kinds || []).map(k => h('span', { class: 'badge' }, k))),
          ...Object.entries(LABELS).filter(([k]) => data.s[k]).map(([k, label]) => h('div', { class: 'sm-item' }, h('h4', {}, label), h('p', {}, data.s[k]))),
          data.widget && Widgets[data.widget] ? Widgets[data.widget]() : null,
          h('p', { class: 'tiny muted' }, 'Este painel não conta como aprendizagem comprovada nem altera sua pontuação. O tempo só é registrado enquanto ele estiver aberto.')));
      box.append(panel);
      btn.setAttribute('aria-expanded', 'true'); App.openSm.add(id);
      App.st.saibaMais.opened[id] = (App.st.saibaMais.opened[id] || 0) + 1; App.save();
      openedAt = Date.now(); timer = setInterval(tick, 5000);
      panel.addEventListener('keydown', e => { if (e.key === 'Escape') { toggle(false); btn.focus(); } });
      if (panel.classList.contains('modal')) $('button', panel).focus();
    } else if (!open && panel) {
      panel.remove(); panel = null; btn.setAttribute('aria-expanded', 'false'); App.openSm.delete(id); clearInterval(timer); App.save();
    }
  }
  box.append(btn);
  if (App.openSm.has(id)) setTimeout(() => toggle(true));
  return box;
}

/* ---------- componente de questão ---------- */
const DIFF_LABEL = { basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };
const SOURCE_LABEL = { prof: 'Lista do professor', var: 'Variação', comp: 'Complemento', gen: 'Gerada' };
const topicName = id => (CONFIG.topics.find(t => t.id === id) || {}).name || id;

/**
 * Renderiza uma questão com dicas progressivas, até 2 tentativas e feedback em 8 partes.
 * opts: { context:'practice'|'module'|'diagnostic', onDone(result), onNext() }
 */
function QuestionView(q, opts = {}) {
  const t0 = Date.now(); let hints = 0, attempts = 0, finished = false;
  const values = {};
  const root = h('div', { class: 'q card' });
  const meta = h('div', { class: 'q-meta' }, h('span', { class: 'badge primary' }, topicName(q.topic)), h('span', { class: 'badge' }, DIFF_LABEL[q.difficulty] || ''), q.source ? h('span', { class: `badge ${q.source === 'prof' ? 'prof' : q.source === 'comp' ? 'comp' : ''}` }, SOURCE_LABEL[q.source] + (q.ref ? ` · ${q.ref}` : '')) : null);
  const prompt = h('div', { class: 'q-prompt', html: q.prompt });
  const fieldsBox = h('div', { class: q.fields.length > 1 && q.fields.every(f => f.type !== 'choice') ? 'fields' : 'stack' });
  const inputs = {};
  q.fields.forEach((f, i) => {
    const id = `f-${Math.random().toString(36).slice(2, 8)}-${i}`;
    if (f.type === 'choice') {
      const group = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': f.label });
      f.options.forEach((o, j) => {
        const inp = h('input', { type: 'radio', name: id, value: String(j), onchange: () => { values[f.key] = String(j); $$('.choice', group).forEach(c => c.classList.toggle('sel', c.contains(inp))); } });
        group.append(h('label', { class: 'choice' }, inp, h('span', { html: o })));
      });
      inputs[f.key] = group;
      fieldsBox.append(h('div', { class: 'field' }, q.fields.length > 1 ? h('span', { class: 'lbl' }, f.label) : null, group));
    } else {
      const inp = h('input', { class: 'input', id, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', inputmode: f.type === 'number' ? 'numeric' : 'text', placeholder: f.placeholder || ({ ip: 'a.b.c.d', prefix: '/n ou máscara', number: '0', cidr: 'a.b.c.d/n' }[f.type] || ''), oninput: e => { values[f.key] = e.target.value; e.target.classList.remove('ok', 'bad'); }, onkeydown: e => { if (e.key === 'Enter') checkBtn.click(); } });
      inputs[f.key] = inp;
      fieldsBox.append(h('div', { class: 'field' }, h('label', { for: id }, f.label), inp));
    }
  });
  const hintBox = h('div', { class: 'stack' });
  const fbBox = h('div', { 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn primary', onclick: check }, icon('check'), 'Verificar');
  const hintBtn = h('button', { class: 'btn', onclick: showHint }, icon('bulb'), 'Dica (0/3)');
  const solBtn = h('button', { class: 'btn ghost', onclick: () => reveal() }, 'Ver solução completa');
  const actions = h('div', { class: 'row' }, checkBtn, opts.noHints ? null : hintBtn, opts.noHints ? null : solBtn);
  root.append(meta, prompt, fieldsBox, hintBox, actions, fbBox);

  function showHint() {
    if (hints >= 3) return;
    const labels = ['Dica conceitual', 'Primeiro passo', 'Resolução parcial'];
    hintBox.append(h('div', { class: 'hint' }, h('b', {}, `${labels[hints]}: `), h('span', { html: q.hints[hints] })));
    hints++; hintBtn.textContent = ''; hintBtn.append(icon('bulb'), `Dica (${hints}/3)`);
    if (hints >= 3) hintBtn.disabled = true;
  }
  function mark(perField) {
    for (const f of q.fields) {
      const el = inputs[f.key]; const ok = perField[f.key];
      if (f.type === 'choice') { $$('.choice', el).forEach((c, j) => { c.classList.remove('ok', 'bad'); if (String(j) === values[f.key]) c.classList.add(ok ? 'ok' : 'bad'); }); }
      else el.classList.add(ok ? 'ok' : 'bad');
    }
  }
  function check() {
    if (finished) return;
    if (q.fields.some(f => (values[f.key] ?? '') === '')) { toast('Preencha todos os campos antes de verificar (ou abra uma dica).'); return; }
    attempts++;
    const r = Check.question(q, values);
    mark(r.perField);
    if (r.ok) return finish(hints === 0 && attempts === 1 ? 'independent' : 'assisted', r);
    if (attempts >= 2) return finish('incorrect', r);
    fbBox.innerHTML = '';
    fbBox.append(h('div', { class: 'fb' }, h('div', { class: 'fb-head mid' }, icon('info'), `${r.wrongKeys.length} campo(s) incorreto(s) — revise e tente mais uma vez.`), h('div', { class: 'fb-body' }, h('p', { class: 'small', style: { margin: 0 } }, 'Os campos marcados em vermelho estão errados. Uma dica pode ajudar (mas o acerto com dica conta como assistido).'))));
  }
  function reveal() { if (!finished) finish('incorrect', Check.question(q, values), true); }
  function finish(result, r, revealed = false) {
    finished = true; checkBtn.disabled = true; hintBtn.disabled = true; solBtn.disabled = true;
    $$('input', fieldsBox).forEach(i => { i.disabled = true; });
    App.record(q, result, { hints, attempts, ms: Date.now() - t0, wrongKeys: r.wrongKeys, context: opts.context || 'practice' });
    fbBox.innerHTML = ''; fbBox.append(Feedback(q, result, r, revealed, opts.onNext));
    if (opts.onDone) opts.onDone(result);
  }
  return root;
}

/** Feedback em 8 partes */
function Feedback(q, result, r, revealed, onNext) {
  const head = { independent: ['ok', 'Correto, sem ajuda — conta como acerto independente.'], assisted: ['mid', 'Correto com ajuda (dica ou 2ª tentativa) — conta como acerto assistido.'], incorrect: ['bad', revealed ? 'Solução aberta — registrado como não resolvido.' : 'Não foi desta vez — veja a resolução.'] }[result];
  const answers = q.fields.map(f => h('div', {}, h('span', { class: 'muted' }, `${f.label}: `), h('strong', { html: Check.display(f, q.answer[f.key]) }), r && r.perField && r.perField[f.key] === false ? h('span', { class: 'badge bad', style: { marginLeft: '6px' } }, 'você errou') : null));
  const row = (label, content) => content && (Array.isArray(content) ? content.length : true) ? h('div', { class: 'fb-row' }, h('b', {}, label), h('div', {}, content)) : null;
  return h('div', { class: 'fb' },
    h('div', { class: `fb-head ${head[0]}` }, icon(head[0] === 'ok' ? 'check' : head[0] === 'bad' ? 'x' : 'info'), head[1]),
    h('div', { class: 'fb-body' },
      row('1. O que foi pedido', q.fb.asked),
      row('2. Conceito', q.fb.concept),
      row('3. Regra / fórmula', q.fb.rule),
      row('4. Resolução', h('ol', { class: 'steps' }, q.fb.steps.map(s => h('li', { html: s })))),
      row('5. Resposta correta', h('div', { class: 'ans-list' }, answers)),
      row('6. Justificativa', q.fb.why),
      row('7. Erros comuns', q.fb.pitfalls.length ? h('ul', { style: { margin: 0 } }, q.fb.pitfalls.map(p => h('li', {}, p))) : null),
      onNext ? h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', onclick: onNext }, '8. Tentar outro exercício', icon('arrow'))) : null));
}

/** Resolução guiada passo a passo (conta como assistida) */
function GuidedView(g, topic) {
  const root = h('div', { class: 'card stack' }, h('h3', { html: g.title }));
  let i = 0; let errors = 0;
  const list = h('div', { class: 'stack' }); root.append(list);
  function step() {
    const s = g.steps[i]; const f = { key: 'v', label: s.prompt, ...s.field };
    const val = {};
    const out = h('div', { 'aria-live': 'polite' });
    let control;
    if (f.type === 'choice') control = h('div', { class: 'choices' }, f.options.map((o, j) => h('label', { class: 'choice' }, h('input', { type: 'radio', name: `g${Math.random()}`, onchange: () => { val.v = String(j); } }), h('span', {}, o))));
    else control = h('input', { class: 'input', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', oninput: e => { val.v = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') btn.click(); } });
    const btn = h('button', { class: 'btn primary sm', onclick: () => {
      const ok = Check.field(f, val.v ?? '', s.answer);
      out.innerHTML = '';
      if (ok) { out.append(h('div', { class: 'note ok' }, h('strong', {}, 'Isso! '), s.explain)); btn.disabled = true; if (control.tagName === 'INPUT') control.disabled = true; i++; if (i < g.steps.length) step(); else done(); }
      else { errors++; out.append(h('div', { class: 'note bad' }, errors > 1 ? h('span', {}, h('strong', {}, 'Resposta: '), h('span', { html: Check.display(f, s.answer) }), ' — ', s.explain) : 'Ainda não. Releia o exemplo resolvido acima e tente de novo.')); }
    } }, 'Conferir');
    list.append(h('div', { class: 'stack' }, h('div', { class: 'field' }, h('span', { class: 'lbl' }, `Passo ${i + 1} de ${g.steps.length}: ${s.prompt}`), control), h('div', { class: 'row' }, btn), out));
    if (control.tagName === 'INPUT') setTimeout(() => control.focus({ preventScroll: true }), 0);
  }
  function done() {
    list.append(h('div', { class: 'note ok' }, 'Resolução guiada concluída. Ela conta como prática assistida; o próximo passo é resolver sozinho.'));
    const rec = App.st.topics[topic];
    App.st.topics[topic] = Adaptive.recordAttempt(rec, { result: errors ? 'incorrect' : 'assisted', kind: 'guided', sig: `guided:${g.title}` });
    App.save();
  }
  step();
  return root;
}

/* ---------- player genérico de simulações ---------- */
function Player({ steps, render, title, extra }) {
  let i = 0, playing = false, timer = null, speed = 1;
  const stage = h('div', { class: 'sim-stage' });
  const caption = h('div', { class: 'sim-caption', 'aria-live': 'polite' });
  const dots = h('div', { class: 'sim-steps', role: 'tablist', 'aria-label': 'Etapas' });
  steps.forEach((s, j) => dots.append(h('button', { 'aria-label': `Etapa ${j + 1}: ${s.title}`, title: s.title, onclick: () => go(j) }, String(j + 1))));
  const playBtn = h('button', { class: 'btn sm', onclick: () => (playing ? pause() : play()) }, icon('play'), 'Reproduzir');
  const speedSel = h('select', { class: 'input', style: { width: 'auto', minHeight: '36px', padding: '4px 8px', fontFamily: 'var(--font)' }, 'aria-label': 'Velocidade', onchange: e => { speed = +e.target.value; if (playing) { pause(); play(); } } }, ['0.5', '1', '1.5', '2'].map(v => h('option', { value: v, selected: v === '1' }, `${v}×`)));
  const controls = h('div', { class: 'sim-controls' }, h('button', { class: 'btn sm icon-btn', 'aria-label': 'Etapa anterior', onclick: () => go(i - 1) }, icon('prev')), playBtn, h('button', { class: 'btn sm icon-btn', 'aria-label': 'Próxima etapa', onclick: () => go(i + 1) }, icon('next')), h('button', { class: 'btn sm ghost', onclick: () => { pause(); go(0); } }, icon('reset'), 'Reiniciar'), h('span', { class: 'spacer' }), h('label', { class: 'small muted row' }, 'Velocidade', speedSel));
  function go(j) {
    i = Math.max(0, Math.min(steps.length - 1, j));
    stage.innerHTML = ''; stage.append(render(i, steps[i]));
    caption.innerHTML = ''; caption.append(h('div', { class: 'k' }, `Etapa ${i + 1} de ${steps.length} · ${steps[i].title}`), h('div', { html: steps[i].text }));
    $$('button', dots).forEach((b, j2) => { b.toggleAttribute('aria-current', false); b.classList.toggle('done', j2 < i); if (j2 === i) b.setAttribute('aria-current', 'step'); });
    if (i === steps.length - 1 && playing) pause();
  }
  function play() { playing = true; playBtn.innerHTML = ''; playBtn.append(icon('pause'), 'Pausar'); if (i === steps.length - 1) go(0); timer = setInterval(() => { if (i >= steps.length - 1) pause(); else go(i + 1); }, 3200 / speed); }
  function pause() { playing = false; clearInterval(timer); playBtn.innerHTML = ''; playBtn.append(icon('play'), 'Reproduzir'); }
  go(0);
  return h('div', { class: 'sim card' }, title ? h('h3', {}, title) : null, stage, controls, dots, caption, extra || null);
}

/* ---------- SVG helpers ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(w, hgt, inner, label) { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${hgt}`); s.setAttribute('role', 'img'); if (label) s.setAttribute('aria-label', label); s.innerHTML = inner; return s; }
const sx = s => esc(s);
function nodeBox(x, y, label, sub, kind = 'sw', extraCls = '') {
  const w = kind === 'pc' ? 64 : 84, hh = kind === 'pc' ? 40 : 44;
  const ico = kind === 'router' ? `<circle cx="${x}" cy="${y}" r="24" class="node-shape"/>` : `<rect x="${x - w / 2}" y="${y - hh / 2}" width="${w}" height="${hh}" rx="${kind === 'pc' ? 6 : 10}"/>`;
  return `<g class="node ${extraCls}">${kind === 'router' ? `<circle cx="${x}" cy="${y}" r="26"/>` : ico}<text x="${x}" y="${y + (sub ? -2 : 4)}" text-anchor="middle" font-size="13" font-weight="700">${sx(label)}</text>${sub ? `<text x="${x}" y="${y + 13}" text-anchor="middle" class="lbl-s">${sx(sub)}</text>` : ''}</g>`;
}

/* ---------- rastreio de tempo de estudo (aba visível + interação recente) ---------- */
function startTimeTracking() {
  const mark = () => { App.lastInteract = Date.now(); };
  ['pointerdown', 'keydown', 'input', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, mark, { passive: true }));
  setInterval(() => {
    if (document.visibilityState !== 'visible' || Date.now() - App.lastInteract > 120000) return;
    const st = App.st, dt = 15000;
    st.study.activeMs += dt;
    st.study.byArea[App.routeArea] = (st.study.byArea[App.routeArea] || 0) + dt;
    if (App.routeTopic && st.topics[App.routeTopic]) { st.study.byTopic[App.routeTopic] = (st.study.byTopic[App.routeTopic] || 0) + dt; st.topics[App.routeTopic].actualStudyMinutes = Math.round(st.study.byTopic[App.routeTopic] / 60000); }
    // lembrete de pausa do bloco em andamento
    const run = st.schedule.running;
    if (run && !run.notified && Date.now() - run.startedAt >= st.settings.blockMinutes * 60000) { run.notified = true; toast(`Já se passaram ${st.settings.blockMinutes} min deste bloco. Faça a pausa de ${st.settings.breakMinutes} min: levante, beba água, descanse os olhos.`, 9000); }
    App.save();
  }, 15000);
}
const fmtMin = ms => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
const pct = x => `${Math.round(x * 100)}%`;
