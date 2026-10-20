/* ==========================================================================
   Layout, navegação, roteador e inicialização
   ========================================================================== */
App.cleanup = [];
const NAV = [
  ['inicio', 'Início', 'home'], ['plano', 'Plano de estudo', 'plan'], ['aprender', 'Aprender', 'learn'], ['praticar', 'Praticar', 'practice'],
  ['laboratorio', 'Laboratório', 'lab'], ['simulado', 'Simulado', 'exam'], ['fracos', 'Meus pontos fracos', 'weak'], ['revisao', 'Revisão final', 'review'], ['config', 'Configurações', 'settings'],
];
function buildShell() {
  const nav = h('nav', { class: 'nav', 'aria-label': 'Principal' }, NAV.map(([id, label, ic]) => h('a', { href: `#/${id}`, 'data-nav': id }, icon(ic), h('span', {}, label), h('span', { class: 'count', 'data-count': id, hidden: true }))));
  const sidebar = h('aside', { class: 'sidebar', id: 'sidebar' },
    h('div', { class: 'brand' }, h('div', { class: 'brand-mark' }, icon('net')), h('div', {}, h('div', { class: 'brand-title' }, 'Redes · Prova 2'), h('div', { class: 'brand-sub' }, 'Plataforma de estudo offline'))),
    nav,
    h('div', { class: 'sidebar-foot' }, h('div', { id: 'exam-count' }), h('button', { class: 'btn ghost sm', style: { marginTop: '8px', paddingLeft: 0 }, onclick: () => { const t = App.st.settings.theme; const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); App.st.settings.theme = dark ? 'light' : 'dark'; App.applyTheme(); App.save(); } }, 'Alternar tema claro/escuro')));
  const topbar = h('header', { class: 'topbar' }, h('button', { class: 'btn ghost icon-btn', 'aria-label': 'Abrir menu', 'aria-controls': 'sidebar', 'aria-expanded': 'false', id: 'menu-btn', onclick: () => toggleMenu(true) }, icon('menu')), h('div', { class: 'title', id: 'top-title' }, 'Redes · Prova 2'));
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1' }, topbar, h('div', { id: 'view' }));
  const app = h('div', { class: 'app' }, h('a', { href: '#main', class: 'sr-only', onfocus: e => e.target.classList.remove('sr-only'), onblur: e => e.target.classList.add('sr-only') }, 'Pular para o conteúdo'), sidebar, main);
  document.body.innerHTML = ''; document.body.append(app);
}
function toggleMenu(open) {
  const sb = $('#sidebar'); const btn = $('#menu-btn');
  sb.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
  const old = $('.scrim'); if (old) old.remove();
  if (open) { document.body.append(h('div', { class: 'scrim', onclick: () => toggleMenu(false) })); $('a', sb).focus(); }
}
function updateNavCounts() {
  const st = App.st; if (!st || !$('[data-count]')) return;
  const due = Object.values(Flash.dueByTopic(Cards.cards, st.flash.cards)).reduce((a, b) => a + b, 0);
  const weak = Weak.analyze(st.history, st.weak.marked).filter(w => w.status === 'ativo').length;
  const set = (id, n) => { const el = $(`[data-count="${id}"]`); if (!el) return; el.hidden = !n; el.textContent = String(n); el.setAttribute('aria-label', `${n} pendente(s)`); };
  set('praticar', due); set('fracos', weak);
  const d = daysToExam(); const ec = $('#exam-count'); if (ec) ec.textContent = d > 1 ? `Prova em ${d} dias` : d === 1 ? 'Prova amanhã' : d === 0 ? 'Prova hoje' : 'Prova realizada';
}

function route() {
  for (const fn of App.cleanup.splice(0)) { try { fn(); } catch (e) { /* ignora */ } }
  const hash = location.hash || '#/inicio';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [area = 'inicio', a1, a2, a3] = parts;
  App.routeArea = area; App.routeTopic = null;
  let view;
  try {
    if (!App.st.settings.mode && !['config', 'diagnostico'].includes(area)) view = Pages.welcome();
    else switch (area) {
      case 'inicio': view = Pages.inicio(); break;
      case 'plano': view = Pages.plano(); break;
      case 'diagnostico': view = Pages.diagnostico(); break;
      case 'aprender': view = a1 ? Pages.modulo(a1, a2) : Pages.aprender(); break;
      case 'praticar': view = a1 ? Pages.praticarTopico(a1, a2) : Pages.praticar(); break;
      case 'flashcards': App.routeArea = 'praticar'; view = Pages.flashcards(a1); break;
      case 'laboratorio': view = a1 ? Pages.labScenario(a1) : Pages.laboratorio(); break;
      case 'simulado': view = a1 === 'resultado' ? Pages.simuladoResultado(a2) : Pages.simulado(); break;
      case 'fracos': view = Pages.fracos(); break;
      case 'revisao': view = Pages.revisao(); break;
      case 'config': view = Pages.config(); break;
      default: view = Pages.notFound();
    }
  } catch (err) {
    console.error(err);
    view = h('div', { class: 'content narrow' }, pageHead('Algo deu errado nesta tela', 'O restante da plataforma continua funcionando. Seu progresso não foi apagado.'), h('pre', { class: 'cli' }, String(err && err.message || err)), h('a', { class: 'btn primary', href: '#/inicio' }, 'Voltar ao início'));
  }
  void a3;
  const v = $('#view'); v.innerHTML = ''; v.append(view);
  const navId = area === 'flashcards' ? 'praticar' : area === 'diagnostico' ? 'inicio' : area;
  $$('[data-nav]').forEach(a => a.toggleAttribute('aria-current', false));
  const cur = $(`[data-nav="${navId}"]`); if (cur) cur.setAttribute('aria-current', 'page');
  const label = (NAV.find(n => n[0] === navId) || [0, 'Redes · Prova 2'])[1];
  $('#top-title').textContent = label; document.title = `${label} · Redes Prova 2`;
  toggleMenu(false);
  if (!(area === 'aprender' && a2)) window.scrollTo(0, 0);
  App.st.lastRoute = hash; App.save();
  updateNavCounts();
}

function boot() {
  App.init();
  buildShell();
  window.addEventListener('hashchange', route);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#sidebar.open')) toggleMenu(false); });
  window.addEventListener('beforeunload', () => App.save(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') App.save(true); });
  if (!location.hash && App.st.lastRoute && App.st.settings.mode) history.replaceState(null, '', App.st.lastRoute);
  route();
  startTimeTracking();
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); }
