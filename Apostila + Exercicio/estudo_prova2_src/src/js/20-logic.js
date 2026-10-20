/* ==========================================================================
   Estado, persistência, flashcards (Leitner), simulado, pontos fracos, cronograma
   ========================================================================== */
const Store = (() => {
  const MAX_HISTORY = 3000;
  function defaultState(now = Date.now()) {
    const topics = {}; for (const t of CONFIG.topics) topics[t.id] = Adaptive.newTopicRecord(t.id);
    return {
      app: 'redes-prova2', version: CONFIG.stateVersion, createdAt: now, updatedAt: now,
      settings: { theme: 'auto', mode: null, totalMinutes: 600, blockMinutes: 50, breakMinutes: 10, weights: { ...CONFIG.defaults.weights }, importance: {}, reserveExamMinutes: 50, reserveFinalMinutes: 50, examTimer: true, gateThreshold: CONFIG.defaults.gateThreshold },
      schedule: { startedAt: null, blocks: Schedule.initialBlocks(50), replans: 0 },
      topics, history: [], solved: {}, diagnostic: { done: false, answers: {}, at: null },
      flash: { cards: {}, lastId: null, filter: 'all' },
      exams: [], examDraft: null,
      study: { activeMs: 0, byTopic: {}, byArea: {}, saibaMaisMs: 0 },
      lab: { scenario: 'lab346', states: {} },
      weak: { marked: {} }, saibaMais: { opened: {} }, recHistory: [], lastRoute: '#/inicio',
      lessons: {}, ui: { open: {} },
    };
  }

  /** Validação estrutural mínima e migração. Retorna {ok, state, errors} */
  function validate(obj) {
    const errors = [];
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['O arquivo não contém um objeto JSON.'] };
    if (obj.app !== 'redes-prova2') errors.push('O arquivo não é um progresso desta plataforma (campo "app" ausente ou diferente).');
    if (typeof obj.version !== 'number') errors.push('Versão do progresso ausente.');
    else if (obj.version > CONFIG.stateVersion) errors.push(`O progresso é de uma versão mais nova (${obj.version}) que esta plataforma (${CONFIG.stateVersion}).`);
    const must = { settings: 'object', topics: 'object', history: 'array', schedule: 'object' };
    for (const [k2, ty] of Object.entries(must)) {
      const v = obj[k2];
      if (ty === 'array' ? !Array.isArray(v) : (typeof v !== 'object' || v === null)) errors.push(`Campo "${k2}" ausente ou inválido.`);
    }
    if (errors.length) return { ok: false, errors };
    // mescla com o padrão para preencher campos novos (migração tolerante)
    const base = defaultState(obj.createdAt || Date.now());
    const st = { ...base, ...obj, settings: { ...base.settings, ...obj.settings }, study: { ...base.study, ...(obj.study || {}) }, flash: { ...base.flash, ...(obj.flash || {}) }, lab: { ...base.lab, ...(obj.lab || {}) }, weak: { ...base.weak, ...(obj.weak || {}) }, saibaMais: { ...base.saibaMais, ...(obj.saibaMais || {}) }, ui: { ...base.ui, ...(obj.ui || {}) } };
    for (const t of CONFIG.topics) st.topics[t.id] = { ...Adaptive.newTopicRecord(t.id), ...(obj.topics[t.id] || {}) };
    if (!Array.isArray(st.schedule.blocks) || !st.schedule.blocks.length) st.schedule = base.schedule;
    st.history = st.history.filter(h => h && typeof h === 'object' && h.topic).slice(-MAX_HISTORY);
    st.version = CONFIG.stateVersion;
    return { ok: true, state: st, errors: [] };
  }
  function summary(st) {
    return { createdAt: st.createdAt, updatedAt: st.updatedAt, attempts: st.history.length, exams: (st.exams || []).length, mode: st.settings.mode, blocksDone: st.schedule.blocks.filter(b => b.status === 'done').length };
  }

  /* ---- armazenamento com fallback em memória ---- */
  let memory = null; let storageOk = true;
  function read(storage) {
    try { const raw = storage.getItem(CONFIG.storageKey); if (!raw) return null; return JSON.parse(raw); }
    catch (e) { storageOk = false; return memory; }
  }
  function write(storage, st) {
    st.updatedAt = Date.now();
    const raw = JSON.stringify(st);
    memory = JSON.parse(raw);
    try { storage.setItem(CONFIG.storageKey, raw); storageOk = true; return true; }
    catch (e) { storageOk = false; return false; }
  }
  function backup(storage, st) { try { storage.setItem(CONFIG.storageKey + '-backup', JSON.stringify(st)); return true; } catch (e) { return false; } }
  function readBackup(storage) { try { const r = storage.getItem(CONFIG.storageKey + '-backup'); return r ? JSON.parse(r) : null; } catch (e) { return null; } }

  /* ---- registro de tentativas ---- */
  /** entry: {qid, sig, topic, difficulty, kind, result, hints, attempts, ms, wrongTags, source, fullVlsm, diagnostic} */
  function recordAttempt(st, entry, now = Date.now()) {
    const e = { ...entry, at: now };
    st.history.push(e); if (st.history.length > MAX_HISTORY) st.history.shift();
    if (e.sig && e.result !== 'unknown') st.solved[e.sig] = { result: e.result, at: now };
    st.topics[e.topic] = Adaptive.recordAttempt(st.topics[e.topic] || Adaptive.newTopicRecord(e.topic), { result: e.result, kind: e.kind, sig: e.sig, fullVlsm: e.fullVlsm, now, diagnostic: e.diagnostic });
    return st;
  }
  const solvedSet = (st, prefix = '') => new Set(Object.keys(st.solved).filter(s => s.startsWith(prefix)));
  function resetSolved(st, prefix = '') { for (const s of Object.keys(st.solved)) if (s.startsWith(prefix)) delete st.solved[s]; }

  return { defaultState, validate, summary, read, write, backup, readBackup, recordAttempt, solvedSet, resetSolved, isStorageOk: () => storageOk };
})();

