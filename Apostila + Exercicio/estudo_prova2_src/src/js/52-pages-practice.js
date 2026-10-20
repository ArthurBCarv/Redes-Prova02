/* ==========================================================================
   Páginas: Praticar (geradores + banco, memória de resolvidas) e Flashcards
   ========================================================================== */
const PracticeMem = { rr: {}, count: {} };

function topicSigs(st, topic) { return new Set(st.history.filter(x => x.topic === topic && x.sig && x.context !== 'diagnostic').map(x => x.sig)); }

/** Escolhe a próxima questão do tópico evitando as já resolvidas. Retorna {q, note} */
function pickQuestion(topic, difficulty) {
  const st = App.st;
  const solved = new Set(Object.keys(st.solved));
  const gens = Gen.byTopic[topic] || [];
  const bank = Bank.exam.filter(q => q.topic === topic);
  const n = (PracticeMem.count[topic] = (PracticeMem.count[topic] || 0) + 1);
  const bankFresh = bank.filter(q => !solved.has(q.sig));
  const useBank = !gens.length || (bankFresh.length && n % 3 === 0);
  if (useBank) {
    const byPref = [...bank].sort((a, b) => {
      const ra = st.solved[a.sig], rb = st.solved[b.sig];
      const rank = r => !r ? 0 : r.result === 'incorrect' ? 1 : r.result === 'assisted' ? 2 : 3;
      return rank(ra) - rank(rb) || (a.difficulty === difficulty ? -1 : 0) - (b.difficulty === difficulty ? -1 : 0) || ((ra && ra.at) || 0) - ((rb && rb.at) || 0);
    });
    const q = byPref[0];
    if (q) {
      const allDone = bank.every(x => st.solved[x.sig] && st.solved[x.sig].result === 'independent');
      return { q, note: allDone ? `Você já resolveu sozinho todas as ${bank.length} questões fixas deste tópico; esta é a mais antiga. Use "Resetar resolvidas" para recomeçar.` : null };
    }
  }
  const idx = (PracticeMem.rr[topic] = ((PracticeMem.rr[topic] ?? -1) + 1) % gens.length);
  const q = Gen.make(gens[idx], difficulty, Date.now() ^ (n * 2654435761), solved);
  return { q, note: solved.has(q.sig) ? 'Não encontramos uma variação inédita desta vez; esta já apareceu antes.' : null };
}

Pages.praticar = () => {
  const st = App.st;
  const due = Flash.dueByTopic(Cards.cards, st.flash.cards);
  return h('div', { class: 'content' }, pageHead('Praticar', 'Exercícios gerados e questões fixas com correção explicada. O sistema lembra o que você já resolveu e evita repetir; você pode resetar por tópico.'),
    h('div', { class: 'grid cols-2', style: { marginBottom: '24px' } },
      h('a', { class: 'card stack', href: '#/praticar/misto', style: { textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'card-kicker' }, 'Recomendado depois da 1ª passada'), h('h3', { style: { margin: 0 } }, 'Treino intercalado'), h('p', { class: 'small', style: { margin: 0 } }, 'Mistura os tópicos com maior prioridade para você. Alternar assuntos fortalece a escolha do método certo — como na prova.')),
      h('a', { class: 'card stack', href: '#/flashcards', style: { textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'card-kicker' }, 'Revisão espaçada'), h('h3', { style: { margin: 0 } }, `Flashcards (${Cards.cards.length})`), h('p', { class: 'small', style: { margin: 0 } }, `${Object.values(due).reduce((a, b) => a + b, 0)} vencidos agora. Intervalos de 20 min → 60 min → 180 min → revisão final.`))),
    ...CONFIG.groups.map(g => h('section', { style: { marginBottom: '24px' } }, h('h2', {}, g.name), h('div', { class: 'grid cols-3' }, CONFIG.topics.filter(t => t.group === g.id).map(t => {
      const r = st.topics[t.id]; const sigs = topicSigs(st, t.id);
      const bank = Bank.exam.filter(q => q.topic === t.id);
      return h('a', { class: 'card tight stack', href: `#/praticar/${t.id}`, style: { textDecoration: 'none', color: 'inherit' } }, h('strong', {}, t.name),
        h('div', { class: 'progress' }, h('span', { style: { width: pct(Adaptive.mastery(r)) } })),
        h('div', { class: 'tiny muted' }, `${sigs.size} resolvida(s) · banco ${bank.filter(q => st.solved[q.sig]).length}/${bank.length}${(Gen.byTopic[t.id] || []).length ? ' · + geradas ∞' : ''}${due[t.id] ? ` · ${due[t.id]} flashcards vencidos` : ''}`));
    })))));
};

