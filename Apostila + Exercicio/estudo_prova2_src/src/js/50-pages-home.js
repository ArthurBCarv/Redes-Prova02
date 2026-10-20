/* ==========================================================================
   Páginas: boas-vindas, Início (dashboard adaptativo), Plano, Diagnóstico
   ========================================================================== */
const Pages = {};
const pageHead = (title, sub, crumbs) => h('div', { class: 'page-head' }, crumbs ? h('div', { class: 'crumbs' }, crumbs) : null, h('h1', {}, title), sub ? h('p', {}, sub) : null);

function daysToExam() {
  const exam = new Date(`${CONFIG.examDate}T08:00:00`); const now = new Date();
  const d = Math.ceil((exam - now) / 86400000);
  return d;
}

/** Link + rótulo para uma recomendação */
function recTarget(rec) {
  if (rec.kind === 'exam' || rec.type === 'exam') return { href: '#/simulado', label: 'Fazer o simulado' };
  if (rec.type === 'final') return { href: '#/fracos', label: 'Revisar pontos fracos' };
  const t = CONFIG.topics.find(x => x.id === rec.topicId);
  if (rec.type === 'learn') return { href: `#/aprender/${t.module}/${t.section}`, label: `Estudar: ${t.name}` };
  if (rec.type === 'review') return { href: `#/flashcards/${t.id}`, label: `Revisar flashcards: ${t.name}` };
  return { href: `#/praticar/${t.id}/${rec.difficulty}`, label: `Praticar: ${t.name} (${DIFF_LABEL[rec.difficulty]})` };
}