/* ---------------- Cronograma ---------------- */
const Schedule = (() => {
  const initialBlocks = minutes => CONFIG.blocks.map((b, i) => ({ id: `b${i + 1}`, n: i + 1, title: b.title, goal: b.goal, topics: [...b.topics], kind: b.kind, minutes, status: 'todo', doneAt: null }));
  const current = st => st.schedule.blocks.find(b => b.status !== 'done') || null;
  function remainingMinutes(st) {
    const left = st.schedule.blocks.filter(b => b.status !== 'done' && b.kind !== 'break');
    const breaks = Math.max(0, left.length - 1) * st.settings.breakMinutes;
    return left.reduce((s, b) => s + b.minutes, 0) + breaks;
  }
  function totalPlanned(st) { const b = st.schedule.blocks.filter(x => x.kind !== 'break'); return b.reduce((s, x) => s + x.minutes, 0) + Math.max(0, b.length - 1) * st.settings.breakMinutes + 10; }
  /** Replaneja os blocos não concluídos para caber em `minutes`, preservando os concluídos. */
  function replan(st, minutes, ctx) {
    const done = st.schedule.blocks.filter(b => b.status === 'done');
    const plan = Adaptive.planRemaining({ ...ctx, examDone: (st.exams || []).length > 0 }, minutes).filter(p => p.kind !== 'break');
    const blocks = plan.map((p, i) => ({ id: `r${st.schedule.replans + 1}-${i + 1}`, n: done.length + i + 1, title: p.title, goal: p.kind === 'study' ? `Foco: ${p.topics.map(t => CONFIG.topics.find(x => x.id === t).name).join(', ')}` : p.kind === 'exam' ? 'Avaliar o que você resolve sozinho' : 'Revisar pontos fracos e a folha-resumo', topics: p.topics || [], kind: p.kind, minutes: p.minutes, status: 'todo', doneAt: null }));
    st.schedule.blocks = [...done, ...blocks];
    st.schedule.replans++;
    return st;
  }
  function complete(st, id, now = Date.now()) { const b = st.schedule.blocks.find(x => x.id === id); if (b) { b.status = 'done'; b.doneAt = now; } return st; }
  function reopen(st, id) { const b = st.schedule.blocks.find(x => x.id === id); if (b) { b.status = 'todo'; b.doneAt = null; } return st; }
  return { initialBlocks, current, remainingMinutes, totalPlanned, replan, complete, reopen };
})();

