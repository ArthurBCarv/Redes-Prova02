/* ==========================================================================
   Páginas: Aprender (lista e módulo com as 10 etapas)
   ========================================================================== */
const STEP_DEFS = [['objetivo', 'Objetivo'], ['intuicao', 'Intuição'], ['tecnica', 'Explicação técnica'], ['visual', 'Representação visual'], ['exemplo', 'Exemplo resolvido'], ['guiada', 'Resolução guiada'], ['pratica', 'Prática independente'], ['erros', 'Erros comuns'], ['verificacao', 'Verificação'], ['saiba-mais', 'Saiba mais']];

Pages.aprender = () => {
  const st = App.st;
  return h('div', { class: 'content' }, pageHead('Aprender', 'Cinco módulos com o mesmo roteiro: objetivo → intuição → técnica → visual → exemplo resolvido → resolução guiada → prática independente → erros comuns → verificação → saiba mais (opcional).'),
    h('div', { class: 'grid cols-2' }, Content.modules.map(m => {
      const seen = Object.keys((st.lessons[m.id] || {}).seen || {}).length;
      const ts = m.topics.map(id => st.topics[id]);
      const mastered = ts.filter(t => t.status === 'mastered').length;
      return h('a', { class: 'card stack', href: `#/aprender/${m.id}`, style: { textDecoration: 'none', color: 'inherit' } },
        h('div', { class: 'row between' }, h('span', { class: 'card-kicker' }, `Módulo ${m.n} · ~${m.minutes} min`), m.complement ? h('span', { class: 'badge comp' }, 'Complemento') : h('span', { class: 'badge prof' }, 'Material do professor')),
        h('h2', { style: { margin: 0 } }, m.title),
        h('p', { class: 'small', style: { margin: 0 } }, m.objectives[0]),
        h('div', { class: 'small muted' }, `${seen}/9 etapas vistas · ${mastered}/${m.topics.length} tópicos no critério de domínio`),
        h('div', { class: 'progress' }, h('span', { style: { width: pct(seen / 9) } })));
    })));
};