function RecommendationCard() {
  const ctx = App.ctx();
  const rec = Adaptive.recommend(ctx);
  const ex = Adaptive.explain(rec);
  const tgt = recTarget(rec);
  const why = h('div', { class: 'why-panel', hidden: true, id: 'why-panel' });
  const whyBtn = h('button', { class: 'btn ghost sm', 'aria-expanded': 'false', 'aria-controls': 'why-panel', onclick: () => { why.hidden = !why.hidden; whyBtn.setAttribute('aria-expanded', String(!why.hidden)); } }, icon('info'), 'Por que esta recomendação?');
  why.append(h('ul', {}, ex.lines.map(l => h('li', {}, l))));
  if (ex.factors) {
    const W = App.st.settings.weights;
    const rows = [['Importância estimada', 'importance', W.importance], ['Lacuna de aprendizagem', 'learningGap', W.gap], ['Pré-requisito para outros', 'prerequisiteRelevance', W.prereq], ['Urgência de revisão', 'reviewUrgency', W.urgency]];
    why.append(h('div', { class: 'stack' }, h('div', { class: 'small muted' }, `Pontuação = ${rows.map(([l, k, w]) => `${w.toFixed(2)}×${l.toLowerCase()}`).join(' + ')}${ex.penalty ? ` − ${ex.penalty.toFixed(2)} (anti-repetição)` : ''} = ${ex.score.toFixed(3)}`),
      ...rows.map(([l, k, w]) => h('div', { class: 'factor' }, h('span', {}, l), h('div', { class: 'progress accent' }, h('span', { style: { width: pct(ex.factors[k]) } })), h('span', { class: 'mono small' }, ex.factors[k].toFixed(2)))),
      h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Heurística transparente (não é um modelo científico validado). Pesos e importâncias podem ser editados em Configurações.')));
  }
  const start = h('a', { class: 'btn primary', href: tgt.href, onclick: () => { if (rec.topicId) { App.st.recHistory.push(rec.topicId); App.st.recHistory = App.st.recHistory.slice(-20); App.save(); } } }, tgt.label, icon('arrow'));
  return h('section', { class: 'card rec stack', 'aria-labelledby': 'rec-t' },
    h('div', { class: 'card-kicker' }, 'Próxima atividade recomendada'),
    h('h2', { id: 'rec-t', style: { margin: 0 } }, rec.topicId ? topicName(rec.topicId) : ex.title),
    h('p', { style: { margin: 0 } }, ex.lines[0]),
    h('div', { class: 'row' }, start, whyBtn), why);
}

Pages.welcome = () => {
  const choose = mode => {
    App.st.settings.mode = mode;
    if (mode === 'emergency' && !App.st.schedule.startedAt) App.st.schedule.startedAt = Date.now();
    App.save(true); location.hash = App.st.diagnostic.done ? '#/inicio' : '#/diagnostico';
  };
  const d = daysToExam();
  return h('div', { class: 'content narrow' },
    pageHead('Bem-vindo à sua preparação para a Prova 2', `Redes de Computadores · prova em ${new Date(CONFIG.examDate + 'T12:00:00').toLocaleDateString('pt-BR')} ${d === 1 ? '(amanhã)' : d > 1 ? `(em ${d} dias)` : ''}. Tudo funciona offline e seu progresso fica salvo neste navegador.`),
    h('div', { class: 'grid cols-2' },
      h('button', { class: 'card mode-card stack', onclick: () => choose('emergency') }, h('div', { class: 'card-kicker' }, 'Recomendado para hoje'), h('h2', {}, 'Revisão de Emergência'), h('p', {}, 'Cronograma de 10 h (10 blocos de 50 min + pausas), diagnóstico inicial e recomendações adaptadas ao seu desempenho, com tempo reservado para simulado e revisão final.'), h('span', { class: 'btn primary' }, 'Começar com diagnóstico', icon('arrow'))),
      h('button', { class: 'card mode-card stack', onclick: () => choose('complete') }, h('div', { class: 'card-kicker' }, 'Sem pressão de tempo'), h('h2', {}, 'Aprendizado Completo'), h('p', {}, 'Estude todos os módulos na ordem que quiser. Mesmo conteúdo, exercícios, histórico e progresso — você pode trocar de modo a qualquer momento.'), h('span', { class: 'btn' }, 'Escolher este modo', icon('arrow')))),
    h('div', { class: 'card flat stack', style: { marginTop: '24px' } }, h('h3', {}, 'Como esta plataforma ensina'), h('p', { style: { margin: 0 } }, 'Entender → Visualizar → Praticar com ajuda → Resolver sozinho → Receber feedback → Revisar → Consolidar.'), h('ul', { class: 'small', style: { margin: 0 } }, h('li', {}, 'Abrir uma aula não conta como domínio: o domínio vem de acertos independentes e variados.'), h('li', {}, 'Acertos com dica contam como "assistidos".'), h('li', {}, 'Botões "Saiba mais" são aprofundamentos opcionais — nunca obrigatórios.'))));
};

Pages.inicio = () => {
  const st = App.st;
  if (!st.settings.mode) return Pages.welcome();
  const em = st.settings.mode === 'emergency';
  const groupsM = CONFIG.groups.map(g => { const ts = CONFIG.topics.filter(t => t.group === g.id); const m = ts.reduce((s, t) => s + Adaptive.mastery(st.topics[t.id]), 0) / ts.length; const mastered = ts.filter(t => st.topics[t.id].status === 'mastered').length; return { g, m, mastered, total: ts.length, attempts: ts.reduce((s, t) => s + st.topics[t.id].attempts, 0) }; });
  const due = Object.values(Flash.dueByTopic(Cards.cards, st.flash.cards)).reduce((a, b) => a + b, 0);
  const weak = Weak.analyze(st.history, st.weak.marked).filter(w => w.status === 'ativo');
  const lastExam = st.exams[st.exams.length - 1];
  const sectionsSeen = Content.modules.reduce((s, m) => s + Object.keys((st.lessons[m.id] || {}).seen || {}).length, 0);
  const sectionsTotal = Content.modules.length * 9;
  const practiced = CONFIG.topics.filter(t => st.topics[t.id].attempts > 0).length;
  const cur = Schedule.current(st);
  const remaining = Schedule.remainingMinutes(st);
  return h('div', { class: 'content' },
    pageHead(em ? 'Revisão de Emergência' : 'Aprendizado Completo', `Prova em ${new Date(CONFIG.examDate + 'T12:00:00').toLocaleDateString('pt-BR')}. Tempo de estudo ativo registrado: ${fmtMin(st.study.activeMs)} (só conta com a aba visível e interação recente).`),
    !st.diagnostic.done ? h('div', { class: 'note' }, h('strong', {}, 'Comece pelo diagnóstico (10–15 min). '), 'Ele mostra por onde começar — não ter conhecimento prévio é normal. ', h('a', { href: '#/diagnostico' }, 'Fazer diagnóstico agora')) : null,
    h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' } },
      RecommendationCard(),
      em ? h('section', { class: 'card stack' }, h('div', { class: 'card-kicker' }, 'Cronograma'),
        cur ? h('div', {}, h('div', { class: 'small muted' }, `Bloco ${cur.n} de ${st.schedule.blocks.length}`), h('h3', { style: { margin: 0 } }, cur.title), h('p', { class: 'small', style: { margin: 0 } }, cur.goal)) : h('p', {}, 'Todos os blocos concluídos. Faça a revisão final e descanse.'),
        h('div', { class: 'row' }, h('div', { class: 'stat' }, h('span', { class: 'v' }, `${Math.floor(remaining / 60)}h${String(remaining % 60).padStart(2, '0')}`), h('span', { class: 'l' }, 'planejadas restantes')), h('div', { class: 'stat', style: { marginLeft: '24px' } }, h('span', { class: 'v' }, `${st.schedule.blocks.filter(b => b.status === 'done').length}/${st.schedule.blocks.length}`), h('span', { class: 'l' }, 'blocos concluídos'))),
        h('div', { class: 'progress' }, h('span', { style: { width: pct(st.schedule.blocks.filter(b => b.status === 'done').length / st.schedule.blocks.length) } })),
        h('a', { class: 'btn', href: '#/plano' }, 'Abrir o plano', icon('arrow'))) :
        h('section', { class: 'card stack' }, h('div', { class: 'card-kicker' }, 'Módulos'), ...Content.modules.map(m => h('a', { href: `#/aprender/${m.id}`, class: 'row between', style: { textDecoration: 'none', color: 'inherit' } }, h('span', {}, `${m.n}. ${m.title}`), h('span', { class: 'badge' }, `${Object.keys((st.lessons[m.id] || {}).seen || {}).length}/9 etapas`))))),
    h('h2', { style: { marginTop: '32px' } }, 'Indicadores'),
    h('div', { class: 'grid cols-3' },
      h('div', { class: 'card tight stat' }, h('span', { class: 'l' }, 'Conteúdo estudado'), h('span', { class: 'v' }, `${sectionsSeen}/${sectionsTotal}`), h('span', { class: 'l' }, 'etapas de aula visualizadas (não é domínio)')),
      h('div', { class: 'card tight stat' }, h('span', { class: 'l' }, 'Conteúdo praticado'), h('span', { class: 'v' }, `${practiced}/${CONFIG.topics.length}`), h('span', { class: 'l' }, `tópicos com tentativas · ${st.history.length} respostas`)),
      h('a', { class: 'card tight stat', href: '#/flashcards', style: { textDecoration: 'none', color: 'inherit' } }, h('span', { class: 'l' }, 'Revisões pendentes'), h('span', { class: 'v' }, String(due)), h('span', { class: 'l' }, 'flashcards vencidos')),
      h('a', { class: 'card tight stat', href: '#/fracos', style: { textDecoration: 'none', color: 'inherit' } }, h('span', { class: 'l' }, 'Erros recorrentes'), h('span', { class: 'v' }, String(weak.length)), h('span', { class: 'l' }, 'conceitos com dificuldade ativa')),
      h('a', { class: 'card tight stat', href: '#/simulado', style: { textDecoration: 'none', color: 'inherit' } }, h('span', { class: 'l' }, 'Simulado'), h('span', { class: 'v' }, lastExam ? `${lastExam.correct}/${lastExam.total}` : '—'), h('span', { class: 'l' }, lastExam ? `último em ${new Date(lastExam.at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}` : 'ainda não realizado'))),
    h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('div', { class: 'card-kicker' }, 'Domínio estimado por módulo (provisório)'),
      ...groupsM.map(x => h('div', { class: 'stack', style: { marginTop: '8px' } }, h('div', { class: 'row between small' }, h('a', { href: `#/aprender/${x.g.module}` }, x.g.name), h('span', { class: 'muted' }, `${x.mastered}/${x.total} tópicos no critério · ${x.attempts} tentativas`)), h('div', { class: `progress ${x.mastered === x.total ? 'ok' : ''}` }, h('span', { style: { width: pct(x.m) } })))),
      h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Estimativa suavizada a partir das suas respostas; com poucas tentativas ela é incerta. Não é probabilidade de aprovação.')));
};

Pages.plano = () => {
  const st = App.st;
  const root = h('div', { class: 'content' });
  function render() {
    root.innerHTML = '';
    const cur = Schedule.current(st);
    const rem = Schedule.remainingMinutes(st);
    const minutesIn = h('input', { class: 'input', type: 'number', min: '30', max: '900', step: '10', value: String(rem), style: { width: '120px' }, 'aria-label': 'Minutos disponíveis' });
    const blockIn = h('input', { class: 'input', type: 'number', min: '20', max: '90', step: '5', value: String(st.settings.blockMinutes), style: { width: '100px' }, 'aria-label': 'Duração do bloco' });
    const breakIn = h('input', { class: 'input', type: 'number', min: '0', max: '30', step: '5', value: String(st.settings.breakMinutes), style: { width: '100px' }, 'aria-label': 'Duração da pausa' });
    const run = st.schedule.running;
    root.append(
      pageHead('Plano de estudo', st.settings.mode === 'emergency' ? 'Cronograma de Revisão de Emergência. Concluir um bloco recalcula as recomendações; replanejar nunca apaga blocos concluídos.' : 'Você está no modo Aprendizado Completo: o cronograma é opcional. Mude o modo em Configurações.'),
      h('div', { class: 'timeline' }, ...st.schedule.blocks.flatMap((b, i) => {
        const isCur = cur && b.id === cur.id;
        const item = h('div', { class: `tl-item ${b.status === 'done' ? 'done' : ''} ${isCur ? 'current' : ''}` },
          h('div', { class: 'tl-n' }, b.status === 'done' ? icon('check') : String(b.n)),
          h('div', {}, h('div', { style: { fontWeight: 600 } }, b.title), h('div', { class: 'small muted' }, `${b.goal} · ${b.minutes} min${b.topics.length ? ' · ' + b.topics.map(topicName).join(', ') : ''}`), isCur && run && run.id === b.id ? h('div', { class: 'small', style: { color: 'var(--primary-strong)' } }, `Em andamento desde ${new Date(run.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`) : null),
          h('div', { class: 'row' },
            b.status === 'done' ? h('button', { class: 'btn sm ghost', onclick: () => { Schedule.reopen(st, b.id); App.save(); render(); } }, 'Reabrir') :
              isCur ? [
                !(run && run.id === b.id) ? h('button', { class: 'btn sm', onclick: () => { st.schedule.running = { id: b.id, startedAt: Date.now(), notified: false }; App.save(); render(); toast(`Bloco iniciado. Aviso de pausa em ${st.settings.blockMinutes} min.`); } }, icon('clock'), 'Iniciar') : null,
                h('a', { class: 'btn sm', href: b.kind === 'exam' ? '#/simulado' : b.kind === 'final' ? '#/fracos' : '#/inicio' }, 'Ir à atividade'),
                h('button', { class: 'btn sm primary', onclick: () => { Schedule.complete(st, b.id); st.schedule.running = null; App.save(); render(); toast(`Bloco ${b.n} concluído. Pausa de ${st.settings.breakMinutes} min antes do próximo!`); } }, 'Concluir')] : null));
        const brk = i < st.schedule.blocks.length - 1 ? h('div', { class: 'tl-break' }, `pausa ${st.settings.breakMinutes} min`) : null;
        return [item, brk];
      })),
      h('section', { class: 'card stack', style: { marginTop: '24px' } }, h('h3', {}, 'Ajustar o cronograma'),
        h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, 'Tempo disponível restante (min)'), minutesIn), h('label', { class: 'field' }, h('span', { class: 'lbl' }, 'Bloco (min)'), blockIn), h('label', { class: 'field' }, h('span', { class: 'lbl' }, 'Pausa (min)'), breakIn)),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', onclick: async () => {
            const m = +minutesIn.value; if (!(m >= 30)) { toast('Informe pelo menos 30 minutos.'); return; }
            st.settings.blockMinutes = +blockIn.value || 50; st.settings.breakMinutes = +breakIn.value || 0;
            if (!await confirmDialog({ title: 'Replanejar o tempo restante?', body: `Os blocos ainda não concluídos serão substituídos por um plano de ${m} min, priorizando seus pontos fracos, cobrindo os 5 módulos e reservando simulado + revisão final. Blocos concluídos são mantidos.`, ok: 'Replanejar' })) return;
            Schedule.replan(st, m, App.ctx()); App.save(); render(); toast('Plano refeito com base no seu desempenho atual.');
          } }, 'Replanejar com base no desempenho'),
          h('button', { class: 'btn ghost', onclick: async () => { if (!await confirmDialog({ title: 'Restaurar o cronograma original de 10 blocos?', body: 'Blocos concluídos voltarão como pendentes, mas todo o histórico de exercícios é mantido.', ok: 'Restaurar' })) return; st.schedule.blocks = Schedule.initialBlocks(st.settings.blockMinutes); st.schedule.running = null; App.save(); render(); } }, 'Restaurar cronograma original')),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Com menos de 3 h, o simulado é reduzido (≈25 min) e a revisão final fica com 20 min. Durma: estudar até tarde prejudica a memória do que você acabou de aprender.')));
  }
  render();
  return root;
};