/* ---------------- Flashcards (Leitner de curto prazo) ---------------- */
const Flash = (() => {
  // caixas: 0 nova · 1 → 20 min · 2 → 60 min · 3 → 180 min · 4 → revisão final
  const INTERVAL = { 1: 20, 2: 60, 3: 180 };
  const FINAL = 4;
  function rate(card, rating, now = Date.now()) {
    const c = { box: 0, due: 0, seen: 0, lapses: 0, ...card };
    c.seen++; c.last = now; c.lastRating = rating;
    if (rating === 'again') { c.box = 1; c.lapses++; c.due = now + 5 * 60000; }
    else if (rating === 'hard') { c.box = Math.max(1, c.box); c.due = now + Math.round(INTERVAL[Math.min(c.box, 3)] * 0.5) * 60000; }
    else { c.box = Math.min(FINAL, c.box + 1); c.due = c.box >= FINAL ? Infinity : now + INTERVAL[c.box] * 60000; }
    if (c.due === Infinity) c.due = null; // null = aguarda a revisão final
    return c;
  }
  /** Fila: vencidos primeiro (mais atrasados antes), depois novos; filtros por assunto/errados. */
  function queue(cards, stateCards, { topic = 'all', onlyWrong = false, includeFinal = false, now = Date.now(), shuffle = null } = {}) {
    let list = cards.filter(c => topic === 'all' || c.topic === topic);
    if (onlyWrong) list = list.filter(c => (stateCards[c.id] || {}).lapses > 0 || (stateCards[c.id] || {}).lastRating === 'again');
    const due = [], fresh = [], finals = [];
    for (const c of list) {
      const s = stateCards[c.id];
      if (!s || !s.seen) fresh.push(c);
      else if (s.due === null) { if (includeFinal) finals.push(c); }
      else if (s.due <= now) due.push(c);
    }
    due.sort((a, b) => stateCards[a.id].due - stateCards[b.id].due);
    const out = [...due, ...(shuffle ? shuffle(fresh) : fresh), ...finals];
    return out;
  }
  function dueByTopic(cards, stateCards, now = Date.now()) {
    const m = {}; for (const c of cards) { const s = stateCards[c.id]; if (s && s.seen && s.due !== null && s.due <= now) m[c.topic] = (m[c.topic] || 0) + 1; } return m;
  }
  return { rate, queue, dueByTopic, INTERVAL };
})();

/* ---------------- Simulado ---------------- */
const Exam = (() => {
  /** Seleciona questões equilibradas por grupo e dificuldade, preferindo não vistas. */
  function build(bank, { size = 25, seen = new Set(), wrong = new Set(), rng = Math.random } = {}) {
    const groups = CONFIG.groups.map(g => g.id);
    const per = Math.floor(size / groups.length); let extra = size - per * groups.length;
    const out = [];
    const topicGroup = id => CONFIG.topics.find(t => t.id === id).group;
    for (const g of groups) {
      const pool = bank.filter(q => topicGroup(q.topic) === g);
      const score = q => (seen.has(q.id) ? (wrong.has(q.id) ? 1 : 2) : 0) + rng() * 0.9; // não vistas → erradas → acertadas
      const want = per + (extra-- > 0 ? 1 : 0);
      const diffs = ['basico', 'intermediario', 'avancado'];
      const target = { basico: Math.ceil(want * 0.4), intermediario: Math.ceil(want * 0.4), avancado: want };
      const chosen = [];
      for (const d of diffs) {
        const cand = pool.filter(q => q.difficulty === d && !chosen.includes(q)).sort((a, b) => score(a) - score(b));
        for (const q of cand) { if (chosen.length >= want || chosen.filter(x => x.difficulty === d).length >= target[d]) break; chosen.push(q); }
      }
      for (const q of pool.sort((a, b) => score(a) - score(b))) { if (chosen.length >= want) break; if (!chosen.includes(q)) chosen.push(q); }
      // cobrir tópicos distintos dentro do grupo quando possível
      out.push(...chosen);
    }
    return out.map(q => q.id);
  }
  function grade(bank, qids, answers) {
    const byId = Object.fromEntries(bank.map(q => [q.id, q]));
    const res = { total: qids.length, correct: 0, byTopic: {}, byGroup: {}, items: [] };
    for (const id of qids) {
      const q = byId[id]; const a = answers[id] || {};
      const r = Check.question(q, a);
      if (r.ok) res.correct++;
      const g = CONFIG.topics.find(t => t.id === q.topic).group;
      for (const [key, bucket] of [[q.topic, res.byTopic], [g, res.byGroup]]) { bucket[key] = bucket[key] || { total: 0, correct: 0 }; bucket[key].total++; if (r.ok) bucket[key].correct++; }
      res.items.push({ id, ok: r.ok, wrongKeys: r.wrongKeys, answered: Object.values(a).some(v => v !== '' && v !== undefined) });
    }
    return res;
  }
  return { build, grade };
})();

