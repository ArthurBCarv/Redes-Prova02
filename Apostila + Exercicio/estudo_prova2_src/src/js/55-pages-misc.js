/* ==========================================================================
   Páginas: Meus pontos fracos, Revisão final (imprimível), Configurações
   ========================================================================== */
Pages.fracos = () => {
  const st = App.st;
  const list = Weak.analyze(st.history, st.weak.marked);
  return h('div', { class: 'content narrow' }, pageHead('Meus pontos fracos', 'Dificuldades agrupadas por conceito (não por questão), a partir dos campos que você errou ou acertou só com ajuda. O histórico é mantido mesmo depois de um acerto.'),
    !list.length ? h('div', { class: 'card stack' }, h('h2', {}, 'Nada por aqui ainda'), h('p', { style: { margin: 0 } }, 'Quando você errar ou precisar de dica, o conceito aparece aqui com sugestões. Faça o diagnóstico ou alguns exercícios.'), h('a', { class: 'btn primary', href: '#/praticar' }, 'Praticar')) :
      h('div', { class: 'stack' }, list.map(w => {
        const t = CONFIG.topics.find(x => x.id === w.topic);
        return h('section', { class: 'card stack' },
          h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, w.name), h('span', { class: `badge ${w.status === 'melhorando' ? 'ok' : w.status === 'marcado' ? 'comp' : 'bad'}` }, w.status === 'melhorando' ? 'melhorando (último registro foi acerto)' : w.status === 'marcado' ? 'marcado para revisão' : 'ativo')),
          h('div', { class: 'small muted' }, `${w.errors} erro(s) · ${w.assisted} acerto(s) com ajuda · ${w.correctAfter} acerto(s) independente(s) depois · tópico: ${t.name}`),
          h('p', { class: 'small', style: { margin: 0 } }, h('strong', {}, 'Hipótese: '), Weak.hypotheses(w)),
          h('div', { class: 'row' },
            h('a', { class: 'btn sm', href: `#/aprender/${t.module}/${t.section}` }, icon('learn'), '1. Reaprender'),
            h('a', { class: 'btn sm primary', href: `#/praticar/${t.id}/basico` }, icon('practice'), '2. Exercício semelhante'),
            h('button', { class: `btn sm ${w.marked ? '' : 'ghost'}`, 'aria-pressed': String(w.marked), onclick: () => { st.weak.marked[w.tag] = !w.marked; App.save(); route(); } }, icon('flag'), w.marked ? 'Desmarcar revisão' : '3. Marcar para revisão')));
      })),
    h('section', { class: 'card stack', style: { marginTop: '24px' } }, h('h3', {}, 'Últimas respostas'), h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Quando'), h('th', {}, 'Tópico'), h('th', {}, 'Onde'), h('th', {}, 'Resultado'))), h('tbody', {}, st.history.slice(-25).reverse().map(x => h('tr', {}, h('td', { class: 'small' }, new Date(x.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), h('td', {}, topicName(x.topic)), h('td', { class: 'small' }, { practice: 'prática', module: 'aula', exam: 'simulado', diagnostic: 'diagnóstico', lab: 'laboratório' }[x.context] || x.context || ''), h('td', {}, h('span', { class: `badge ${x.result === 'independent' ? 'ok' : x.result === 'incorrect' ? 'bad' : ''}` }, { independent: 'sozinho', assisted: 'com ajuda', incorrect: 'errou', unknown: 'não sabia' }[x.result])))))))));
};

