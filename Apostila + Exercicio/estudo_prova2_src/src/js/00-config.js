/* ==========================================================================
   Configuração: tópicos, grupos, pré-requisitos, pesos (editáveis)
   ========================================================================== */
const CONFIG = {
  appVersion: '1.0.0',
  stateVersion: 1,
  storageKey: 'redes-prova2-state',
  examDate: '2026-10-20',
  defaults: {
    totalMinutes: 600, blockMinutes: 50, breakMinutes: 10, wrapMinutes: 10,
    weights: { importance: 0.40, gap: 0.30, prereq: 0.20, urgency: 0.10 },
    gateThreshold: 0.45,       // domínio mínimo de um pré-requisito essencial
    reserveExamMinutes: 50,     // reservado para simulado
    reserveFinalMinutes: 50,    // reservado para revisão final
  },
  /** Grupos = os 5 módulos. Importância inicial heurística (não é peso oficial da prova). */
  groups: [
    { id: 'g-ipv4', name: 'IPv4 e classes', short: 'IPv4', importance: 0.75, module: 'ipv4' },
    { id: 'g-cidr', name: 'CIDR, sub-redes e VLSM', short: 'VLSM', importance: 1.00, module: 'cidr' },
    { id: 'g-ipv6', name: 'IPv6', short: 'IPv6', importance: 0.65, module: 'ipv6' },
    { id: 'g-stp', name: 'Comutação e STP', short: 'STP', importance: 0.80, module: 'stp' },
    { id: 'g-vlan', name: 'VLAN, trunk e Inter-VLAN', short: 'VLAN', importance: 0.90, module: 'vlan' },
  ],
  /** Tópicos finos usados no histórico e na recomendação. prereq = essenciais (gate). */
  topics: [
    { id: 'ipv4', name: 'Endereço IPv4, bits e classes', group: 'g-ipv4', prereq: [], module: 'ipv4', section: 'tecnica' },
    { id: 'mascara', name: 'Máscaras, rede e broadcast', group: 'g-cidr', prereq: ['ipv4'], module: 'cidr', section: 'tecnica' },
    { id: 'cidr', name: 'CIDR, blocos e sub-redes', group: 'g-cidr', prereq: ['mascara'], module: 'cidr', section: 'exemplo' },
    { id: 'vlsm', name: 'VLSM (planejamento)', group: 'g-cidr', prereq: ['cidr'], module: 'cidr', section: 'vlsm' },
    { id: 'sumarizacao', name: 'Sumarização / super-redes', group: 'g-cidr', prereq: ['cidr'], module: 'cidr', section: 'sumarizacao' },
    { id: 'ipv6', name: 'IPv6', group: 'g-ipv6', prereq: ['ipv4'], module: 'ipv6', section: 'tecnica' },
    { id: 'comutacao', name: 'Tipos de comutação', group: 'g-stp', prereq: [], module: 'stp', section: 'tecnica' },
    { id: 'mac', name: 'Ethernet, MAC e domínios', group: 'g-stp', prereq: ['comutacao'], module: 'stp', section: 'ethernet' },
    { id: 'stp', name: 'Spanning Tree', group: 'g-stp', prereq: ['mac'], module: 'stp', section: 'stp' },
    { id: 'vlan', name: 'VLANs e access', group: 'g-vlan', prereq: ['mac'], module: 'vlan', section: 'tecnica' },
    { id: 'trunk', name: 'Trunk e 802.1Q', group: 'g-vlan', prereq: ['vlan'], module: 'vlan', section: 'trunk' },
    { id: 'intervlan', name: 'Roteamento Inter-VLAN', group: 'g-vlan', prereq: ['trunk', 'mascara'], module: 'vlan', section: 'intervlan' },
    { id: 'ios', name: 'Comandos Cisco IOS', group: 'g-vlan', prereq: ['vlan'], module: 'vlan', section: 'ios' },
  ],
  /** Cronograma de emergência inicial: 10 blocos. topics = foco do bloco. */
  blocks: [
    { title: 'Diagnóstico + IPv4 básico', goal: 'Entender IP, bits, rede e host', topics: ['ipv4'], kind: 'study' },
    { title: 'Máscaras e CIDR', goal: 'Calcular rede, hosts e broadcast', topics: ['mascara', 'cidr'], kind: 'study' },
    { title: 'VLSM básico', goal: 'Entender blocos e máscaras', topics: ['cidr', 'vlsm'], kind: 'study' },
    { title: 'VLSM aplicado', goal: 'Resolver os exercícios do professor', topics: ['vlsm', 'sumarizacao'], kind: 'study' },
    { title: 'IPv6 + revisão', goal: 'Compreender IPv6 e revisar IPv4', topics: ['ipv6', 'mascara'], kind: 'study' },
    { title: 'Comutação, MAC e STP', goal: 'Entender o comportamento dos switches', topics: ['comutacao', 'mac', 'stp'], kind: 'study' },
    { title: 'VLANs e Trunk', goal: 'Entender segmentação e 802.1Q', topics: ['vlan', 'trunk'], kind: 'study' },
    { title: 'Inter-VLAN e Cisco IOS', goal: 'Interpretar e configurar redes', topics: ['intervlan', 'ios'], kind: 'study' },
    { title: 'Simulado misto', goal: 'Avaliar conhecimento independente', topics: [], kind: 'exam' },
    { title: 'Revisão direcionada', goal: 'Corrigir lacunas e consolidar', topics: [], kind: 'final' },
  ],
  /** Tags de erro → conceito (para "Meus pontos fracos"). */
  errorTags: {
    'rede-vs-broadcast': { name: 'Confusão entre rede e broadcast', topic: 'mascara' },
    'escolha-mascara': { name: 'Erro na escolha da máscara/prefixo', topic: 'cidr' },
    'salto': { name: 'Dificuldade com o salto entre sub-redes', topic: 'mascara' },
    'contagem-hosts': { name: 'Contagem de hosts (2^h − 2)', topic: 'mascara' },
    'binario': { name: 'Conversão decimal ↔ binário', topic: 'ipv4' },
    'classes': { name: 'Classes e endereços especiais', topic: 'ipv4' },
    'alinhamento': { name: 'Alinhamento/sobreposição de blocos', topic: 'vlsm' },
    'ordem-vlsm': { name: 'Ordem/alocação no VLSM', topic: 'vlsm' },
    'sumarizacao': { name: 'Sumarização de redes', topic: 'sumarizacao' },
    'ipv6-abrev': { name: 'Abreviação/expansão IPv6', topic: 'ipv6' },
    'ipv6-tipos': { name: 'Tipos de endereço IPv6 / NDP', topic: 'ipv6' },
    'tipos-comutacao': { name: 'Tipos de comutação', topic: 'comutacao' },
    'dominios': { name: 'Domínio de colisão × broadcast', topic: 'mac' },
    'mac-learning': { name: 'Aprendizado MAC e flooding', topic: 'mac' },
    'root-bridge': { name: 'Eleição da Root Bridge', topic: 'stp' },
    'papeis-porta': { name: 'Papéis de porta (RP/DP/bloqueada)', topic: 'stp' },
    'estados-stp': { name: 'Estados STP × RSTP', topic: 'stp' },
    'access-vs-trunk': { name: 'Confusão entre access e trunk', topic: 'trunk' },
    'dot1q': { name: 'Campos da tag 802.1Q / VLAN nativa', topic: 'trunk' },
    'vlan-conceito': { name: 'Conceito de VLAN / isolamento', topic: 'vlan' },
    'intervlan': { name: 'Roteamento Inter-VLAN', topic: 'intervlan' },
    'ios-sintaxe': { name: 'Dificuldade com comandos Cisco', topic: 'ios' },
  },
};