/* ---------------- Pontos fracos ---------------- */
const Weak = (() => {
  /** Agrupa por conceito (tag). status: 'ativo' | 'melhorando' (último registro do conceito foi acerto independente) */
  function analyze(history, marked = {}) {
    const m = {};
    for (const h of history) {
      const tags = h.result === 'incorrect' || h.result === 'assisted' ? (h.wrongTags || []) : (h.tagsAll || []);
      for (const t of new Set(tags)) {
        if (!CONFIG.errorTags[t]) continue;
        const e = (m[t] = m[t] || { tag: t, errors: 0, assisted: 0, correctAfter: 0, last: 0, lastResult: null, examples: [] });
        if (h.result === 'incorrect') e.errors++;
        else if (h.result === 'assisted') e.assisted++;
        else if (h.result === 'independent' && (e.errors || e.assisted)) e.correctAfter++;
        if (h.result !== 'independent' || e.errors || e.assisted) { e.last = Math.max(e.last, h.at); e.lastResult = h.result; }
        if (h.result !== 'independent' && e.examples.length < 3 && !e.examples.includes(h.qid)) e.examples.push(h.qid);
      }
    }
    const list = Object.values(m).filter(e => e.errors + e.assisted > 0 || marked[e.tag]);
    for (const e of list) {
      e.name = CONFIG.errorTags[e.tag].name; e.topic = CONFIG.errorTags[e.tag].topic; e.marked = !!marked[e.tag];
      e.status = e.lastResult === 'independent' ? 'melhorando' : 'ativo';
      e.weight = e.errors * 1 + e.assisted * 0.5 - e.correctAfter * 0.3 + (e.marked ? 0.5 : 0);
    }
    for (const t of Object.keys(marked)) if (marked[t] && !m[t] && CONFIG.errorTags[t]) list.push({ tag: t, name: CONFIG.errorTags[t].name, topic: CONFIG.errorTags[t].topic, errors: 0, assisted: 0, correctAfter: 0, examples: [], marked: true, status: 'marcado', weight: 0.5 });
    return list.sort((a, b) => b.weight - a.weight);
  }
  /** Hipóteses (não afirmações) a partir de padrões dos campos errados. */
  function hypotheses(e) {
    const H = {
      'rede-vs-broadcast': 'Talvez você esteja trocando o início do bloco (rede, bits de host = 0) com o fim (broadcast, bits de host = 1), ou esquecendo que o broadcast é um antes do próximo bloco.',
      'salto': 'Possível causa: aplicar o salto no octeto errado ou calcular 256 − máscara com o octeto errado.',
      'escolha-mascara': 'Possível causa: escolher o prefixo sem testar 2^h − 2 ≥ hosts, ou confundir bits de rede com bits de host.',
      'contagem-hosts': 'Possível causa: esquecer o −2 ou contar só os bits do último octeto.',
      'alinhamento': 'Possível causa: iniciar um bloco em endereço que não é múltiplo do seu tamanho.',
      'ordem-vlsm': 'Possível causa: alocar na ordem do enunciado em vez de maior → menor.',
      'access-vs-trunk': 'Possível causa: não diferenciar porta de PC (uma VLAN, sem tag) de enlace entre switches/roteador (várias VLANs, com tag).',
      'root-bridge': 'Possível causa: comparar MAC antes da prioridade ou escolher o maior valor.',
      'papeis-porta': 'Possível causa: confundir Root Port (rumo à raiz, por switch) com Designated Port (por segmento).',
      'ios-sintaxe': 'Possível causa: comando certo no modo errado (ex.: "vlan 10" fora do modo de configuração).',
    };
    return H[e.tag] || 'Não é possível determinar a causa exata a partir das respostas; revise o conceito e tente um exercício semelhante.';
  }
  return { analyze, hypotheses };
})();