Pages.praticarTopico = (topic, difficulty) => {
  const st = App.st;
  const mixed = topic === 'misto';
  if (!mixed && !CONFIG.topics.find(t => t.id === topic)) return Pages.notFound();
  let diff = ['basico', 'intermediario', 'avancado'].includes(difficulty) ? difficulty : (st.topics[topic] && st.topics[topic].masteryScore >= 0.75 ? 'avancado' : st.topics[topic] && st.topics[topic].masteryScore >= 0.5 ? 'intermediario' : 'basico');
  App.routeTopic = mixed ? null : topic;
  const qBox = h('div', { class: 'stack' }); const counter = h('div', { class: 'small muted' });
  let session = { n: 0, ind: 0, ass: 0, inc: 0 };
  function pickMixed() {
    const rows = Adaptive.scoreAll(App.ctx()).filter(r => !r.blockedBy.length && !r.masteredNoReview).sort((a, b) => b.score - a.score).slice(0, 4);
    const pool = rows.length ? rows : Adaptive.scoreAll(App.ctx());
    const r = pool[Math.floor(Math.random() * pool.length)];
    const d = r.mastery >= 0.75 ? 'avancado' : r.mastery >= 0.5 ? 'intermediario' : 'basico';
    App.routeTopic = r.topicId;
    return { ...pickQuestion(r.topicId, d), why: `Tópico sorteado entre os 4 de maior prioridade para você: ${pool.map(x => x.name).join(', ')}.` };
  }
  function updateCounter() {
    const sigs = mixed ? null : topicSigs(st, topic);
    counter.textContent = `Nesta sessão: ${session.n} respondida(s) · ${session.ind} sozinho · ${session.ass} com ajuda · ${session.inc} erradas${sigs ? ` — no total, ${sigs.size} questões distintas resolvidas neste tópico` : ''}.`;
  }
  function next() {
    const { q, note, why } = mixed ? pickMixed() : pickQuestion(topic, diff);
    qBox.innerHTML = '';
    if (why) qBox.append(h('div', { class: 'small muted' }, why));
    if (note) qBox.append(h('div', { class: 'note' }, note));
    qBox.append(QuestionView(q, { context: 'practice', onNext: next, onDone: r => { session.n++; session[r === 'independent' ? 'ind' : r === 'assisted' ? 'ass' : 'inc']++; updateCounter(); } }));
    updateCounter();
    const first = $('input', qBox); if (first) first.focus({ preventScroll: true });
  }
  const tabs = mixed ? null : h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Dificuldade' }, ['basico', 'intermediario', 'avancado'].map(d => h('button', { role: 'tab', 'aria-selected': String(d === diff), onclick: e => { diff = d; $$('button', tabs).forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget))); history.replaceState(null, '', `#/praticar/${topic}/${d}`); next(); } }, DIFF_LABEL[d])));
  const t = CONFIG.topics.find(x => x.id === topic);
  const resetBtn = mixed ? null : h('button', { class: 'btn sm ghost', onclick: async () => {
    if (!await confirmDialog({ title: `Resetar as resolvidas de "${t.name}"?`, body: 'As questões deste tópico voltam a ser sorteadas como inéditas. Seu histórico de desempenho e o domínio estimado NÃO são apagados.', ok: 'Resetar', danger: true })) return;
    for (const s of topicSigs(st, topic)) delete st.solved[s];
    App.save(); toast('Lista de resolvidas deste tópico zerada.'); next();
  } }, icon('reset'), 'Resetar resolvidas');
  const learnLink = t ? h('a', { class: 'btn sm ghost', href: `#/aprender/${t.module}/${t.section}` }, icon('learn'), 'Rever a explicação') : null;
  const page = h('div', { class: 'content narrow' },
    pageHead(mixed ? 'Treino intercalado' : `Praticar: ${t.name}`, mixed ? 'Questões de vários tópicos, escolhidos pela prioridade adaptativa.' : 'Use as dicas só quando travar: acerto sem dica e na 1ª tentativa conta como independente.', h('span', {}, h('a', { href: '#/praticar' }, 'Praticar'), ' / ', mixed ? 'Intercalado' : t.name)),
    tabs, h('div', { class: 'row between', style: { marginBottom: '12px' } }, counter, h('div', { class: 'row' }, learnLink, resetBtn)), qBox);
  next();
  return page;
};

