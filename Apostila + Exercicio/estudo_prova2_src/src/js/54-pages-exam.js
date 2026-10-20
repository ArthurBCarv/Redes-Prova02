/* ==========================================================================
   Página: Simulado (correção só ao final)
   ========================================================================== */
function fieldsForm(q, values, onChange) {
  const box = h('div', { class: 'stack' });
  q.fields.forEach((f, i) => {
    const id = `ex-${q.id}-${f.key}`;
    if (f.type === 'choice') {
      const g = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': f.label });
      f.options.forEach((o, j) => { const inp = h('input', { type: 'radio', name: id, checked: String(values[f.key]) === String(j), onchange: () => { values[f.key] = String(j); $$('.choice', g).forEach(c => c.classList.toggle('sel', c.contains(inp))); onChange(); } }); g.append(h('label', { class: `choice ${String(values[f.key]) === String(j) ? 'sel' : ''}` }, inp, h('span', { html: o }))); });
      box.append(h('div', { class: 'field' }, q.fields.length > 1 ? h('span', { class: 'lbl' }, f.label) : null, g));
    } else box.append(h('div', { class: 'field' }, h('label', { for: id }, f.label), h('input', { class: 'input', id, value: values[f.key] || '', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', oninput: e => { values[f.key] = e.target.value; onChange(); } })));
    void i;
  });
  return box;
}

Pages.simulado = () => {
  const st = App.st;
  const root = h('div', { class: 'content narrow' });
  let timerInt = null;
  App.cleanup.push(() => clearInterval(timerInt));
  function start(mode, timed) {
    const seen = new Set(st.exams.flatMap(e => e.qids));
    const wrong = new Set(st.exams.flatMap(e => e.items.filter(x => !x.ok).map(x => x.id)));
    const size = mode === 'emergency' ? 10 : 25;
    const qids = Exam.build(Bank.exam, { size, seen, wrong });
    st.examDraft = { id: `ex${Date.now()}`, mode, qids, answers: {}, flags: {}, startedAt: Date.now(), timed, limitMin: mode === 'emergency' ? 25 : 50, cur: 0 };
    App.save(true); render();
  }
  async function finish(auto = false) {
    const d = st.examDraft;
    const unanswered = d.qids.filter(id => !Object.values(d.answers[id] || {}).some(v => v !== '' && v !== undefined)).length;
    if (!auto && !await confirmDialog({ title: 'Finalizar o simulado?', body: unanswered ? `${unanswered} questão(ões) sem resposta contarão como erradas.` : 'Depois de finalizar, as respostas não podem mais ser alteradas.', ok: 'Finalizar e corrigir' })) return;
    clearInterval(timerInt);
    const g = Exam.grade(Bank.exam, d.qids, d.answers);
    const rec = { id: d.id, at: Date.now(), mode: d.mode, qids: d.qids, answers: d.answers, flags: d.flags, total: g.total, correct: g.correct, byGroup: g.byGroup, byTopic: g.byTopic, items: g.items, durationMs: Date.now() - d.startedAt, auto };
    for (const it of g.items) { const q = Bank.byId[it.id]; App.record(q, it.ok ? 'independent' : 'incorrect', { wrongKeys: it.ok ? [] : (it.wrongKeys.length ? it.wrongKeys : q.fields.map(f => f.key)), context: 'exam' }); }
    st.exams.push(rec); st.examDraft = null; App.save(true);
    location.hash = `#/simulado/resultado/${rec.id}`;
  }
  function render() {
    root.innerHTML = '';
    const d = st.examDraft;
    if (!d) {
      const timed = h('input', { type: 'checkbox', checked: st.settings.examTimer, onchange: e => { st.settings.examTimer = e.target.checked; App.save(); } });
      root.append(pageHead('Simulado', 'Questões da lista do professor e variações equivalentes, equilibradas entre os 5 módulos e as dificuldades. Sem dicas; a correção aparece só ao finalizar. Cada novo simulado prioriza questões que você ainda não viu.'),
        h('div', { class: 'grid cols-2' },
          h('div', { class: 'card stack' }, h('h2', {}, 'Simulado completo'), h('p', { class: 'small', style: { margin: 0 } }, '25 questões · 5 por módulo · tempo sugerido 50 min.'), h('button', { class: 'btn primary', onclick: () => start('full', st.settings.examTimer) }, 'Começar')),
          h('div', { class: 'card stack' }, h('h2', {}, 'Simulado de emergência'), h('p', { class: 'small', style: { margin: 0 } }, '10 questões · 2 por módulo (cobertura preservada) · 25 min.'), h('button', { class: 'btn', onclick: () => start('emergency', st.settings.examTimer) }, 'Começar versão reduzida'))),
        h('label', { class: 'row', style: { marginTop: '16px' } }, timed, 'Mostrar cronômetro (o tempo é só uma referência; ao estourar, o simulado é finalizado automaticamente)'),
        st.exams.length ? h('section', { class: 'card stack', style: { marginTop: '24px' } }, h('h3', {}, 'Histórico'), h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Data'), h('th', {}, 'Tipo'), h('th', {}, 'Acertos'), h('th', {}, 'Duração'), h('th', {}, ''))), h('tbody', {}, [...st.exams].reverse().map(e => h('tr', {}, h('td', {}, new Date(e.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })), h('td', {}, e.mode === 'emergency' ? 'Emergência' : 'Completo'), h('td', {}, `${e.correct}/${e.total} (${pct(e.correct / e.total)})`), h('td', {}, fmtMin(e.durationMs)), h('td', {}, h('a', { href: `#/simulado/resultado/${e.id}` }, 'Ver')))))))) : null);
      return;
    }
    const q = Bank.byId[d.qids[d.cur]];
    const values = d.answers[q.id] = d.answers[q.id] || {};
    const answered = id => Object.values(d.answers[id] || {}).some(v => v !== '' && v !== undefined);
    const nav = h('div', { class: 'sim-steps', role: 'navigation', 'aria-label': 'Questões' }, d.qids.map((id, i) => h('button', { 'aria-label': `Questão ${i + 1}${answered(id) ? ', respondida' : ''}${d.flags[id] ? ', marcada como dúvida' : ''}`, class: answered(id) ? 'done' : '', 'aria-current': i === d.cur ? 'step' : null, style: d.flags[id] ? { boxShadow: '0 0 0 2px var(--accent)' } : null, onclick: () => { d.cur = i; App.save(); render(); } }, String(i + 1))));
    const timerEl = h('span', { class: 'badge', 'aria-live': 'off' });
    const tick = () => { const left = d.limitMin * 60000 - (Date.now() - d.startedAt); if (left <= 0) { timerEl.textContent = 'Tempo esgotado'; toast('Tempo esgotado: simulado finalizado automaticamente.'); finish(true); return; } timerEl.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')} restantes`; };
    clearInterval(timerInt); if (d.timed) { tick(); timerInt = setInterval(tick, 1000); }
    root.append(pageHead(d.mode === 'emergency' ? 'Simulado de emergência' : 'Simulado', `Questão ${d.cur + 1} de ${d.qids.length}. Você pode navegar e mudar respostas até finalizar.`),
      h('div', { class: 'row between', style: { marginBottom: '12px' } }, nav, d.timed ? timerEl : null),
      h('div', { class: 'card stack' }, h('div', { class: 'q-meta' }, h('span', { class: 'badge primary' }, topicName(q.topic)), h('span', { class: 'badge' }, DIFF_LABEL[q.difficulty]), q.source === 'prof' ? h('span', { class: 'badge prof' }, q.ref) : null), h('div', { class: 'q-prompt', html: q.prompt }), fieldsForm(q, values, () => { App.save(); $$('.sim-steps button', root)[d.cur].classList.toggle('done', answered(q.id)); }),
        h('label', { class: 'row small' }, h('input', { type: 'checkbox', checked: !!d.flags[q.id], onchange: e => { d.flags[q.id] = e.target.checked; App.save(); render(); } }), 'Marcar como dúvida')),
      h('div', { class: 'row between', style: { marginTop: '16px' } }, h('div', { class: 'row' }, h('button', { class: 'btn', disabled: d.cur === 0, onclick: () => { d.cur--; App.save(); render(); } }, icon('prev'), 'Anterior'), h('button', { class: 'btn', disabled: d.cur === d.qids.length - 1, onclick: () => { d.cur++; App.save(); render(); } }, 'Próxima', icon('next'))),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', onclick: async () => { if (await confirmDialog({ title: 'Descartar este simulado?', body: 'As respostas deste simulado serão perdidas e nada será registrado.', ok: 'Descartar', danger: true })) { st.examDraft = null; App.save(); clearInterval(timerInt); render(); } } }, 'Descartar'), h('button', { class: 'btn primary', onclick: () => finish(false) }, 'Finalizar e corrigir'))));
  }
  render();
  return root;
};

Pages.simuladoResultado = id => {
  const e = App.st.exams.find(x => x.id === id); if (!e) return Pages.notFound();
  const wrong = e.items.filter(x => !x.ok);
  const reviewBox = h('div', { class: 'stack' });
  return h('div', { class: 'content narrow' }, pageHead('Resultado do simulado', `${new Date(e.at).toLocaleString('pt-BR')} · ${e.mode === 'emergency' ? 'versão de emergência' : 'completo'} · ${fmtMin(e.durationMs)}${e.auto ? ' · finalizado pelo tempo' : ''}`, h('span', {}, h('a', { href: '#/simulado' }, 'Simulado'), ' / Resultado')),
    h('div', { class: 'grid cols-3' }, h('div', { class: 'card tight stat' }, h('span', { class: 'l' }, 'Acertos'), h('span', { class: 'v' }, `${e.correct}/${e.total}`), h('span', { class: 'l' }, pct(e.correct / e.total))), h('div', { class: 'card tight stat' }, h('span', { class: 'l' }, 'Erradas'), h('span', { class: 'v' }, String(wrong.length)), h('span', { class: 'l' }, 'viraram pontos fracos')), h('div', { class: 'card tight stat' }, h('span', { class: 'l' }, 'Em branco'), h('span', { class: 'v' }, String(e.items.filter(x => !x.answered).length)), h('span', { class: 'l' }, 'contadas como erradas'))),
    h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('h3', {}, 'Por módulo'), ...CONFIG.groups.filter(g => e.byGroup[g.id]).map(g => { const b = e.byGroup[g.id]; return h('div', { class: 'stack' }, h('div', { class: 'row between small' }, h('span', {}, g.name), h('span', { class: 'muted' }, `${b.correct}/${b.total}`)), h('div', { class: `progress ${b.correct === b.total ? 'ok' : ''}` }, h('span', { style: { width: pct(b.correct / b.total) } }))); }),
      h('h3', { style: { marginTop: '16px' } }, 'Por tópico'), h('div', { class: 'row' }, ...Object.entries(e.byTopic).map(([t, b]) => h('span', { class: `badge ${b.correct === b.total ? 'ok' : b.correct === 0 ? 'bad' : ''}` }, `${topicName(t)}: ${b.correct}/${b.total}`)))),
    h('div', { class: 'row', style: { margin: '16px 0' } }, wrong.length ? h('button', { class: 'btn primary', onclick: () => { reviewBox.innerHTML = ''; for (const it of wrong) { const q = Bank.byId[it.id]; reviewBox.append(h('div', { class: 'card stack' }, h('div', { class: 'q-prompt', html: q.prompt }), h('div', { class: 'small muted' }, 'Sua resposta: ', q.fields.map(f => { const v = (e.answers[q.id] || {})[f.key]; return `${f.label}: ${v === undefined || v === '' ? '(em branco)' : f.type === 'choice' ? f.options[v] : v}`; }).join(' · ')), Feedback(q, 'incorrect', Check.question(q, e.answers[q.id] || {}), false))); } } }, `Revisar os ${wrong.length} erros`) : h('div', { class: 'note ok' }, 'Nenhum erro. Excelente!'), h('a', { class: 'btn', href: '#/fracos' }, 'Meus pontos fracos'), h('a', { class: 'btn ghost', href: '#/simulado' }, 'Novo simulado com questões diferentes')),
    reviewBox);
};