Pages.revisao = () => {
  const card = (title, ...body) => h('div', { class: 'card tight' }, h('h3', {}, title), ...body);
  const tbl = (head, rows) => h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, head.map(x => h('th', {}, x)))), h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', { html: c }))))));
  const sheet = h('div', { class: 'sheet' },
    card('IPv4 e classes', tbl(['Classe', '1º octeto', 'Padrão'], [['A', '1–126', '/8'], ['loopback', '127', '—'], ['B', '128–191', '/16'], ['C', '192–223', '/24'], ['D', '224–239', 'multicast'], ['E', '240–255', 'experimental']]), h('p', { class: 'small', html: 'Privados: <code>10/8</code> · <code>172.16/12</code> (16–31) · <code>192.168/16</code>. Pesos: 128 64 32 16 8 4 2 1.' })),
    card('Tabela CIDR', tbl(['/n', 'Máscara', 'Bloco', 'Hosts'], [[24, 256], [25, 128], [26, 64], [27, 32], [28, 16], [29, 8], [30, 4], [23, 512], [22, 1024], [21, 2048], [20, 4096]].map(([p, b]) => [`/${p}`, IPv4.maskStr(p), String(b), String(b - 2)]))),
    card('Fórmulas e método', h('ul', { class: 'small' }, h('li', { html: 'hosts = 2<sup>h</sup> − 2 · sub-redes = 2<sup>k</sup> · endereços = 2<sup>32−n</sup>' }), h('li', {}, 'Salto = 256 − máscara no octeto interessante'), h('li', {}, 'Rede = maior múltiplo do salto ≤ IP; broadcast = próximo bloco − 1'), h('li', {}, 'Mínimo para N hosts: menor h com 2^h − 2 ≥ N'), h('li', {}, '/31 = enlace P2P (RFC 3021) · /32 = 1 endereço'))),
    card('VLSM e sumarização', h('ol', { class: 'small' }, h('li', {}, 'Ordene maior → menor'), h('li', {}, 'Escolha o menor bloco que cabe'), h('li', {}, 'Aloque em múltiplo do tamanho (alinhado)'), h('li', {}, 'Próximo começa após o broadcast anterior'), h('li', {}, 'Sem sobreposição')), h('p', { class: 'small', html: 'Resumo = bits comuns: <code>32.0/24 + 33.0/24 = 32.0/23</code> (510 hosts). Bloco não alinhado → resumo maior, com redes extras.' })),
    card('IPv6', h('ul', { class: 'small' }, h('li', {}, '128 bits · 8 grupos hex de 16 bits'), h('li', {}, 'Zeros à esquerda saem; "::" uma vez (maior sequência)'), h('li', {}, 'fe80::/10 link-local · ff00::/8 multicast · fc00::/7 ULA · 2000::/3 global · ::1 loopback · 2001:db8::/32 doc.'), h('li', {}, 'Sem broadcast · NDP (ICMPv6) substitui ARP · SLAAC com /64'))),
    card('Comutação e Ethernet', h('ul', { class: 'small' }, h('li', {}, 'Circuitos: dedicado (telefonia) · Mensagens: store-and-forward inteiro · Pacotes: datagrama (IP) ou CV · Células: fixas (ATM)'), h('li', {}, 'FDM = frequência · TDM = tempo'), h('li', {}, 'Switch aprende ORIGEM, encaminha por DESTINO; desconhecido → flooding na VLAN'), h('li', {}, 'Colisão: cada porta de switch · Broadcast: roteador/VLAN'))),
    card('STP', h('ol', { class: 'small' }, h('li', {}, 'Root = menor BID (prioridade 32768 padrão, passos de 4096; depois MAC)'), h('li', {}, 'Root Port: 1 por não-root, menor custo (19 = 100M, 4 = 1G)'), h('li', {}, 'Designated: 1 por segmento'), h('li', {}, 'Resto: bloqueada (ouve BPDUs)')), h('p', { class: 'small' }, '802.1D: Blocking → Listening → Learning (aprende MAC) → Forwarding. RSTP: Discarding/Learning/Forwarding. PortFast · BPDU Guard.')),
    card('VLAN e 802.1Q', h('ul', { class: 'small' }, h('li', {}, 'VLAN = domínio de broadcast = sub-rede'), h('li', {}, 'Access: 1 VLAN, sem tag · Trunk: várias, com tag'), h('li', {}, 'Tag 4 B entre MAC origem e EtherType: TPID 0x8100 · PCP 3 · DEI 1 · VID 12'), h('li', {}, 'VLANs 1–4094 · nativa sem tag (padrão 1) · auto+auto não forma trunk'), h('li', {}, 'Inter-VLAN: roteador (subinterfaces dot1Q) ou switch L3 (SVI + ip routing)'))),
    card('Comandos Cisco', h('pre', { class: 'cli', style: { fontSize: '.78rem' } }, 'enable / configure terminal\nvlan 10 / name ENG\ninterface fa0/1\n switchport mode access\n switchport access vlan 10\ninterface fa0/24\n switchport mode trunk\n switchport trunk allowed vlan 10,20\n switchport trunk native vlan 999\ninterface g0/0.10\n encapsulation dot1Q 10\n ip address 192.168.10.1 255.255.255.0\nip dhcp excluded-address A B\nip dhcp pool X / network / default-router\nspanning-tree vlan 1 priority 4096\nshow vlan brief | interfaces trunk\nshow mac address-table | spanning-tree\nshow ip route | ip interface brief\ncopy running-config startup-config')),
    card('Checklist de resolução', h('ol', { class: 'small' }, h('li', {}, 'Qual octeto varia? Qual o salto?'), h('li', {}, 'Rede é múltiplo do bloco? IP está entre rede e broadcast?'), h('li', {}, 'Contei −2 nos hosts (e não nas sub-redes)?'), h('li', {}, 'VLSM: ordenei e alinhei?'), h('li', {}, 'IPv6: "::" só uma vez? Expandindo dá 8 grupos?'), h('li', {}, 'STP: prioridade antes do MAC? Raiz sem Root Port?'), h('li', {}, 'VLAN: mesma VLAN → trunk; VLANs diferentes → L3/gateway'))));
  return h('div', { class: 'content' }, h('div', { class: 'screen-only' }, pageHead('Revisão final', 'Folha-resumo compacta (imprima em 1–2 páginas) e dicas para a prova. Não presuma que consulta será permitida: use-a para revisar antes.')),
    h('h1', { class: 'print-only' }, 'Redes — Prova 2 · Folha-resumo'),
    h('div', { class: 'row no-print', style: { marginBottom: '16px' } }, h('button', { class: 'btn primary', onclick: () => window.print() }, icon('print'), 'Imprimir / salvar PDF'), h('a', { class: 'btn', href: '#/flashcards' }, icon('cards'), 'Flashcards'), h('a', { class: 'btn', href: '#/simulado' }, icon('exam'), 'Simulado')),
    sheet,
    h('section', { class: 'screen-only', style: { marginTop: '32px' } }, h('h2', {}, 'Dicas para a prova'), h('div', { class: 'grid cols-2' }, Cards.tips.map(t => h('div', { class: 'card tight' }, h('h3', {}, t.t), h('ul', { class: 'small', style: { margin: 0 } }, t.items.map(x => h('li', {}, x))))))));
};

