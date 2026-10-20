/* ==========================================================================
   Motor adaptativo — domínio estimado, prioridade explicável, replanejamento
   Heurística transparente (não é um modelo científico validado).
   ========================================================================== */
const Adaptive = (() => {
  const T = () => CONFIG.topics;
  const topicById = id => CONFIG.topics.find(t => t.id === id);
  const groupById = id => CONFIG.groups.find(g => g.id === id);
  const clamp01 = x => Math.max(0, Math.min(1, x));

  function newTopicRecord(id) {
    const t = topicById(id);
    return {
      topicId: id, status: 'new', attempts: 0, independentCorrect: 0, assistedCorrect: 0, incorrect: 0,
      unknown: 0, recentPerformance: [], prerequisiteTopics: [...t.prereq], lastReviewedAt: null,
      estimatedStudyMinutes: 0, actualStudyMinutes: 0, masteryScore: 0, nextReviewAt: null,
      vlsmProblems: [], labConfigs: 0, diagnostic: null,
    };
  }

  const VALUE = { independent: 1, assisted: 0.4, incorrect: 0, unknown: 0 };

  /** Registra uma tentativa (puro: retorna novo registro). result: independent|assisted|incorrect|unknown */
  function recordAttempt(rec, { result, kind = 'geral', sig = '', fullVlsm = false, now = Date.now(), diagnostic = false }) {
    const r = { ...rec, recentPerformance: [...rec.recentPerformance], vlsmProblems: [...(rec.vlsmProblems || [])] };
    r.attempts++;
    if (result === 'independent') r.independentCorrect++;
    else if (result === 'assisted') r.assistedCorrect++;
    else if (result === 'incorrect') r.incorrect++;
    else r.unknown++;
    r.recentPerformance.push({ v: VALUE[result], result, kind, sig, at: now });
    if (r.recentPerformance.length > 10) r.recentPerformance.shift();
    if (fullVlsm && result === 'independent' && sig && !r.vlsmProblems.includes(sig)) r.vlsmProblems.push(sig);
    if (diagnostic) r.diagnostic = result;
    r.lastReviewedAt = now;
    // revisão: acerto independente empurra a próxima revisão; erro traz para perto
    const mins = result === 'independent' ? 60 : result === 'assisted' ? 20 : 10;
    r.nextReviewAt = now + mins * 60000;
    r.masteryScore = mastery(r);
    r.status = status(r);
    return r;
  }

  /** Estimador suavizado: média com prior + peso crescente dos 5 últimos resultados. */
  function mastery(r) {
    const base = (r.independentCorrect + 0.4 * r.assistedCorrect + 0.5) / (r.attempts + 2);
    const recent = r.recentPerformance.slice(-5);
    if (!recent.length) return base;
    const w = 0.5 * recent.length / 5;
    const avg = recent.reduce((s, x) => s + x.v, 0) / recent.length;
    return clamp01(base * (1 - w) + avg * w);
  }

  /** Critérios de domínio provisório (seção 15). */
  function masteryCriteria(r) {
    const last5 = r.recentPerformance.slice(-5);
    const indep = last5.filter(x => x.result === 'independent').length;
    const kinds = new Set(last5.map(x => x.kind)).size;
    const base = last5.length >= 5 && indep >= 4 && kinds >= 2;
    const t = r.topicId;
    if (t === 'vlsm') return { ok: (r.vlsmProblems || []).length >= 2, detail: `${(r.vlsmProblems || []).length}/2 problemas VLSM completos resolvidos sozinho` };
    if (t === 'ios') return { ok: base && r.labConfigs >= 1, detail: `${indep}/5 acertos independentes recentes; ${r.labConfigs} configuração(ões) válida(s) no laboratório` };
    return { ok: base, detail: `${indep} acertos independentes nas últimas ${last5.length} (meta: 4 de 5, com pelo menos 2 tipos de questão; tipos: ${kinds})` };
  }

  function status(r) {
    if (r.attempts === 0) return 'new';
    if (masteryCriteria(r).ok) return 'mastered';
    return mastery(r) < 0.5 ? 'learning' : 'practicing';
  }

  /** Descendentes transitivos de um tópico no grafo de pré-requisitos. */
  function descendants(id) {
    const out = new Set(); const stack = [id];
    while (stack.length) {
      const x = stack.pop();
      for (const t of T()) if (t.prereq.includes(x) && !out.has(t.id)) { out.add(t.id); stack.push(t.id); }
    }
    return [...out];
  }
  const importanceOf = (id, settings) => {
    const t = topicById(id);
    const over = settings && settings.importance && settings.importance[t.group];
    return over !== undefined ? over : groupById(t.group).importance;
  };
  const maxDescImportance = settings => Math.max(...T().map(t => descendants(t.id).reduce((s, d) => s + importanceOf(d, settings), 0)), 1e-9);

  function trailingErrors(r) {
    let n = 0;
    for (let i = r.recentPerformance.length - 1; i >= 0; i--) { if (r.recentPerformance[i].v === 0) n++; else break; }
    return n;
  }

  /**
   * Calcula fatores e prioridade de todos os tópicos.
   * ctx: { topics:{id:rec}, settings, now, dueCards:{topicId:n}, recHistory:[topicId], mode, block:{topics}, remainingMinutes, examDone }
   */
  function scoreAll(ctx) {
    const settings = ctx.settings || {};
    const W = settings.weights || CONFIG.defaults.weights;
    const gate = settings.gateThreshold ?? CONFIG.defaults.gateThreshold;
    const maxDesc = maxDescImportance(settings);
    const rec = id => ctx.topics[id] || newTopicRecord(id);
    const rows = [];
    for (const t of T()) {
      const r = rec(t.id);
      const m = mastery(r);
      const crit = masteryCriteria(r);
      const importance = importanceOf(t.id, settings);
      const confidence = Math.min(1, r.attempts / 5);
      // lacuna: 1 − domínio; com poucos dados, puxa para 0,75 (incerteza alta)
      const learningGap = clamp01((1 - m) * confidence + 0.75 * (1 - confidence));
      const descs = descendants(t.id);
      const openDescImp = descs.filter(d => !masteryCriteria(rec(d)).ok).reduce((s, d) => s + importanceOf(d, settings), 0);
      const prerequisiteRelevance = clamp01(openDescImp / maxDesc);
      const due = (ctx.dueCards && ctx.dueCards[t.id]) || 0;
      const overdue = r.nextReviewAt && ctx.now >= r.nextReviewAt && r.attempts > 0 ? 1 : 0;
      const errStreak = trailingErrors(r);
      const reviewUrgency = clamp01(Math.min(due / 5, 1) * 0.4 + Math.min(errStreak / 3, 1) * 0.4 + overdue * 0.2);
      let score = importance * W.importance + learningGap * W.gap + prerequisiteRelevance * W.prereq + reviewUrgency * W.urgency;
      // anti-repetição
      let consecutive = 0;
      for (let i = (ctx.recHistory || []).length - 1; i >= 0 && ctx.recHistory[i] === t.id; i--) consecutive++;
      const repeatPenalty = Math.max(0, consecutive - 2) * 0.1;
      score -= repeatPenalty;
      const blockedBy = t.prereq.filter(p => !masteryCriteria(rec(p)).ok && mastery(rec(p)) < gate);
      const masteredNoReview = crit.ok && !overdue && due === 0;
      rows.push({
        topicId: t.id, name: t.name, group: t.group, mastery: m, criteria: crit, status: status(r), attempts: r.attempts,
        factors: { importance, learningGap, prerequisiteRelevance, reviewUrgency },
        weighted: { importance: importance * W.importance, learningGap: learningGap * W.gap, prerequisiteRelevance: prerequisiteRelevance * W.prereq, reviewUrgency: reviewUrgency * W.urgency },
        repeatPenalty, consecutive, score, blockedBy, masteredNoReview, due, errStreak, overdue, record: r,
      });
    }
    return rows;
  }

  function chooseActivity(row, ctx) {
    const r = row.record;
    const prereqsStrong = topicById(row.topicId).prereq.every(p => mastery(ctx.topics[p] || newTopicRecord(p)) >= 0.75);
    if (row.status === 'mastered') return { type: 'review', difficulty: 'avancado', reason: 'tópico já atingiu o critério de domínio provisório; resta revisão espaçada' };
    if (r.attempts === 0 || (r.diagnostic && r.attempts <= 1)) {
      if (r.diagnostic === 'independent' && prereqsStrong) return { type: 'practice', difficulty: 'intermediario', reason: 'você acertou este tópico no diagnóstico e domina os pré-requisitos, então a aula básica é dispensável' };
      return { type: 'learn', difficulty: 'basico', reason: 'ainda não há evidência de domínio; começar pela explicação' };
    }
    if (row.errStreak >= 2) return { type: 'learn', difficulty: 'basico', reason: `${row.errStreak} erros seguidos indicam que vale reaprender o conceito antes de praticar mais` };
    if (row.mastery < 0.5) return { type: 'practice', difficulty: 'basico', reason: 'domínio estimado abaixo de 50%: prática básica com dicas' };
    if (row.mastery < 0.75) return { type: 'practice', difficulty: 'intermediario', reason: 'domínio estimado entre 50% e 75%: prática intermediária' };
    return { type: 'practice', difficulty: 'avancado', reason: 'domínio estimado acima de 75%: falta comprovar com questões avançadas e variadas' };
  }

  /**
   * Recomendação principal com fatores. Retorna objeto usado diretamente pelo botão
   * "Por que esta recomendação?".
   */
  function recommend(ctx) {
    const settings = ctx.settings || {};
    const reserveExam = settings.reserveExamMinutes ?? CONFIG.defaults.reserveExamMinutes;
    const reserveFinal = settings.reserveFinalMinutes ?? CONFIG.defaults.reserveFinalMinutes;
    const rows = scoreAll(ctx);
    const notes = [];
    if (ctx.mode === 'emergency' && typeof ctx.remainingMinutes === 'number') {
      if (!ctx.examDone && ctx.remainingMinutes <= reserveExam + reserveFinal) {
        return { kind: 'exam', type: 'exam', reserve: true, rows, remainingMinutes: ctx.remainingMinutes, notes: [`Restam ${Math.round(ctx.remainingMinutes)} min, que é ≤ ${reserveExam + reserveFinal} min reservados para simulado + revisão final. O simulado tem precedência para medir o que você resolve sozinho.`] };
      }
      if (ctx.examDone && ctx.remainingMinutes <= reserveFinal) {
        return { kind: 'final', type: 'final', reserve: true, rows, remainingMinutes: ctx.remainingMinutes, notes: [`Restam ${Math.round(ctx.remainingMinutes)} min (≤ ${reserveFinal} min reservados): hora da revisão final pelos seus pontos fracos.`] };
      }
    }
    let pool = rows.filter(r => r.blockedBy.length === 0 && !r.masteredNoReview);
    const blocked = rows.filter(r => r.blockedBy.length > 0);
    if (ctx.mode === 'emergency' && ctx.block && ctx.block.topics && ctx.block.topics.length) {
      const inBlock = pool.filter(r => ctx.block.topics.includes(r.topicId));
      if (inBlock.length) { pool = inBlock; notes.push(`No modo Revisão de Emergência, a escolha fica restrita aos tópicos do bloco atual ("${ctx.block.title}") enquanto houver algum disponível.`); }
      else {
        // tópicos do bloco bloqueados → recomendar o pré-requisito
        const bl = rows.filter(r => ctx.block.topics.includes(r.topicId) && r.blockedBy.length);
        if (bl.length) {
          const pre = new Set(bl.flatMap(r => r.blockedBy));
          const prePool = rows.filter(r => pre.has(r.topicId) && r.blockedBy.length === 0);
          if (prePool.length) { pool = prePool; notes.push(`Os tópicos do bloco atual dependem de ${[...pre].map(p => topicById(p).name).join(', ')}, que ainda não atingiu o domínio mínimo; por isso ele vem antes.`); }
        } else notes.push('Os tópicos do bloco atual já atingiram o critério de domínio; a escolha passou para todos os tópicos.');
      }
    }
    if (!pool.length) return { kind: 'exam', type: ctx.examDone ? 'final' : 'exam', rows, notes: ['Todos os tópicos atingiram o critério de domínio provisório. Faça um simulado para confirmar.'] };
    pool.sort((a, b) => b.score - a.score || a.topicId.localeCompare(b.topicId));
    const best = pool[0];
    const activity = chooseActivity(best, ctx);
    const unlockedBy = blocked.filter(r => r.blockedBy.includes(best.topicId)).map(r => r.topicId);
    return { kind: 'topic', topicId: best.topicId, ...activity, row: best, runnerUp: pool[1] || null, unlockedBy, rows, notes, remainingMinutes: ctx.remainingMinutes };
  }

  const pct = x => `${Math.round(x * 100)}%`;
  /** Texto natural derivado exclusivamente do objeto de recomendação. */
  function explain(rec) {
    const lines = [];
    if (rec.kind !== 'topic') { lines.push(...rec.notes); return { title: rec.type === 'exam' ? 'Simulado recomendado' : 'Revisão final recomendada', lines, factors: null }; }
    const r = rec.row, t = topicById(rec.topicId);
    lines.push(`Recomendamos "${t.name}" (${rec.type === 'learn' ? 'aprender' : rec.type === 'review' ? 'revisar' : 'praticar, nível ' + rec.difficulty}) porque ${rec.reason}.`);
    lines.push(`Domínio estimado: ${pct(r.mastery)} com ${r.attempts} tentativa(s) registrada(s)${r.attempts < 5 ? ' — poucos dados, estimativa incerta' : ''}. Critério: ${r.criteria.detail}.`);
    if (r.errStreak) lines.push(`Há ${r.errStreak} erro(s) seguido(s) recentes neste tópico.`);
    if (rec.unlockedBy.length) lines.push(`Ele é pré-requisito de ${rec.unlockedBy.map(id => topicById(id).name).join(', ')}, que só serão recomendados quando este atingir o domínio mínimo.`);
    if (r.due) lines.push(`${r.due} flashcard(s) deste tópico estão com revisão vencida.`);
    lines.push(...rec.notes);
    if (typeof rec.remainingMinutes === 'number') lines.push(`Tempo restante considerado: ${Math.round(rec.remainingMinutes)} min.`);
    if (rec.runnerUp) lines.push(`Segunda opção: "${topicById(rec.runnerUp.topicId).name}" (pontuação ${rec.runnerUp.score.toFixed(3)} contra ${r.score.toFixed(3)}).`);
    lines.push('O que muda a recomendação: acertos independentes elevam o domínio; erros e dicas mantêm o tópico em foco; ao atingir o critério, ele sai da fila (exceto revisões vencidas).');
    return { title: `Por que "${t.name}"?`, lines, factors: r.factors, weighted: r.weighted, score: r.score, penalty: r.repeatPenalty };
  }

  /**
   * Replaneja o tempo restante preservando cobertura e reservas.
   * Retorna [{kind, topics?, group?, minutes, title}]
   */
  function planRemaining(ctx, minutes) {
    const short = minutes < 180;
    const exam = ctx.examDone ? 0 : (short ? 25 : CONFIG.defaults.reserveExamMinutes);
    const final = short ? 20 : CONFIG.defaults.reserveFinalMinutes;
    const breaks = Math.max(0, Math.floor(minutes / 60)) * (short ? 5 : 10);
    let study = Math.max(0, minutes - exam - final - breaks);
    const rows = scoreAll(ctx);
    const groups = CONFIG.groups.map(g => {
      const gr = rows.filter(r => r.group === g.id);
      const open = gr.filter(r => !r.masteredNoReview);
      return { g, score: Math.max(...gr.map(r => r.score)), open, focus: (open.length ? open : gr).sort((a, b) => b.score - a.score).slice(0, 2).map(r => r.topicId) };
    }).sort((a, b) => b.score - a.score);
    const minEach = Math.min(10, Math.floor(study / groups.length));
    const plan = [];
    let left = study - minEach * groups.length;
    const totalScore = groups.reduce((s, x) => s + x.score, 0) || 1;
    groups.forEach(x => {
      const extra = Math.floor(left * x.score / totalScore);
      plan.push({ kind: 'study', group: x.g.id, topics: x.focus, minutes: minEach + extra, title: `${x.g.name}${x.open.length ? '' : ' (revisão rápida)'}` });
    });
    const assigned = plan.reduce((s, p) => s + p.minutes, 0);
    if (plan.length) plan[0].minutes += study - assigned;
    if (exam) plan.push({ kind: 'exam', minutes: exam, title: short ? 'Simulado de emergência' : 'Simulado misto' });
    plan.push({ kind: 'final', minutes: final, title: 'Revisão final dos pontos fracos' });
    if (breaks) plan.push({ kind: 'break', minutes: breaks, title: 'Pausas' });
    return plan;
  }

  return { newTopicRecord, recordAttempt, mastery, masteryCriteria, status, descendants, scoreAll, recommend, explain, planRemaining, chooseActivity };
})();