Pages.flashcards = topicFilter => {
  const st = App.st;
  const opts = { topic: topicFilter && CONFIG.topics.find(t => t.id === topicFilter) ? topicFilter : st.flash.filter || 'all', onlyWrong: false, shuffle: false, includeFinal: false };
  const root = h('div', { class: 'content narrow' });
  let queue = [], i = 0, revealed = false;
  const rng = makeRng(Date.now() & 0xffffffff);
  function build() { queue = Flash.queue(Cards.cards, st.flash.cards, { ...opts, shuffle: opts.shuffle ? rng.shuffle : null }); if (st.flash.lastId) { const k = queue.findIndex(c => c.id === st.flash.lastId); i = k >= 0 ? k : 0; } else i = 0; revealed = false; }
  function render() {
    root.innerHTML = '';
    const boxes = [0, 1, 2, 3, 4].map(b => Cards.cards.filter(c => (st.flash.cards[c.id] ? (st.flash.cards[c.id].box || 0) : 0) === b).length);
    const sel = h('select', { class: 'input', style: { width: 'auto' }, 'aria-label': 'Assunto', onchange: e => { opts.topic = e.target.value; st.flash.filter = opts.topic; st.flash.lastId = null; App.save(); build(); render(); } }, h('option', { value: 'all' }, 'Todos os assuntos'), CONFIG.topics.map(t => h('option', { value: t.id, selected: opts.topic === t.id }, t.name)));
    const chk = (label, key) => h('label', { class: 'row small' }, h('input', { type: 'checkbox', checked: opts[key], onchange: e => { opts[key] = e.target.checked; st.flash.lastId = null; build(); render(); } }), label);
    root.append(pageHead('Flashcards', 'Tente lembrar a resposta antes de revelar — a recordação ativa é o que fixa. Avalie com honestidade.', h('span', {}, h('a', { href: '#/praticar' }, 'Praticar'), ' / Flashcards')),
      h('div', { class: 'row', style: { marginBottom: '12px' } }, sel, chk('Só os que errei', 'onlyWrong'), chk('Embaralhar novos', 'shuffle'), chk('Incluir os da revisão final', 'includeFinal')),
      h('div', { class: 'row small muted', style: { marginBottom: '12px' } }, `Novos ${boxes[0]} · caixa 20 min ${boxes[1]} · 60 min ${boxes[2]} · 180 min ${boxes[3]} · revisão final ${boxes[4]}`));
    const c = queue[i];
    if (!c) {
      root.append(h('div', { class: 'card stack' }, h('h2', {}, 'Nada vencido agora'), h('p', {}, 'Você revisou tudo o que estava pendente neste filtro. Os próximos cartões vencem conforme os intervalos. Volte mais tarde ou marque "Incluir os da revisão final".'), h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/inicio' }, 'Voltar ao início'))));
      return;
    }
    st.flash.lastId = c.id; App.save();
    const cardEl = h('div', { class: 'card flash', 'aria-live': 'polite' }, h('div', { class: 'stack' }, h('span', { class: 'badge primary', style: { justifySelf: 'center' } }, topicName(c.topic)), h('div', {}, c.front), revealed ? h('div', { class: 'back' }, c.back) : null));
    const rate = r => { st.flash.cards[c.id] = Flash.rate(st.flash.cards[c.id], r); App.save(); updateNavCounts(); queue.splice(i, 1); if (r === 'again') queue.splice(Math.min(i + 4, queue.length), 0, c); revealed = false; if (i >= queue.length) i = 0; render(); };
    root.append(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, `Cartão ${i + 1} de ${queue.length} na fila`), cardEl,
      h('div', { class: 'row', style: { marginTop: '16px', justifyContent: 'center' } }, revealed ? [h('button', { class: 'btn danger', onclick: () => rate('again') }, 'Errei'), h('button', { class: 'btn', onclick: () => rate('hard') }, 'Acertei com dificuldade'), h('button', { class: 'btn primary', onclick: () => rate('good') }, 'Acertei sozinho')] : h('button', { class: 'btn primary', onclick: () => { revealed = true; render(); } }, 'Revelar resposta'), h('button', { class: 'btn ghost', onclick: () => { i = (i + 1) % queue.length; revealed = false; render(); } }, 'Pular')),
      h('div', { class: 'row', style: { marginTop: '24px' } }, h('button', { class: 'btn sm ghost', onclick: async () => { if (await confirmDialog({ title: 'Resetar todos os flashcards?', body: 'Todos os cartões voltam para "novos".', ok: 'Resetar', danger: true })) { st.flash.cards = {}; st.flash.lastId = null; App.save(); build(); render(); updateNavCounts(); } } }, icon('reset'), 'Resetar flashcards')));
  }
  build(); render();
  return root;
};
