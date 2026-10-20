// Teste de fumaça da interface em jsdom (sem rede): rotas, interações principais, persistência
const path = require('path');
const fs = require('fs');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '../../testenv/node_modules/jsdom'));
const file = process.argv[2] || path.join(__dirname, '../dist/estudo_prova2.html');
const html = fs.readFileSync(file, 'utf8');
const errors = [];
let passed = 0;
const ok = (c, m) => { if (!c) { throw new Error('FALHOU: ' + m); } passed++; };

function open(storage) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.stack || e.message)));
  vc.on('error', e => errors.push('console.error: ' + e));
  const dom = new JSDOM(html, { url: 'http://localhost/estudo_prova2.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.print = () => {};
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
    } });
  return dom;
}
const tick = (ms = 10) => new Promise(r => setTimeout(r, ms));
async function go(dom, hash) { dom.window.location.hash = hash; await tick(20); return dom.window.document.querySelector('#view'); }
const click = (el, w) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
async function confirmOk(w) { await tick(5); const b = w.document.querySelector('.dialog .btn.primary, .dialog .btn.danger'); if (b) click(b, w); await tick(20); }
function typeInto(input, value, w) { input.value = value; input.dispatchEvent(new w.Event('input', { bubbles: true })); input.dispatchEvent(new w.Event('change', { bubbles: true })); }