Pages.modulo = (id, anchor) => {
  const m = Content.byId[id];
  if (!m) return Pages.notFound();
  const st = App.st;
  st.lessons[id] = st.lessons[id] || { seen: {} };
  App.routeTopic = m.topics[0];
  const sec = (sid, num, title, ...body) => h('section', { class: 'section', id: `s-${sid}`, 'data-step': sid }, h('div', { class: 'section-head' }, h('span', { class: 'section-num' }, String(num)), h('h2', {}, title)), ...body);

  // prática independente: sequência de questões do módulo
  const practiceBox = h('div', { class: 'stack' });
  let pi = 0;
  function nextPractice() {
    const items = m.practice;
    const spec = items[pi % items.length]; pi++;
    let q;
    if (spec.gen) q = Gen.make(spec.gen, spec.difficulty || 'basico', Date.now() + pi, Store.solvedSet(st, ''));
    else q = Bank.byId[spec.bank];
    practiceBox.innerHTML = '';
    practiceBox.append(h('div', { class: 'small muted' }, `Questão ${pi} da prática · sem dicas (para medir o que você resolve sozinho)`), QuestionView(q, { context: 'module', noHints: true, onNext: nextPractice }));
  }
  nextPractice();

  const verify = h('div', { class: 'stack' });
  function renderVerify() {
    verify.innerHTML = '';
    for (const tid of m.topics) {
      const r = st.topics[tid]; const crit = Adaptive.masteryCriteria(r); const mm = Adaptive.mastery(r);
      verify.append(h('div', { class: 'card tight stack' }, h('div', { class: 'row between' }, h('strong', {}, topicName(tid)), h('span', { class: `badge ${r.status === 'mastered' ? 'ok' : r.status === 'new' ? '' : 'primary'}` }, { new: 'sem dados', learning: 'aprendendo', practicing: 'praticando', mastered: 'domínio provisório' }[r.status])),
        h('div', { class: 'progress' }, h('span', { style: { width: pct(mm) } })), h('div', { class: 'small muted' }, `Domínio estimado ${pct(mm)} · ${crit.detail}`),
        h('div', { class: 'row' }, h('a', { class: 'btn sm', href: `#/praticar/${tid}` }, 'Praticar este tópico'))));
    }
    const weakest = m.topics.map(t => st.topics[t]).filter(r => r.status !== 'mastered').sort((a, b) => Adaptive.mastery(a) - Adaptive.mastery(b))[0];
    verify.append(weakest ? h('div', { class: 'note' }, h('strong', {}, 'Próximo passo sugerido: '), `praticar "${topicName(weakest.topicId)}", o tópico com menor domínio estimado neste módulo. `, h('a', { href: `#/praticar/${weakest.topicId}` }, 'Ir para a prática')) : h('div', { class: 'note ok' }, 'Todos os tópicos deste módulo atingiram o critério provisório. Siga para o próximo módulo ou faça um simulado.'));
  }
  renderVerify();

  const next = Content.modules[m.n] || null;
  const page = h('div', { class: 'content narrow' },
    pageHead(`${m.n}. ${m.title}`, null, h('span', {}, h('a', { href: '#/aprender' }, 'Aprender'), ' / ', m.title)),
    h('div', { class: 'row small', style: { marginTop: '-12px', marginBottom: '16px' } }, ...m.sources.map(s => h('span', { class: `badge ${m.complement ? 'comp' : 'prof'}` }, s))),
    h('nav', { class: 'steps-nav', 'aria-label': 'Etapas do módulo' }, STEP_DEFS.map(([sid, t], i) => h('a', { href: `#/aprender/${id}/${sid}`, onclick: e => { e.preventDefault(); history.replaceState(null, '', `#/aprender/${id}/${sid}`); $(`#s-${sid}`).scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, `${i + 1}. ${t}`))),
    sec('objetivo', 1, 'Objetivo — ao final você conseguirá', h('ul', {}, m.objectives.map(o => h('li', {}, o)))),
    sec('intuicao', 2, 'Intuição', richContent(m.intuition)),
    sec('tecnica', 3, 'Explicação técnica', richContent(m.technical)),
    sec('visual', 4, 'Representação visual', richContent(m.visual)),
    sec('exemplo', 5, 'Exemplo resolvido', h('div', { class: 'card stack' }, h('h3', { html: m.worked.title }), h('div', { class: 'worked' }, m.worked.steps.map(([d, w]) => h('div', { class: 'st' }, h('div', {}, h('div', { html: d }), h('div', { class: 'why' }, 'Por quê: ', w))))))),
    sec('guiada', 6, 'Resolução guiada', h('p', { class: 'small muted' }, 'Resolva passo a passo; cada passo é conferido antes do próximo. Conta como prática assistida.'), GuidedView(m.guided, m.topics[0]), m.guided2 ? GuidedView(m.guided2, 'vlsm') : null),
    sec('pratica', 7, 'Prática independente', practiceBox),
    sec('erros', 8, 'Erros comuns e como conferir', h('div', { class: 'card stack' }, h('ul', {}, m.pitfalls.map(p => h('li', {}, p))), h('div', { class: 'note ok', style: { margin: 0 } }, h('strong', {}, 'Conferência: '), m.check))),
    sec('verificacao', 9, 'Verificação do seu desempenho', verify),
    sec('saiba-mais', 10, 'Saiba mais (opcional)', h('p', { class: 'small muted' }, 'Aprofundamentos para quando bater a curiosidade. Não são obrigatórios e não contam como domínio.'), ...m.smList.map(sid => saibaMaisBlock(sid))),
    h('div', { class: 'row between', style: { marginTop: '32px' } }, h('a', { class: 'btn ghost', href: '#/aprender' }, 'Todos os módulos'), next ? h('a', { class: 'btn primary', href: `#/aprender/${next.id}` }, `Próximo: ${next.title}`, icon('arrow')) : h('a', { class: 'btn primary', href: '#/simulado' }, 'Ir para o simulado', icon('arrow'))));

  // marca etapas vistas (visualização ≠ domínio)
  setTimeout(() => {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { const sid = e.target.dataset.step; if (sid !== 'saiba-mais' && !st.lessons[id].seen[sid]) { st.lessons[id].seen[sid] = Date.now(); App.save(); } }
    }, { threshold: 0.35 }) : null;
    if (io) $$('[data-step]', page).forEach(s => io.observe(s));
    App.cleanup.push(() => io && io.disconnect());
    const target = anchor && (page.querySelector(`#s-${anchor}`) || (/^[\w-]+$/.test(anchor) ? page.querySelector('#' + anchor) : null));
    if (target) target.scrollIntoView({ block: 'start' });
  }, 30);
  return page;
};