Pages.diagnostico = () => {
  const st = App.st;
  const items = Bank.diagnostic;
  const answers = { ...st.diagnostic.answers };
  const root = h('div', { class: 'content narrow' });
  function render() {
    root.innerHTML = '';
    root.append(pageHead('Diagnóstico inicial', '12 perguntas curtas, uma ou duas por tópico. Responda com sinceridade — "Não sei" é uma resposta válida e ajuda a planejar. Leva de 10 a 15 minutos.'));
    if (st.diagnostic.done) {
      const res = items.map(q => ({ q, a: st.diagnostic.answers[q.id] }));
      root.append(h('div', { class: 'card stack' }, h('h2', {}, 'Resultado'), h('p', {}, `Você acertou ${res.filter(r => +r.a === r.q.correct).length} de ${items.length}. Isso não é nota: serve para decidir por onde começar.`),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Tópico'), h('th', {}, 'Resultado'))), h('tbody', {}, res.map(r => h('tr', {}, h('td', {}, topicName(r.q.topic)), h('td', {}, +r.a === r.q.correct ? h('span', { class: 'badge ok' }, 'acertou') : +r.a === r.q.unknownIndex ? h('span', { class: 'badge' }, 'não sabia — vamos aprender') : h('span', { class: 'badge bad' }, `errou (certa: ${r.q.options[r.q.correct]})`))))))),
        h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/inicio' }, 'Ver minha recomendação', icon('arrow')), h('button', { class: 'btn ghost', onclick: async () => { if (await confirmDialog({ title: 'Refazer o diagnóstico?', body: 'As respostas anteriores continuam no histórico; o novo diagnóstico será somado a elas.', ok: 'Refazer' })) { st.diagnostic = { done: false, answers: {}, at: null }; App.save(); for (const k of Object.keys(answers)) delete answers[k]; render(); } } }, 'Refazer diagnóstico'))));
      return;
    }
    const list = h('div', { class: 'stack' });
    items.forEach((q, i) => {
      const name = `diag-${q.id}`;
      list.append(h('fieldset', { class: 'card tight stack', style: { border: '1px solid var(--border)' } }, h('legend', { class: 'small muted', style: { padding: '0 6px' } }, `${i + 1}/${items.length} · ${topicName(q.topic)}`), h('div', { html: q.prompt }),
        h('div', { class: 'choices' }, q.options.map((o, j) => h('label', { class: `choice ${String(answers[q.id]) === String(j) ? 'sel' : ''}` }, h('input', { type: 'radio', name, checked: String(answers[q.id]) === String(j), onchange: e => { answers[q.id] = j; $$('.choice', e.target.closest('.choices')).forEach(c => c.classList.toggle('sel', c.contains(e.target))); } }), h('span', { html: o }))))));
    });
    root.append(list, h('div', { class: 'row', style: { marginTop: '16px' } }, h('button', { class: 'btn primary', onclick: async () => {
      const missing = items.filter(q => answers[q.id] === undefined).length;
      if (missing && !await confirmDialog({ title: `${missing} pergunta(s) sem resposta`, body: 'As que ficarem em branco serão tratadas como "Não sei". Continuar?', ok: 'Concluir assim' })) return;
      for (const q of items) {
        const a = answers[q.id] ?? q.unknownIndex;
        const result = +a === q.correct ? 'independent' : +a === q.unknownIndex ? 'unknown' : 'incorrect';
        Store.recordAttempt(st, { qid: q.id, sig: q.id, topic: q.topic, difficulty: 'basico', kind: 'diagnostico', result, hints: 0, attempts: 1, wrongTags: [], tagsAll: [], context: 'diagnostic', diagnostic: true });
        st.diagnostic.answers[q.id] = a;
      }
      st.diagnostic.done = true; st.diagnostic.at = Date.now(); App.save(true); updateNavCounts(); render(); window.scrollTo(0, 0);
    } }, 'Concluir diagnóstico')));
  }
  render();
  return root;
};