Pages.config = () => {
  const st = App.st;
  const root = h('div', { class: 'content narrow' });
  function render() {
    root.innerHTML = '';
    const sel = (val, opts, on) => h('select', { class: 'input', style: { width: 'auto' }, onchange: e => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
    const num = (val, on, step = 0.05) => h('input', { class: 'input', type: 'number', step: String(step), min: '0', max: '1', value: String(val), style: { width: '100px' }, onchange: e => { const v = +e.target.value; if (v >= 0 && v <= 1) on(v); } });
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'imp', onchange: e => importFile(e.target.files[0]) });
    const W = st.settings.weights;
    root.append(pageHead('Configurações', 'Aparência, modo de estudo, pesos do algoritmo, backup e reset.'),
      h('section', { class: 'card stack' }, h('h2', {}, 'Aparência e modo'),
        h('div', { class: 'switch-row' }, h('span', {}, 'Tema'), sel(st.settings.theme, [['auto', 'Automático (sistema)'], ['light', 'Claro'], ['dark', 'Escuro']], v => { st.settings.theme = v; App.applyTheme(); App.save(); })),
        h('div', { class: 'switch-row' }, h('span', {}, 'Modo de estudo'), sel(st.settings.mode || 'complete', [['emergency', 'Revisão de Emergência'], ['complete', 'Aprendizado Completo']], v => { st.settings.mode = v; App.save(); toast('Modo alterado. Conteúdo e progresso são os mesmos.'); }))),
      h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('h2', {}, 'Algoritmo de recomendação'),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'prioridade = importância × p1 + lacuna × p2 + pré-requisito × p3 + urgência × p4. Heurística ajustável, não modelo validado.'),
        ...[['importance', 'p1 · Importância'], ['gap', 'p2 · Lacuna de aprendizagem'], ['prereq', 'p3 · Pré-requisitos'], ['urgency', 'p4 · Urgência de revisão']].map(([k, l]) => h('div', { class: 'switch-row' }, h('span', {}, l), num(W[k], v => { W[k] = v; App.save(); }))),
        h('h3', { style: { marginTop: '8px' } }, 'Importância estimada por módulo'), h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Valores iniciais heurísticos — não são pesos oficiais da prova.'),
        ...CONFIG.groups.map(g => h('div', { class: 'switch-row' }, h('span', {}, g.name), num(st.settings.importance[g.id] ?? g.importance, v => { st.settings.importance[g.id] = v; App.save(); }))),
        h('button', { class: 'btn sm ghost', onclick: () => { st.settings.weights = { ...CONFIG.defaults.weights }; st.settings.importance = {}; App.save(); render(); } }, 'Restaurar valores padrão')),
      h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('h2', {}, 'Backup do progresso'),
        h('p', { class: 'small', style: { margin: 0 } }, `O progresso fica salvo apenas neste navegador${Store.isStorageOk() ? '' : ' — ATENÇÃO: o armazenamento local não está disponível agora; exporte para não perder dados'}. Ele não sincroniza sozinho entre dispositivos: para levar a outro aparelho, exporte aqui e importe lá.`),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: exportFile }, icon('download'), 'Exportar progresso (.json)'), h('label', { class: 'btn', for: 'imp', tabindex: '0', onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } } }, icon('upload'), 'Importar progresso'), fileIn,
          Store.readBackup(App.storage) ? h('button', { class: 'btn ghost', onclick: restoreBackup }, 'Restaurar backup anterior à última importação') : null)),
      h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('h2', {}, 'Resetar'),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Cada opção pede confirmação. Exporte antes se quiser guardar.'),
        h('div', { class: 'row' },
          resetBtn('Questões resolvidas (anti-repetição)', 'Todas as questões voltam a ser inéditas. Desempenho e domínio são mantidos.', () => { st.solved = {}; }),
          resetBtn('Flashcards', 'Todos os cartões voltam para "novos".', () => { st.flash = { cards: {}, lastId: null, filter: 'all' }; }),
          resetBtn('Simulados', 'Apaga o histórico de simulados (as respostas continuam no histórico geral).', () => { st.exams = []; st.examDraft = null; }),
          resetBtn('Laboratórios', 'Todos os cenários voltam ao estado inicial.', () => { st.lab = { scenario: 'lab346', states: {} }; }),
          resetBtn('TUDO (recomeçar do zero)', 'Apaga todo o progresso: histórico, domínio, cronograma, flashcards, simulados e laboratórios.', () => { App.st = Store.defaultState(); }, true))),
      h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('h2', {}, 'Matriz de cobertura'), h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Conteúdo'), h('th', {}, 'Fonte'))), h('tbody', {}, Cards.coverage.map(([c, s]) => h('tr', {}, h('td', {}, c), h('td', { class: 'small' }, s))))))),
      h('section', { class: 'card stack', style: { marginTop: '16px' } }, h('h2', {}, 'Usar no celular (offline)'),
        h('ol', { class: 'small', style: { margin: 0 } }, h('li', {}, 'Copie o arquivo estudo_prova2.html para o celular (cabo USB, Bluetooth ou nuvem — o arquivo em si funciona sem internet).'), h('li', {}, 'Abra pelo gerenciador de arquivos com o navegador (Firefox para Android costuma abrir arquivos locais; alguns navegadores bloqueiam file://).'), h('li', {}, 'Se o navegador não salvar o progresso em arquivo local, use Exportar/Importar ao terminar cada sessão.'), h('li', {}, 'Alternativa sem internet: no notebook, rode um servidor local (ex.: "python3 -m http.server" na pasta) e acesse pelo Wi-Fi da mesma rede. Não testado neste ambiente.'))),
      h('p', { class: 'tiny muted', style: { marginTop: '16px' } }, `Versão ${CONFIG.appVersion} · estado v${CONFIG.stateVersion} · terminal IOS é um subconjunto educacional, não um emulador completo.`));
  }
  function resetBtn(label, body, fn, danger) {
    return h('button', { class: `btn sm ${danger ? 'danger' : ''}`, onclick: async () => { if (!await confirmDialog({ title: `Resetar: ${label}?`, body, ok: 'Resetar', danger: true })) return; fn(); App.save(true); App.applyTheme(); updateNavCounts(); toast('Feito.'); render(); } }, label);
  }
  function exportFile() {
    const blob = new Blob([JSON.stringify(App.st, null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `progresso-redes-prova2-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Arquivo de progresso gerado.');
  }
  function importFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Arquivo grande demais para ser um progresso desta plataforma.'); return; }
    const rd = new FileReader();
    rd.onload = async () => {
      let obj; try { obj = JSON.parse(rd.result); } catch (e) { toast('O arquivo não é um JSON válido.'); return; }
      const v = Store.validate(obj);
      if (!v.ok) { await confirmDialog({ title: 'Não foi possível importar', body: h('ul', {}, v.errors.map(x => h('li', {}, x))), ok: 'OK', cancel: 'Fechar' }); return; }
      const s = Store.summary(v.state), cur = Store.summary(App.st);
      const body = h('div', { class: 'small' }, h('p', {}, 'Isto vai SUBSTITUIR o progresso atual deste navegador. Um backup do atual será guardado e poderá ser restaurado.'),
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Atual'), h('th', {}, 'Arquivo'))), h('tbody', {}, [['Respostas', cur.attempts, s.attempts], ['Simulados', cur.exams, s.exams], ['Blocos concluídos', cur.blocksDone, s.blocksDone], ['Última atualização', new Date(cur.updatedAt).toLocaleString('pt-BR'), new Date(s.updatedAt).toLocaleString('pt-BR')]].map(r => h('tr', {}, r.map(c => h('td', {}, String(c))))))));
      if (!await confirmDialog({ title: 'Importar este progresso?', body, ok: 'Substituir pelo arquivo' })) return;
      Store.backup(App.storage, App.st); App.st = v.state; App.applyTheme(); App.save(true); updateNavCounts(); toast('Progresso importado.'); render();
    };
    rd.readAsText(file);
  }
  async function restoreBackup() {
    const b = Store.readBackup(App.storage); const v = b && Store.validate(b);
    if (!v || !v.ok) { toast('Backup indisponível ou inválido.'); return; }
    if (!await confirmDialog({ title: 'Restaurar o backup?', body: 'O progresso atual será trocado pelo que existia antes da última importação.', ok: 'Restaurar' })) return;
    App.st = v.state; App.applyTheme(); App.save(true); updateNavCounts(); render(); toast('Backup restaurado.');
  }
  render();
  return root;
};

Pages.notFound = () => h('div', { class: 'content narrow' }, pageHead('Página não encontrada', 'O endereço não corresponde a nenhuma seção.'), h('a', { class: 'btn primary', href: '#/inicio' }, 'Ir para o início'));