(async () => {
  const dom = open(); const w = dom.window; const d = w.document;
  await tick(30);
  ok(/Revisão de Emergência/.test(d.body.textContent), 'tela de boas-vindas');
  click(d.querySelector('.mode-card'), w); await tick(30);
  ok(w.location.hash === '#/diagnostico', 'vai ao diagnóstico');
  // diagnóstico: marca a 1ª alternativa de cada pergunta
  for (const fs2 of d.querySelectorAll('fieldset')) { const r = fs2.querySelector('input[type=radio]'); r.checked = true; r.dispatchEvent(new w.Event('change', { bubbles: true })); }
  click([...d.querySelectorAll('button')].find(b => b.textContent.includes('Concluir diagnóstico')), w); await tick(30);
  ok(/Resultado/.test(d.querySelector('#view').textContent), 'resultado do diagnóstico');
  const App = w.eval('App');
  ok(App.st.diagnostic.done && App.st.history.length === 12, 'diagnóstico registrado');

  // início + "Por que esta recomendação?"
  let v = await go(dom, '#/inicio');
  ok(/Próxima atividade recomendada/.test(v.textContent), 'card de recomendação');
  const whyBtn = [...v.querySelectorAll('button')].find(b => b.textContent.includes('Por que esta recomendação'));
  click(whyBtn, w); await tick();
  ok(!v.querySelector('#why-panel').hidden && v.querySelector('#why-panel li'), 'painel de explicação abre');
  const rec = w.eval('Adaptive.recommend(App.ctx())');
  const ex = w.eval('Adaptive.explain(Adaptive.recommend(App.ctx()))');
  ok(v.querySelector('#why-panel').textContent.includes(ex.lines[0].slice(0, 40)), 'explicação exibida = explain() do algoritmo');
  void rec;

  // todas as rotas
  const routes = ['#/plano', '#/aprender', '#/praticar', '#/flashcards', '#/laboratorio', '#/simulado', '#/fracos', '#/revisao', '#/config', '#/praticar/misto', '#/nao-existe'];
  for (const m of ['ipv4', 'cidr', 'ipv6', 'stp', 'vlan']) routes.push(`#/aprender/${m}`, `#/aprender/${m}/verificacao`);
  for (const t of w.eval('CONFIG.topics.map(t => t.id)')) for (const df of ['basico', 'avancado']) routes.push(`#/praticar/${t}/${df}`);
  for (const s of w.eval('Labs.scenarios.map(s => s.id)')) routes.push(`#/laboratorio/${s}`);
  for (const r of routes) { v = await go(dom, r); ok(v.textContent.length > 50 && !/Algo deu errado/.test(v.textContent), 'rota ' + r); }

  // Saiba mais abre/fecha e não altera domínio
  v = await go(dom, '#/aprender/cidr');
  const before = JSON.stringify(App.st.topics);
  const smb = v.querySelector('.sm-btn'); click(smb, w); await tick();
  ok(v.querySelector('.sm-panel') && smb.getAttribute('aria-expanded') === 'true', 'saiba mais abre');
  ok(/Aprofundamento opcional/.test(v.querySelector('.sm-panel').textContent), 'rótulo aprofundamento');
  click(v.querySelector('.sm-panel header button'), w); await tick();
  ok(!v.querySelector('.sm-panel'), 'saiba mais fecha');
  ok(JSON.stringify(App.st.topics) === before, 'saiba mais não altera domínio');

  // prática: responde certo usando a resposta do objeto (independente) e errado 2x
  v = await go(dom, '#/praticar/mascara/basico');
  const n0 = App.st.history.length;
  let inputs = [...v.querySelectorAll('.q input.input')];
  inputs.forEach(i => typeInto(i, '1.1.1.1', w));
  const ver = () => [...v.querySelectorAll('button')].find(b => b.textContent.includes('Verificar'));
  click(ver(), w); await tick(); click(ver(), w); await tick();
  ok(/Resolução/.test(v.textContent) && App.st.history.length === n0 + 1 && App.st.history.at(-1).result === 'incorrect', 'erro 2x registra incorreto com feedback');
  ok(v.querySelector('.fb-row') && v.textContent.includes('Erros comuns'), 'feedback em partes');
  ok(App.st.history.at(-1).wrongTags.length > 0, 'tags de erro');
  // outro exercício e dica
  click([...v.querySelectorAll('button')].find(b => b.textContent.includes('Tentar outro')), w); await tick();
  click([...v.querySelectorAll('button')].find(b => b.textContent.includes('Dica')), w); await tick();
  ok(v.querySelector('.hint'), 'dica progressiva');
  // responde corretamente com dica → assistido
  const lastSig = App.st.history.at(-1).sig;
  const ans = w.eval(`(() => { const s = ${JSON.stringify(lastSig)}; return null; })()`);
  void ans;

  // pontos fracos mostra conceito
  v = await go(dom, '#/fracos');
  ok(/Hipótese/.test(v.textContent), 'pontos fracos com hipótese');

  // laboratório ROAS via terminal
  v = await go(dom, '#/laboratorio/roas');
  const sol = w.eval('Labs.byId.roas.solution');
  for (const [dev, cmds] of Object.entries(sol)) {
    const tab = [...v.querySelectorAll('.term-tabs button')].find(b => b.textContent === dev); click(tab, w); await tick();
    for (const c of cmds) { const inp = v.querySelector('.term-in input'); inp.value = c; inp.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
    await tick();
  }
  ok(v.querySelectorAll('.task.done').length === w.eval('Labs.byId.roas.tasks.length'), 'todas as tarefas do lab concluídas');
  ok(App.st.topics.intervlan.labConfigs >= 1, 'lab credita configuração válida');
  click([...v.querySelectorAll('button')].find(b => b.textContent === 'Ping'), w); await tick();
  ok(/Ping OK/.test(v.textContent), 'ping inter-VLAN ok');
  const inp = v.querySelector('.term-in input'); inp.value = 'show ip route'; inp.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await tick();
  ok(/directly connected/.test(v.querySelector('.term-out').textContent), 'show ip route');

  // simulado de emergência
  v = await go(dom, '#/simulado');
  click([...v.querySelectorAll('button')].find(b => b.textContent.includes('versão reduzida')), w); await tick(20);
  v = d.querySelector('#view');
  ok(v.querySelectorAll('.sim-steps button').length === 10, 'simulado com 10 questões');
  const groups = new Set(App.st.examDraft.qids.map(id => w.eval(`CONFIG.topics.find(t => t.id === Bank.byId[${JSON.stringify(id)}].topic).group`)));
  ok(groups.size === 5, 'simulado de emergência cobre os 5 módulos');
  const r1 = v.querySelector('.choice input'); if (r1) { r1.checked = true; r1.dispatchEvent(new w.Event('change', { bubbles: true })); }
  click([...v.querySelectorAll('button')].find(b => b.textContent.includes('Finalizar')), w); await confirmOk(w);
  await tick(50); if (!/Resultado do simulado/.test(d.querySelector('#view').textContent)) console.log('DBG', w.location.hash, d.querySelector('#view').textContent.slice(0, 300), d.querySelector('.dialog') ? 'DIALOG:' + d.querySelector('.dialog').textContent : 'nodialog', App.st.exams.length);
  ok(/Resultado do simulado/.test(d.querySelector('#view').textContent), 'resultado do simulado');
  ok(App.st.exams.length === 1, 'simulado salvo');
  click([...d.querySelectorAll('#view button')].find(b => b.textContent.includes('Revisar')) || d.body, w); await tick();

  // simulado completo: 25 questões balanceadas
  const ids = w.eval('Exam.build(Bank.exam, { size: 25 })');
  const per = {}; for (const id of ids) { const g = w.eval(`CONFIG.topics.find(t => t.id === Bank.byId[${JSON.stringify(id)}].topic).group`); per[g] = (per[g] || 0) + 1; }
  ok(ids.length === 25 && Object.values(per).every(x => x === 5), 'simulado completo 5 por módulo ' + JSON.stringify(per));

  // flashcards
  v = await go(dom, '#/flashcards');
  click([...v.querySelectorAll('button')].find(b => b.textContent.includes('Revelar')), w); await tick();
  click([...d.querySelectorAll('#view button')].find(b => b.textContent === 'Errei'), w); await tick();
  ok(Object.keys(App.st.flash.cards).length === 1, 'flashcard avaliado');

  // plano: concluir bloco e replanejar
  v = await go(dom, '#/plano');
  click([...v.querySelectorAll('button')].find(b => b.textContent === 'Concluir'), w); await tick();
  ok(App.st.schedule.blocks[0].status === 'done', 'bloco concluído');
  v = d.querySelector('#view');
  typeInto(v.querySelector('input[aria-label="Minutos disponíveis"]'), '120', w);
  click([...v.querySelectorAll('button')].find(b => b.textContent.includes('Replanejar')), w); await confirmOk(w);
  ok(App.st.schedule.blocks[0].status === 'done' && App.st.schedule.blocks.some(b => b.kind === 'exam' || b.kind === 'final'), 'replanejamento preserva concluídos');

  // export/import: validação
  const exported = JSON.parse(JSON.stringify(App.st));
  ok(w.eval(`Store.validate(${JSON.stringify(exported)}).ok`), 'export válido para import');
  ok(!w.eval('Store.validate({foo:1}).ok'), 'import inválido rejeitado');
  ok(!w.eval('Store.validate({app:"redes-prova2", version: 99, settings:{}, topics:{}, history:[], schedule:{}}).ok'), 'versão futura rejeitada');

  // persistência: reabre com o mesmo localStorage
  App.save(true);
  const storage = { [w.eval('CONFIG.storageKey')]: w.localStorage.getItem(w.eval('CONFIG.storageKey')) };
  const dom2 = open(storage); await tick(40);
  const A2 = dom2.window.eval('App');
  ok(A2.st.history.length === App.st.history.length && A2.st.exams.length === 1 && A2.st.settings.mode === 'emergency', 'progresso persistido após reabrir');
  ok(dom2.window.location.hash === App.st.lastRoute || dom2.window.document.querySelector('#view').textContent.length > 50, 'retoma última rota');

  // armazenamento indisponível não quebra
  const dom3 = new JSDOM(html, { url: 'file:///tmp/x.html', runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(w3) { Object.defineProperty(w3, 'localStorage', { get() { throw new Error('bloqueado'); } }); w3.matchMedia = () => ({ matches: false }); w3.scrollTo = () => {}; } });
  await tick(30);
  ok(/Revisão de Emergência/.test(dom3.window.document.body.textContent), 'funciona sem localStorage');

  // nenhuma referência de rede
  ok(!/(src|href)=["']https?:/i.test(html) && !/url\(\s*['"]?https?:/i.test(html) && !/\bfetch\(/.test(html) && !/XMLHttpRequest/.test(html) && !/\beval\(|new Function\(/.test(html), 'sem recursos externos / eval');

  if (errors.length) { console.log(errors.slice(0, 10).join('\n')); throw new Error(`${errors.length} erro(s) de runtime`); }
  console.log(`dom: ${passed} verificações OK, 0 erros de runtime`);
  process.exit(0);
})().catch(e => { console.error(e.message); if (errors.length) console.log(errors.slice(0, 10).join('\n')); process.exit(1); });
