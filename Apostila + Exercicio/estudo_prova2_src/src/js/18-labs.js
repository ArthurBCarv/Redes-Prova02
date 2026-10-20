/* ==========================================================================
   Cenários do laboratório: topologia inicial, tarefas verificáveis, solução
   ========================================================================== */
const Labs = (() => {
  const { makeSwitch, makeRouter, faRange } = IOS;
  const swPorts = [...faRange(1, 24), 'Gi0/1', 'Gi0/2'];
  const host = (id, sw, port, ip, mask, gw, mac, dhcp = false) => ({ id, sw, port, ip, mask, gw, mac, dhcp });
  const P = (lab, d, p) => lab.devices[d].ports[p];
  const vlanNamed = (lab, d, v, re) => !!lab.devices[d].vlans[v] && (!re || re.test(lab.devices[d].vlans[v].name));
  const pingOk = (lab, a, b) => IOS.ping(lab, a, b).ok;

  const scenarios = [
    {
      id: 'lab346', title: 'Lab 3.4.6 — VLANs e entroncamento', source: '7-3.4.6_Lab_-_Configure_VLANs_and_Trunking.pdf', level: 'basico', topics: ['vlan', 'trunk', 'ios'],
      goal: 'Criar VLANs nos dois switches, colocar PC-A e PC-B na VLAN 10, mover o gerenciamento para a VLAN 99 e configurar o tronco 802.1Q com VLAN nativa 1000.',
      build() {
        const S1 = makeSwitch('S1', swPorts, { mac: '0cd9.96e2.3d00' }), S2 = makeSwitch('S2', swPorts, { mac: '0cd9.96d2.4000' });
        S1.svis[1] = { ip: '192.168.1.11', mask: '255.255.255.0', shutdown: false };
        S2.svis[1] = { ip: '192.168.1.12', mask: '255.255.255.0', shutdown: false };
        return {
          devices: { S1, S2 }, links: [{ a: 'S1', pa: 'Fa0/1', b: 'S2', pb: 'Fa0/1' }],
          hosts: { 'PC-A': host('PC-A', 'S1', 'Fa0/6', '192.168.10.3', '255.255.255.0', '192.168.10.1', '0050.7966.6801'), 'PC-B': host('PC-B', 'S2', 'Fa0/18', '192.168.10.4', '255.255.255.0', '192.168.10.1', '0050.7966.6802') },
        };
      },
      tasks: [
        { id: 't1', text: 'Em S1 e S2, crie as VLANs 10 (Operations), 20 (Parking_Lot), 99 (Management) e 1000 (Native).', hint: 'vlan 10 → name Operations → vlan 20 → …', check: l => ['S1', 'S2'].every(d => [10, 20, 99, 1000].every(v => vlanNamed(l, d, v))) },
        { id: 't2', text: 'Coloque a porta do PC-A (S1 Fa0/6) e do PC-B (S2 Fa0/18) em modo access na VLAN 10.', hint: 'interface f0/6 → switchport mode access → switchport access vlan 10', check: l => P(l, 'S1', 'Fa0/6').mode === 'access' && P(l, 'S1', 'Fa0/6').access === 10 && P(l, 'S2', 'Fa0/18').mode === 'access' && P(l, 'S2', 'Fa0/18').access === 10 },
        { id: 't3', text: 'Mova o IP de gerenciamento da VLAN 1 para a VLAN 99 em ambos (S1 192.168.1.11, S2 192.168.1.12 /24) e ative a SVI.', hint: 'interface vlan 1 → no ip address → interface vlan 99 → ip address … → no shutdown', check: l => !l.devices.S1.svis[1].ip && !l.devices.S2.svis[1].ip && l.devices.S1.svis[99]?.ip === '192.168.1.11' && l.devices.S2.svis[99]?.ip === '192.168.1.12' && !l.devices.S1.svis[99].shutdown && !l.devices.S2.svis[99].shutdown },
        { id: 't4', text: 'Verifique: PC-A consegue pingar PC-B agora? Use o painel de ping. (Ainda não deve funcionar — por quê?)', hint: 'Sem trunk, Fa0/1 dos dois lados ficou em dynamic auto: auto + auto não forma tronco.', check: (l, ctx) => !!(ctx && ctx.pings && ctx.pings.some(p => p.a === 'PC-A' && p.b === 'PC-B')), observe: true },
        { id: 't5', text: 'Configure Fa0/1 como trunk manualmente nos DOIS switches.', hint: 'interface f0/1 → switchport mode trunk', check: l => P(l, 'S1', 'Fa0/1').mode === 'trunk' && P(l, 'S2', 'Fa0/1').mode === 'trunk' },
        { id: 't6', text: 'Altere a VLAN nativa do tronco para 1000 nos dois lados.', hint: 'switchport trunk native vlan 1000', check: l => P(l, 'S1', 'Fa0/1').native === 1000 && P(l, 'S2', 'Fa0/1').native === 1000 },
        { id: 't7', text: 'Confirme: PC-A pinga PC-B e o tronco aparece em "show interfaces trunk".', hint: 'Use o painel de ping e o comando show interfaces trunk.', check: l => pingOk(l, 'PC-A', 'PC-B') && IOS.trunkUp(l, 'S1', 'Fa0/1') },
        { id: 't8', text: 'Salve a configuração dos dois switches.', hint: 'copy running-config startup-config', check: l => l.devices.S1.saved && l.devices.S2.saved },
      ],
      solution: {
        S1: ['enable', 'configure terminal', 'vlan 10', 'name Operations', 'vlan 20', 'name Parking_Lot', 'vlan 99', 'name Management', 'vlan 1000', 'name Native', 'exit', 'interface f0/6', 'switchport mode access', 'switchport access vlan 10', 'interface vlan 1', 'no ip address', 'interface vlan 99', 'ip address 192.168.1.11 255.255.255.0', 'no shutdown', 'interface f0/1', 'switchport mode trunk', 'switchport trunk native vlan 1000', 'end', 'copy running-config startup-config'],
        S2: ['enable', 'configure terminal', 'vlan 10', 'name Operations', 'vlan 20', 'name Parking_Lot', 'vlan 99', 'name Management', 'vlan 1000', 'name Native', 'exit', 'interface f0/18', 'switchport mode access', 'switchport access vlan 10', 'interface vlan 1', 'no ip address', 'interface vlan 99', 'ip address 192.168.1.12 255.255.255.0', 'no shutdown', 'interface f0/1', 'switchport mode trunk', 'switchport trunk native vlan 1000', 'end', 'copy running-config startup-config'],
      },
      questions: [
        { q: 'Antes do tronco, por que PC-A não pinga PC-B?', a: 'As duas pontas de Fa0/1 estavam em dynamic auto (DTP): auto + auto não negocia tronco, e o enlace ficou como access na VLAN 1. A VLAN 10 não atravessa.' },
        { q: 'Por que configurar o tronco manualmente em vez de depender do DTP?', a: 'Comportamento previsível e mais seguro: evita que uma porta negocie trunk com um equipamento não autorizado (VLAN hopping por DTP).' },
        { q: 'Por que mudar a VLAN nativa?', a: 'A nativa trafega sem tag. Usar uma VLAN sem usuários (1000 no lab, 999 no slide) reduz o risco de double tagging e evita misturar tráfego de usuários com a VLAN 1.' },
        { q: 'O que é necessário para hosts da VLAN 10 falarem com a VLAN 99?', a: 'Roteamento Inter-VLAN: um roteador (subinterfaces) ou switch L3 (SVIs + ip routing), além de gateways corretos.' },
      ],
    },
    {
      id: 'roas', title: 'Router-on-a-Stick (Inter-VLAN com roteador)', source: '6-Comandos.pdf · 8-VLAN.pdf', level: 'intermediario', topics: ['intervlan', 'trunk', 'ios'],
      goal: 'Fazer PC-A (VLAN 10) pingar PC-B (VLAN 20) usando subinterfaces 802.1Q em R1.',
      build() {
        const S1 = makeSwitch('S1', swPorts, { mac: '0001.4200.1111' }); const R1 = makeRouter('R1', ['Gi0/0', 'Gi0/1']);
        return {
          devices: { S1, R1 }, links: [{ a: 'S1', pa: 'Fa0/24', b: 'R1', pb: 'Gi0/0' }],
          hosts: { 'PC-A': host('PC-A', 'S1', 'Fa0/1', '192.168.10.10', '255.255.255.0', '192.168.10.1', '0050.7966.0a01'), 'PC-B': host('PC-B', 'S1', 'Fa0/2', '192.168.20.10', '255.255.255.0', '192.168.20.1', '0050.7966.1401') },
        };
      },
      tasks: [
        { id: 't1', text: 'Em S1, crie as VLANs 10 e 20 e coloque Fa0/1 na VLAN 10 e Fa0/2 na VLAN 20 (access).', hint: 'vlan 10, vlan 20; interface f0/1 → switchport mode access → switchport access vlan 10', check: l => P(l, 'S1', 'Fa0/1').mode === 'access' && P(l, 'S1', 'Fa0/1').access === 10 && P(l, 'S1', 'Fa0/2').mode === 'access' && P(l, 'S1', 'Fa0/2').access === 20 },
        { id: 't2', text: 'Configure Fa0/24 (ligada ao roteador) como trunk.', hint: 'interface f0/24 → switchport mode trunk', check: l => P(l, 'S1', 'Fa0/24').mode === 'trunk' },
        { id: 't3', text: 'Em R1, ative a interface física Gi0/0.', hint: 'interface g0/0 → no shutdown', check: l => !l.devices.R1.ifaces['Gi0/0'].shutdown },
        { id: 't4', text: 'Crie Gi0/0.10 com encapsulation dot1Q 10 e IP 192.168.10.1/24.', hint: 'interface g0/0.10 → encapsulation dot1Q 10 → ip address 192.168.10.1 255.255.255.0', check: l => { const f = l.devices.R1.ifaces['Gi0/0.10']; return !!f && f.encap === 10 && f.ip === '192.168.10.1' && f.mask === '255.255.255.0'; } },
        { id: 't5', text: 'Crie Gi0/0.20 com encapsulation dot1Q 20 e IP 192.168.20.1/24.', hint: 'Mesmo padrão da .10', check: l => { const f = l.devices.R1.ifaces['Gi0/0.20']; return !!f && f.encap === 20 && f.ip === '192.168.20.1'; } },
        { id: 't6', text: 'Teste: PC-A pinga PC-B. Depois veja "show ip route" em R1.', hint: 'Duas rotas conectadas (C) devem aparecer.', check: l => pingOk(l, 'PC-A', 'PC-B') },
      ],
      solution: {
        S1: ['enable', 'configure terminal', 'vlan 10', 'vlan 20', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'interface f0/24', 'switchport mode trunk', 'end'],
        R1: ['enable', 'configure terminal', 'interface g0/0', 'no shutdown', 'interface g0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'interface g0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0', 'end'],
      },
      questions: [
        { q: 'Por que o enlace S1–R1 precisa ser trunk?', a: 'Ele carrega quadros de duas VLANs; a tag 802.1Q diz ao roteador para qual subinterface cada quadro vai.' },
        { q: 'O roteador só "troca a VLAN" do quadro?', a: 'Não. Ele desencapsula o quadro, roteia o pacote IP pela tabela de rotas e cria um quadro Ethernet novo (MACs novos) com a tag da VLAN de saída.' },
      ],
    },
    {
      id: 'svi', title: 'Switch camada 3 com SVIs', source: 'Complemento (citado em 8-VLAN.pdf: distribuição com switches L3)', level: 'intermediario', topics: ['intervlan', 'ios'],
      goal: 'Rotear entre VLAN 10 e VLAN 20 dentro de um switch multicamadas (MLS1) usando interfaces VLAN e ip routing.',
      build() {
        const M = makeSwitch('MLS1', swPorts, { l3: true, mac: '0002.1700.aaaa' });
        return { devices: { MLS1: M }, links: [], hosts: { 'PC-A': host('PC-A', 'MLS1', 'Fa0/1', '192.168.10.10', '255.255.255.0', '192.168.10.1', '0050.7966.0b01'), 'PC-B': host('PC-B', 'MLS1', 'Fa0/2', '192.168.20.10', '255.255.255.0', '192.168.20.1', '0050.7966.0b02') } };
      },
      tasks: [
        { id: 't1', text: 'Crie as VLANs 10 e 20 e coloque Fa0/1 (VLAN 10) e Fa0/2 (VLAN 20) em access.', hint: 'Igual ao lab anterior', check: l => P(l, 'MLS1', 'Fa0/1').access === 10 && P(l, 'MLS1', 'Fa0/2').access === 20 && P(l, 'MLS1', 'Fa0/1').mode === 'access' && P(l, 'MLS1', 'Fa0/2').mode === 'access' },
        { id: 't2', text: 'Crie interface vlan 10 (192.168.10.1/24) e interface vlan 20 (192.168.20.1/24), ambas com no shutdown.', hint: 'interface vlan 10 → ip address … → no shutdown', check: l => { const s = l.devices.MLS1.svis; return s[10]?.ip === '192.168.10.1' && !s[10].shutdown && s[20]?.ip === '192.168.20.1' && !s[20].shutdown; } },
        { id: 't3', text: 'Antes de habilitar o roteamento, teste o ping PC-A → PC-B (deve falhar).', hint: 'Sem ip routing as SVIs não encaminham entre si.', check: (l, ctx) => !!(ctx && ctx.pings && ctx.pings.some(p => p.a === 'PC-A' && !p.ok)), observe: true },
        { id: 't4', text: 'Habilite o roteamento IP no switch e teste novamente.', hint: 'ip routing (modo de configuração global)', check: l => l.devices.MLS1.ipRouting && pingOk(l, 'PC-A', 'PC-B') },
      ],
      solution: { MLS1: ['enable', 'configure terminal', 'vlan 10', 'vlan 20', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'interface vlan 10', 'ip address 192.168.10.1 255.255.255.0', 'no shutdown', 'interface vlan 20', 'ip address 192.168.20.1 255.255.255.0', 'no shutdown', 'exit', 'ip routing', 'end'] },
      questions: [{ q: 'Uma SVI de gerenciamento em switch L2 roteia?', a: 'Não. Ela dá um IP ao switch para gerência; roteamento entre VLANs exige equipamento L3 com ip routing.' }],
    },
    {
      id: 'dhcp', title: 'DHCP no roteador para cada VLAN', source: '6-Comandos.pdf · 8-VLAN.pdf', level: 'intermediario', topics: ['intervlan', 'ios'],
      goal: 'Com o router-on-a-stick já pronto, configurar pools DHCP para que PC-A e PC-B obtenham IP automaticamente, excluindo os endereços do gateway.',
      build() {
        const lab = scenarios[1].build();
        let L = lab; let sS = IOS.newSession('S1'), sR = IOS.newSession('R1');
        for (const c of scenarios[1].solution.S1) ({ lab: L, session: sS } = IOS.exec(L, sS, c));
        for (const c of scenarios[1].solution.R1) ({ lab: L, session: sR } = IOS.exec(L, sR, c));
        for (const h of Object.values(L.hosts)) { h.dhcp = true; h.ip = h.mask = h.gw = null; }
        return L;
      },
      tasks: [
        { id: 't1', text: 'Exclua do DHCP 192.168.10.1–192.168.10.10 e 192.168.20.1–192.168.20.10.', hint: 'ip dhcp excluded-address 192.168.10.1 192.168.10.10', check: l => { const e = l.devices.R1.dhcp.excluded; return e.some(x => x[0] === '192.168.10.1' && x[1] === '192.168.10.10') && e.some(x => x[0] === '192.168.20.1' && x[1] === '192.168.20.10'); } },
        { id: 't2', text: 'Crie o pool VLAN10 (rede 192.168.10.0/24, default-router 192.168.10.1).', hint: 'ip dhcp pool VLAN10 → network 192.168.10.0 255.255.255.0 → default-router 192.168.10.1', check: l => Object.values(l.devices.R1.dhcp.pools).some(p => p.network === '192.168.10.0' && p.mask === '255.255.255.0' && p.router === '192.168.10.1') },
        { id: 't3', text: 'Crie o pool VLAN20 (rede 192.168.20.0/24, default-router 192.168.20.1).', hint: 'Mesmo padrão', check: l => Object.values(l.devices.R1.dhcp.pools).some(p => p.network === '192.168.20.0' && p.router === '192.168.20.1') },
        { id: 't4', text: 'Verifique: os PCs receberam IP (painel de hosts) e PC-A pinga PC-B. Confira "show ip dhcp binding".', hint: 'O primeiro IP entregue deve ser .11.', check: l => pingOk(l, 'PC-A', 'PC-B') && IOS.applyDhcp(l).hosts['PC-A'].ip === '192.168.10.11' },
      ],
      solution: { R1: ['enable', 'configure terminal', 'ip dhcp excluded-address 192.168.10.1 192.168.10.10', 'ip dhcp excluded-address 192.168.20.1 192.168.20.10', 'ip dhcp pool VLAN10', 'network 192.168.10.0 255.255.255.0', 'default-router 192.168.10.1', 'exit', 'ip dhcp pool VLAN20', 'network 192.168.20.0 255.255.255.0', 'default-router 192.168.20.1', 'end'] },
      questions: [{ q: 'Por que excluir endereços?', a: 'Para o DHCP não entregar a um PC o IP do gateway (ou de servidores fixos), o que causaria conflito.' }],
    },
    {
      id: 'stp', title: 'STP: controlar a Root Bridge', source: '5-Comutacao.pdf (LAB – STP) · stp-*.pkt', level: 'intermediario', topics: ['stp', 'ios'],
      goal: 'Descobrir quem é a raiz, tornar S3 a Root Bridge da VLAN 1 e observar a reconvergência ao derrubar um uplink.',
      build() {
        const S1 = makeSwitch('S1', swPorts, { mac: '0001.c7a1.0001' }), S2 = makeSwitch('S2', swPorts, { mac: '0001.c7a1.0002' }), S3 = makeSwitch('S3', swPorts, { mac: '0001.c7a1.0003' });
        for (const [d, ps] of [[S1, ['Fa0/1', 'Fa0/2']], [S2, ['Fa0/1', 'Fa0/2']], [S3, ['Fa0/1', 'Fa0/2']]]) for (const p of ps) d.ports[p].mode = 'trunk';
        return {
          devices: { S1, S2, S3 }, links: [{ a: 'S1', pa: 'Fa0/1', b: 'S2', pb: 'Fa0/1' }, { a: 'S1', pa: 'Fa0/2', b: 'S3', pb: 'Fa0/1' }, { a: 'S2', pa: 'Fa0/2', b: 'S3', pb: 'Fa0/2' }],
          hosts: { PC1: host('PC1', 'S1', 'Fa0/10', '192.168.1.1', '255.255.255.0', null, '0050.7966.0c01'), PC2: host('PC2', 'S2', 'Fa0/10', '192.168.1.2', '255.255.255.0', null, '0050.7966.0c02'), PC3: host('PC3', 'S3', 'Fa0/10', '192.168.1.3', '255.255.255.0', null, '0050.7966.0c03') },
        };
      },
      tasks: [
        { id: 't1', text: 'Use "show spanning-tree" em cada switch. Quem é a Root Bridge? (prioridades iguais → menor MAC)', hint: 'Compare os MACs: …0001 < …0002 < …0003.', check: (l, ctx) => !!(ctx && ctx.answers && ctx.answers.root === 'S1'), ask: { key: 'root', options: ['S1', 'S2', 'S3'] } },
        { id: 't2', text: 'Torne S3 a Root Bridge da VLAN 1 ajustando a prioridade.', hint: 'Em S3: spanning-tree vlan 1 priority 4096', check: l => IOS.stpForVlan(l, 1).r.rootOf.S3 === 'S3' },
        { id: 't3', text: 'Derrube o enlace S2–S3 (shutdown em S2 Fa0/2) e confirme que PC1 ainda pinga PC2.', hint: 'interface f0/2 → shutdown em S2', check: l => P(l, 'S2', 'Fa0/2').shutdown && pingOk(l, 'PC1', 'PC2') },
        { id: 't4', text: 'Ative PortFast e BPDU Guard na porta do PC3 (S3 Fa0/10).', hint: 'spanning-tree portfast · spanning-tree bpduguard enable', check: l => P(l, 'S3', 'Fa0/10').portfast && P(l, 'S3', 'Fa0/10').bpduguard },
      ],
      solution: { S3: ['enable', 'configure terminal', 'spanning-tree vlan 1 priority 4096', 'interface f0/10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'end'], S2: ['enable', 'configure terminal', 'interface f0/2', 'shutdown', 'end'] },
      questions: [{ q: 'Por que a prioridade aparece como 4097 no show spanning-tree?', a: 'Com PVST+, a BID soma a prioridade configurada com o System ID Extension (número da VLAN): 4096 + 1.' }],
    },
    {
      id: 'desafio', title: 'Desafio: 192.168.250.0/24 com 3 VLANs + DHCP', source: '8-VLAN.pdf (Desafio)', level: 'avancado', topics: ['vlsm', 'intervlan', 'ios'], challenge: true,
      goal: '3 VLANs (10 Engenharia, 20 Financeiro, 30 Administrativo), cada uma com no mínimo 30 IPs, a partir de 192.168.250.0/24 com VLSM; roteador R1 com router-on-a-stick e DHCP para todas. Gateway = primeiro IP de cada sub-rede. Sem passo a passo: só verificação.',
      build() {
        const S1 = makeSwitch('S1', swPorts, { mac: '0001.4200.2222' }); const R1 = makeRouter('R1', ['Gi0/0', 'Gi0/1']);
        return {
          devices: { S1, R1 }, links: [{ a: 'S1', pa: 'Gi0/1', b: 'R1', pb: 'Gi0/0' }],
          hosts: { ENG: host('ENG', 'S1', 'Fa0/1', null, null, null, '0050.7966.0d01', true), FIN: host('FIN', 'S1', 'Fa0/2', null, null, null, '0050.7966.0d02', true), ADM: host('ADM', 'S1', 'Fa0/3', null, null, null, '0050.7966.0d03', true) },
        };
      },
      tasks: [
        { id: 't1', text: 'VLANs 10, 20 e 30 criadas com nomes; ENG (Fa0/1) na 10, FIN (Fa0/2) na 20, ADM (Fa0/3) na 30.', check: l => [[10, 'Fa0/1'], [20, 'Fa0/2'], [30, 'Fa0/3']].every(([v, p]) => l.devices.S1.vlans[v] && !/^VLAN0/.test(l.devices.S1.vlans[v].name) && P(l, 'S1', p).access === v && P(l, 'S1', p).mode === 'access') },
        { id: 't2', text: 'Subinterfaces de R1 com gateways corretos para sub-redes /27 (o menor bloco que comporta 30 hosts).', check: l => { const f = l.devices.R1.ifaces; return [[10, '192.168.250.1'], [20, '192.168.250.33'], [30, '192.168.250.65']].every(([v, ip]) => Object.values(f).some(x => x.encap === v && x.ip === ip && x.mask === '255.255.255.224')); } },
        { id: 't3', text: 'DHCP entregando endereços nas três VLANs (gateway excluído).', check: l => { const L = IOS.applyDhcp(l); return ['ENG', 'FIN', 'ADM'].every(h => L.hosts[h].ip && L.hosts[h].gw && L.hosts[h].ip !== L.hosts[h].gw); } },
        { id: 't4', text: 'ENG pinga FIN e ADM.', check: l => pingOk(l, 'ENG', 'FIN') && pingOk(l, 'ENG', 'ADM') },
      ],
      solution: {
        S1: ['enable', 'configure terminal', 'vlan 10', 'name Engenharia', 'vlan 20', 'name Financeiro', 'vlan 30', 'name Administrativo', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'interface f0/3', 'switchport mode access', 'switchport access vlan 30', 'interface g0/1', 'switchport mode trunk', 'end'],
        R1: ['enable', 'configure terminal', 'interface g0/0', 'no shutdown', 'interface g0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.250.1 255.255.255.224', 'interface g0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.250.33 255.255.255.224', 'interface g0/0.30', 'encapsulation dot1Q 30', 'ip address 192.168.250.65 255.255.255.224', 'exit', 'ip dhcp excluded-address 192.168.250.1', 'ip dhcp excluded-address 192.168.250.33', 'ip dhcp excluded-address 192.168.250.65', 'ip dhcp pool ENG', 'network 192.168.250.0 255.255.255.224', 'default-router 192.168.250.1', 'ip dhcp pool FIN', 'network 192.168.250.32 255.255.255.224', 'default-router 192.168.250.33', 'ip dhcp pool ADM', 'network 192.168.250.64 255.255.255.224', 'default-router 192.168.250.65', 'end'],
      },
      questions: [],
    },
  ];
  return { scenarios, byId: Object.fromEntries(scenarios.map(s => [s.id, s])) };
})();
