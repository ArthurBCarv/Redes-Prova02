/* ==========================================================================
   Conteúdo didático dos 5 módulos (esqueleto de 10 etapas) + "Saiba mais"
   Marcadores no HTML: {{sm:id}} = botão Saiba mais · {{w:id}} = widget interativo
   {{prof}} / {{comp}} = selo de origem do conteúdo
   ========================================================================== */
const Content = (() => {
  const c = s => `<code>${s}</code>`;
  const modules = [
    /* =============================== MÓDULO 1 =============================== */
    {
      id: 'ipv4', n: 1, title: 'IPv4 e classes', group: 'g-ipv4', topics: ['ipv4'], minutes: 50,
      sources: ['4-Revisao-VLSM.pdf (classes, bits, AND)', '1/2-Modelo_TCPIP_-_VLSM.pdf'],
      objectives: [
        'Converter um octeto entre decimal e binário usando os pesos 128…1.',
        'Separar, com a máscara, a parte de rede e a parte de host de um IPv4.',
        'Classificar um endereço (A, B, C, D, E, loopback, privado) pelo primeiro octeto.',
        'Calcular rede e broadcast de um endereço com máscara padrão usando a operação AND.',
      ],
      intuition: `<p>Pense no endereço IPv4 como um <strong>endereço postal</strong>: uma parte diz a <em>rua</em> (a rede) e outra diz o <em>número da casa</em> (o host). Os roteadores só olham a "rua" para decidir para onde mandar o pacote; dentro da rua, a entrega é local.</p>
<p class="limit"><strong>Limite da analogia:</strong> numa rua real o tamanho é fixo; no IPv4 quem decide onde termina a "rua" e começa o "número" é a <strong>máscara</strong>, e ela pode ser alterada.</p>`,
      technical: `<p>{{prof}} Um endereço IPv4 tem <strong>32 bits</strong>, escritos como 4 <strong>octetos</strong> decimais (0–255) separados por ponto: ${c('192.168.10.34')}. Cada octeto vale a soma dos pesos <strong>128 64 32 16 8 4 2 1</strong> dos bits ligados.</p>
<p>A <strong>máscara de sub-rede</strong> tem bits 1 contíguos à esquerda (parte de <strong>rede</strong>) e 0 à direita (parte de <strong>host</strong>). ${c('/24')} = ${c('255.255.255.0')} = 24 bits de rede e 8 de host.</p>
<ul><li><strong>Endereço de rede:</strong> todos os bits de host em 0 (obtido com IP <em>AND</em> máscara).</li><li><strong>Broadcast:</strong> todos os bits de host em 1.</li><li><strong>Hosts utilizáveis:</strong> os endereços entre eles → ${c('2^h − 2')}.</li></ul>
{{sm:ipv4-rede-broadcast}}
<h4>Classes (endereçamento classful — histórico)</h4>
<table class="tbl"><thead><tr><th>Classe</th><th>1º octeto</th><th>Máscara padrão</th><th>Uso</th></tr></thead><tbody>
<tr><td>A</td><td>1–126</td><td>255.0.0.0 (/8)</td><td>unicast</td></tr>
<tr><td>—</td><td>127</td><td>—</td><td>loopback (127.0.0.0/8)</td></tr>
<tr><td>B</td><td>128–191</td><td>255.255.0.0 (/16)</td><td>unicast</td></tr>
<tr><td>C</td><td>192–223</td><td>255.255.255.0 (/24)</td><td>unicast</td></tr>
<tr><td>D</td><td>224–239</td><td>—</td><td>multicast</td></tr>
<tr><td>E</td><td>240–255</td><td>—</td><td>experimental</td></tr></tbody></table>
<p><strong>Privados (RFC 1918):</strong> ${c('10.0.0.0/8')}, ${c('172.16.0.0/12')} (172.16 a 172.31) e ${c('192.168.0.0/16')}. Não são roteados na Internet pública.</p>
<div class="note correction"><strong>Correção das fontes.</strong> O PDF <em>Revisão VLSM</em> diz "Classe A: 1 à 127" e classifica ${c('186.232.240.100')} como classe C. Pela própria tabela, 186 está entre 128 e 191 → <strong>classe B</strong>; e 127 não é classe A utilizável: é <strong>loopback</strong>. Também, na página 5, o binário mostrado para 192.168.1.0 é, na verdade, o de 172.16.10.10.</div>
{{sm:classful}}
<p>{{comp}} Hoje usa-se <strong>CIDR</strong>: a classe não determina a máscara. Uma rede ${c('10.1.2.0/24')} é perfeitamente válida, mesmo 10 sendo "classe A".</p>`,
      visual: `{{w:bits}}`,
      worked: { title: `Rede e broadcast de ${c('10.30.40.100')} com máscara padrão (exemplo do professor)`, steps: [
        ['Identifique a classe pelo 1º octeto: 10 → classe A.', 'A classe define a máscara padrão no modelo classful.'],
        ['Máscara padrão: 255.0.0.0 (/8).', '8 bits de rede, 24 de host.'],
        ['AND bit a bit: 00001010.00011110.00101000.01100100 AND 11111111.00000000.00000000.00000000 = 00001010.0.0.0.', 'AND com 1 mantém o bit; AND com 0 zera.'],
        ['Rede = 10.0.0.0.', 'Todos os bits de host em 0.'],
        ['Broadcast = 10.255.255.255.', 'Todos os bits de host em 1.'],
      ] },
      guided: { title: `Agora você: ${c('172.16.10.10')} com máscara padrão`, steps: [
        { prompt: 'Qual a classe?', field: { type: 'choice', options: ['A', 'B', 'C'] }, answer: 1, explain: '172 está entre 128 e 191 → B.' },
        { prompt: 'Qual a máscara padrão (decimal)?', field: { type: 'ip' }, answer: '255.255.0.0', explain: 'Classe B → /16.' },
        { prompt: 'Endereço de rede?', field: { type: 'ip' }, answer: '172.16.0.0', explain: 'Zere os dois últimos octetos (bits de host).' },
        { prompt: 'Broadcast?', field: { type: 'ip' }, answer: '172.16.255.255', explain: 'Bits de host em 1 → .255.255.' },
      ] },
      practice: [{ gen: 'binary' }, { gen: 'ipClass' }, { bank: 'v-ipv4-3' }, { bank: 'v-ipv4-4' }, { gen: 'maskConvert', difficulty: 'basico' }],
      pitfalls: ['Achar que 127.x é classe A comum — é loopback.', 'Classificar 186.x como C (é B).', 'Achar que todo 172.x é privado (só 172.16–172.31).', 'Escrever binário com menos de 8 dígitos.', 'Confundir 256 valores (0–255) com valor máximo 256.'],
      check: 'Para conferir: a rede sempre tem os bits de host zerados, então termina em número par no último octeto (exceto /32), e o broadcast é ímpar.',
      smList: ['ipv4-rede-broadcast', 'classful'],
    },
    /* =============================== MÓDULO 2 =============================== */
    {
      id: 'cidr', n: 2, title: 'CIDR, sub-redes e VLSM', group: 'g-cidr', topics: ['mascara', 'cidr', 'vlsm', 'sumarizacao'], minutes: 150,
      sources: ['1/2-Modelo_TCPIP_-_VLSM.pdf', '3-Exercicios_de_Subrede.pdf', '4-Revisao-VLSM.pdf'],
      objectives: [
        'Calcular o endereço de rede, o broadcast e a faixa válida de hosts de qualquer sub-rede IPv4 (/8 a /30).',
        'Escolher o menor prefixo que comporta N hosts.',
        'Planejar um endereçamento VLSM sem sobreposição, alocando da maior para a menor demanda.',
        'Sumarizar redes contíguas e reconhecer quando o resumo inclui endereços extras.',
      ],
      intuition: `<p>Imagine uma <strong>régua de 256 centímetros</strong> (o último octeto de um /24). Dividir em sub-redes é cortar a régua em <strong>pedaços de tamanhos que são potências de 2</strong> — 128, 64, 32, 16… — e cada pedaço só pode começar numa marca múltipla do seu tamanho.</p>
<p class="limit"><strong>Limite da analogia:</strong> a régua não tem "pontas reservadas"; no IPv4 o primeiro endereço do pedaço (rede) e o último (broadcast) não vão para hosts.</p>`,
      technical: `<p>{{prof}} Para subdividir, <strong>pegamos bits emprestados</strong> da parte de host. Com k bits emprestados: <strong>sub-redes = 2^k</strong>; com h bits de host restantes: <strong>endereços = 2^h</strong> e <strong>hosts = 2^h − 2</strong>.</p>
{{sm:potencias-de-dois}}
<h4>Método do salto (do material)</h4>
<ol><li>Ache o <strong>octeto interessante</strong>: onde a máscara deixa de ser 255.</li><li><strong>Salto = 256 − valor da máscara</strong> nesse octeto.</li><li>As sub-redes começam nos múltiplos do salto.</li><li>O IP pertence ao bloco cujo início é o maior múltiplo ≤ ao valor do IP naquele octeto.</li><li>Broadcast = início do próximo bloco − 1.</li></ol>
<table class="tbl"><thead><tr><th>CIDR</th><th>Máscara</th><th>Bloco</th><th>Hosts</th></tr></thead><tbody>
${[[24, 256], [25, 128], [26, 64], [27, 32], [28, 16], [29, 8], [30, 4]].map(([p, b]) => `<tr><td>/${p}</td><td>${IPv4.maskStr(p)}</td><td>${b}</td><td>${b - 2}</td></tr>`).join('')}
<tr><td>/23</td><td>255.255.254.0</td><td>512</td><td>510</td></tr><tr><td>/22</td><td>255.255.252.0</td><td>1024</td><td>1022</td></tr><tr><td>/20</td><td>255.255.240.0</td><td>4096</td><td>4094</td></tr></tbody></table>
<p>{{comp}} Casos especiais: <strong>/31</strong> (RFC 3021) é usado em enlaces ponto a ponto com 2 endereços utilizáveis, sem rede/broadcast; <strong>/32</strong> representa um único endereço (ex.: loopback de roteador). Nos exercícios convencionais, o mínimo para 2 hosts é /30.</p>
<h4 id="vlsm">VLSM — Variable Length Subnet Mask</h4>
<p>{{prof}} O VLSM permite sub-redes de <strong>tamanhos diferentes</strong> dentro do mesmo bloco, reduzindo o desperdício. Procedimento:</p>
<ol><li>Ordene as demandas da <strong>maior para a menor</strong>.</li><li>Para cada uma, escolha o menor h com 2^h − 2 ≥ hosts.</li><li>Aloque na próxima fronteira múltipla do tamanho do bloco.</li><li>Confira: nenhum bloco pode sobrepor outro.</li></ol>
{{sm:vlsm-ordem}}
<div class="note correction"><strong>Correção das fontes.</strong> No PDF de VLSM: "duas redes com 254 hosts gerariam uma nova maior com 512 IPs disponíveis" — o /23 tem <strong>512 endereços</strong>, mas <strong>510 hosts</strong> utilizáveis. Na <em>Revisão VLSM</em>, a máscara 255.255.255.192 aparece como "= 27": é <strong>/26</strong> (24 + 2 bits). A tabela do /20 pula de 172.16.48.0 para 172.16.80.0; falta <strong>172.16.64.0</strong>. E "192.168127" é um erro de digitação de 192.168.1.127.</div>
<h4 id="sumarizacao">CIDR e sumarização</h4>
<p>{{prof}} Da mesma forma que dividimos, podemos <strong>agrupar</strong> redes contíguas e alinhadas: ${c('192.168.32.0/24')} + ${c('192.168.33.0/24')} = ${c('192.168.32.0/23')}. O prefixo do resumo é a quantidade de bits iniciais comuns.</p>
{{sm:cidr-sumarizacao}}
<p><strong>CIDR × VLSM:</strong> CIDR é a notação/roteamento sem classes (inclui sumarização); VLSM é usar máscaras de tamanhos variados num mesmo plano.</p>`,
      visual: `{{w:subnetBar}}`,
      worked: { title: `${c('192.168.30.100/27')} — Lista Q4`, steps: [
        ['/27 → 255.255.255.224.', '24 + 3 bits: 128 + 64 + 32 = 224.'],
        ['Octeto interessante: o 4º. Salto = 256 − 224 = 32.', 'É onde a máscara deixa de ser 255.'],
        ['Blocos: 0, 32, 64, 96, 128…', 'Múltiplos do salto.'],
        ['100 está entre 96 e 127 → rede 192.168.30.96.', 'O maior múltiplo de 32 que não passa de 100 é 96.'],
        ['Broadcast = 128 − 1 = 192.168.30.127; hosts .97–.126 (30).', 'Um antes do próximo bloco; 2^5 − 2 = 30.'],
      ] },
      guided: { title: `Agora você: ${c('172.16.150.1/22')} (Lista Q8)`, steps: [
        { prompt: 'Máscara decimal de /22?', field: { type: 'ip' }, answer: '255.255.252.0', explain: '16 + 6 → 3º octeto = 128+64+32+16+8+4 = 252.' },
        { prompt: 'Salto (no 3º octeto)?', field: { type: 'number' }, answer: 4, explain: '256 − 252 = 4.' },
        { prompt: 'Endereço de rede?', field: { type: 'ip' }, answer: '172.16.148.0', explain: 'Maior múltiplo de 4 ≤ 150 = 148.' },
        { prompt: 'Broadcast?', field: { type: 'ip' }, answer: '172.16.151.255', explain: 'Próximo bloco 152 → 151 no 3º octeto e .255 no 4º.' },
        { prompt: 'Hosts utilizáveis?', field: { type: 'number' }, answer: 1022, explain: '10 bits de host → 1024 − 2.' },
      ] },
      guided2: { title: `VLSM guiado: ${c('192.168.50.0/24')} com A = 50 e B = 20 hosts`, steps: [
        { prompt: 'Prefixo de A (50 hosts)?', field: { type: 'prefix' }, answer: '/26', explain: '2^6 − 2 = 62 ≥ 50; 2^5 − 2 = 30 não basta.' },
        { prompt: 'Rede de A?', field: { type: 'ip' }, answer: '192.168.50.0', explain: 'A maior vem primeiro, no início do bloco.' },
        { prompt: 'Prefixo de B (20 hosts)?', field: { type: 'prefix' }, answer: '/27', explain: '2^5 − 2 = 30 ≥ 20.' },
        { prompt: 'Rede de B?', field: { type: 'ip' }, answer: '192.168.50.64', explain: 'A ocupa .0–.63; .64 é múltiplo de 32 → alinhado.' },
      ] },
      practice: [{ gen: 'subnetInfo' }, { gen: 'minMask' }, { gen: 'nthSubnet' }, { gen: 'vlsm' }, { gen: 'alignment' }, { gen: 'summarize' }, { bank: 'prof-q11' }, { bank: 'prof-q20' }],
      pitfalls: ['Aplicar o salto no octeto errado (/22 varia no 3º).', 'Esquecer o −2 dos hosts (e aplicá-lo à contagem de sub-redes, onde não existe).', 'Escolher /27 para 60 hosts por "parecer próximo".', 'Alocar VLSM na ordem do enunciado.', 'Começar /26 em .32 (desalinhado — Lista Q19).', 'Responder 512 hosts para um /23 (são 510).'],
      check: 'Confira sempre: (1) a rede é múltiplo do bloco; (2) broadcast = rede + bloco − 1; (3) o IP dado está entre rede e broadcast; (4) no VLSM, cada bloco começa depois do broadcast do anterior.',
      smList: ['potencias-de-dois', 'vlsm-ordem', 'cidr-sumarizacao'],
    },
    /* =============================== MÓDULO 3 =============================== */
    {
      id: 'ipv6', n: 3, title: 'IPv6', group: 'g-ipv6', topics: ['ipv6'], minutes: 40, complement: true,
      sources: ['Complemento — não há slides de IPv6 entre os arquivos (o tema aparece no cronograma, aula de 29/09)'],
      objectives: ['Abreviar e expandir endereços IPv6 sem erro.', 'Identificar o tipo de um endereço pelo prefixo (global, link-local, ULA, multicast, loopback).', 'Explicar o papel de NDP e SLAAC e as diferenças principais em relação ao IPv4.'],
      intuition: `<p>O IPv6 é como trocar uma numeração de telefones de 8 dígitos por uma de 32: além de caber muito mais gente, aproveitou-se para reorganizar as regras (sem broadcast, autoconfiguração, cabeçalho mais simples).</p><p class="limit"><strong>Limite da analogia:</strong> não é "só mais dígitos"; vários mecanismos mudaram (ARP → NDP, broadcast → multicast).</p>`,
      technical: `<p>{{comp}} Endereço de <strong>128 bits</strong>, escrito em <strong>8 grupos de 16 bits</strong> em hexadecimal, separados por ":" — ${c('2001:0db8:0000:0000:0000:0000:0000:0001')}. Cada dígito hexadecimal = 4 bits (A = 10 … F = 15).</p>
<h4>Regras de abreviação</h4><ol><li>Retire <strong>zeros à esquerda</strong> de cada grupo (${c('0db8')} → ${c('db8')}; ${c('0000')} → ${c('0')}).</li><li>Substitua <strong>uma única</strong> sequência contínua de grupos zero por ${c('::')} — na forma canônica (RFC 5952), a <em>mais longa</em>; em empate, a primeira; nunca para um único grupo.</li></ol>
<p>${c('2001:0db8:0000:0000:0000:0000:0000:0001')} → ${c('2001:db8::1')}.</p>
<table class="tbl"><thead><tr><th>Tipo</th><th>Prefixo</th><th>Observação</th></tr></thead><tbody>
<tr><td>Global unicast</td><td>2000::/3</td><td>roteável na Internet</td></tr><tr><td>Link-local</td><td>fe80::/10</td><td>só no enlace; toda interface tem um</td></tr><tr><td>Unique local (ULA)</td><td>fc00::/7 (na prática fd00::/8)</td><td>uso interno, parecido com os privados</td></tr><tr><td>Multicast</td><td>ff00::/8</td><td>ff02::1 = todos os nós do enlace</td></tr><tr><td>Loopback</td><td>::1/128</td><td>a própria máquina</td></tr><tr><td>Não especificado</td><td>::/128</td><td>"ainda sem endereço"</td></tr><tr><td>Documentação</td><td>2001:db8::/32</td><td>reservado para exemplos</td></tr></tbody></table>
<p><strong>Anycast</strong> usa o mesmo espaço do unicast: um endereço atribuído a várias interfaces; o pacote vai para a "mais próxima". Pelo formato, não dá para distinguir anycast de unicast.</p>
<p><strong>NDP</strong> (Neighbor Discovery, sobre ICMPv6) substitui o ARP e descobre roteadores: NS/NA (resolução de endereço), RS/RA (descoberta de roteador e prefixo). <strong>SLAAC</strong>: o host forma o próprio endereço com o prefixo /64 anunciado no RA. Também existe DHCPv6.</p>
<table class="tbl"><thead><tr><th></th><th>IPv4</th><th>IPv6</th></tr></thead><tbody><tr><td>Tamanho</td><td>32 bits</td><td>128 bits</td></tr><tr><td>Escrita</td><td>decimal pontuado</td><td>hexadecimal com ":"</td></tr><tr><td>Broadcast</td><td>sim</td><td>não (multicast)</td></tr><tr><td>Vizinhos</td><td>ARP</td><td>NDP (ICMPv6)</td></tr><tr><td>Autoconfiguração</td><td>DHCP</td><td>SLAAC, DHCPv6</td></tr><tr><td>Sub-rede típica</td><td>/24, /26…</td><td>/64</td></tr></tbody></table>
<p>Em IPv6 <strong>não se usa</strong> a fórmula "2^h − 2".</p>
{{sm:ipv6-porque}}`,
      visual: `{{w:ipv6}}`,
      worked: { title: `Abreviar ${c('2001:0DB8:0000:0000:00A0:0000:0000:0007')}`, steps: [
        ['Retire zeros à esquerda: 2001:db8:0:0:a0:0:0:7.', '00A0 vira a0 — só zeros à ESQUERDA saem.'],
        ['Há duas sequências de dois grupos zero (posições 3–4 e 6–7).', 'Mesmo tamanho → empate.'],
        ['Use "::" na primeira: 2001:db8::a0:0:0:7.', 'Só uma vez; a segunda fica escrita como 0:0.'],
      ] },
      guided: { title: `Agora você: ${c('2001:0db8:0000:0000:0000:ff00:0042:8329')}`, steps: [
        { prompt: 'Depois de retirar os zeros à esquerda:', field: { type: 'text' }, answer: ['2001:db8:0:0:0:ff00:42:8329'], explain: '0db8 → db8, 0000 → 0, 0042 → 42.' },
        { prompt: 'Forma mais curta:', field: { type: 'ipv6short' }, answer: '2001:0db8:0000:0000:0000:ff00:0042:8329', explain: 'Os três grupos 0 viram "::".' },
      ] },
      practice: [{ gen: 'ipv6Compress' }, { gen: 'ipv6Expand' }, { gen: 'ipv6Type' }, { bank: 'c-v6-4' }, { bank: 'c-v6-5' }],
      pitfalls: ['Usar "::" duas vezes.', 'Retirar zeros à direita (db80 ≠ db8).', 'Procurar broadcast em IPv6.', 'Aplicar −2 hosts num /64.', 'Achar que fe80 é roteável.'],
      check: 'Para conferir uma abreviação, expanda de volta: conte os grupos escritos; "::" deve completar exatamente 8.',
      smList: ['ipv6-porque'],
    },
    /* =============================== MÓDULO 4 =============================== */
    {
      id: 'stp', n: 4, title: 'Comutação, Ethernet e STP', group: 'g-stp', topics: ['comutacao', 'mac', 'stp'], minutes: 50,
      sources: ['5-Comutacao.pdf (43 páginas)', 'stp-*.pkt (projeto do Packet Tracer; não lido por esta plataforma)'],
      objectives: ['Comparar comutação de circuitos, mensagens, pacotes e células.', 'Prever o que um switch faz com um quadro (aprender, encaminhar ou inundar).', 'Contar domínios de colisão e de broadcast de uma topologia.', 'Eleger Root Bridge, Root Ports, Designated Ports e a porta bloqueada de uma topologia STP.'],
      intuition: `<p>Um switch é um <strong>porteiro que decora rostos</strong>: cada vez que alguém sai por uma porta, ele anota "fulano está atrás da porta 3". Quando chega correspondência para alguém desconhecido, ele grita em todas as portas (flooding). O STP é a <strong>placa de "rua sem saída"</strong> que impede que carros fiquem andando em círculos quando há ruas redundantes.</p><p class="limit"><strong>Limite:</strong> o switch não "lembra" para sempre — as entradas expiram (tipicamente 300 s em switches Cisco).</p>`,
      technical: `<h4>Tipos de comutação {{prof}}</h4>
<table class="tbl"><thead><tr><th>Tipo</th><th>Como funciona</th><th>Exemplo</th></tr></thead><tbody>
<tr><td>Circuitos</td><td>caminho dedicado estabelecido antes; reservado mesmo ocioso; orientado a conexão</td><td>telefonia tradicional</td></tr>
<tr><td>Mensagens</td><td>mensagem inteira armazenada em cada nó (store-and-forward)</td><td>telex, e-mail</td></tr>
<tr><td>Pacotes</td><td>dados divididos em pacotes; recursos compartilhados; datagrama (IP) ou circuito virtual</td><td>Internet</td></tr>
<tr><td>Células</td><td>pacotes de tamanho fixo, orientado a conexão (VPI/VCI)</td><td>ATM (em desuso)</td></tr></tbody></table>
<p>Na comutação de circuitos, o enlace físico é compartilhado com <strong>FDM</strong> (faixas de frequência) ou <strong>TDM</strong> (fatias de tempo). Na comutação de pacotes: <strong>datagrama</strong> — cada pacote roteado independentemente, sem estado, pode chegar fora de ordem; <strong>circuito virtual</strong> — caminho lógico prévio, pacotes com VCID, ordem garantida (ATM, Frame Relay).</p>
<h4 id="ethernet">Ethernet, MAC e domínios {{prof}}</h4>
<p>Camada 1 (hub/repetidor) repete bits; camada 2 (bridge/switch) encaminha <strong>quadros</strong> por <strong>MAC</strong>; camada 3 (roteador) encaminha <strong>pacotes</strong> por <strong>IP</strong>.</p>
<ul><li><strong>Domínio de colisão:</strong> onde transmissões simultâneas colidem (meio compartilhado). Hub = um só domínio; <strong>cada porta de switch</strong> é um domínio separado (e em full-duplex não há colisão).</li><li><strong>Domínio de broadcast:</strong> até onde vai um quadro para FF:FF:FF:FF:FF:FF. Delimitado por <strong>roteadores</strong> (e por VLANs).</li></ul>
<p><strong>Funcionamento do switch:</strong> (1) aprende o <strong>MAC de origem</strong> associando-o à porta de entrada (e VLAN); (2) consulta o <strong>MAC de destino</strong>: conhecido → encaminha só por aquela porta; desconhecido ou broadcast → <strong>flooding</strong> em todas as portas da VLAN, menos a de entrada.</p>
{{sm:mac-origem}}
{{w:macSim}}
<p><strong>Latência</strong> = atraso da origem ao destino (meio físico, processamento, filas, decisão de comutação).</p>
<h4 id="stp">Spanning Tree Protocol {{prof}}</h4>
<p>Caminhos redundantes entre switches aumentam a disponibilidade, mas criam <strong>loops de camada 2</strong>: tempestade de broadcast, quadros unicast duplicados e instabilidade da tabela MAC. O STP (802.1D) troca <strong>BPDUs</strong> e monta uma árvore lógica sem ciclos, deixando links redundantes como reserva.</p>
{{sm:stp-loops}}
<ol><li><strong>Root Bridge:</strong> menor <strong>Bridge ID</strong> = prioridade (padrão 32768, configurável em múltiplos de 4096) + MAC. Compara-se prioridade; em empate, menor MAC.</li><li><strong>Root Port</strong> (uma por switch não-root): menor custo acumulado até a raiz (custo menor = enlace mais rápido: 100 Mb/s = 19, 1 Gb/s = 4). Empates: menor BID do vizinho, depois menor Port ID.</li><li><strong>Designated Port</strong> (uma por segmento): a ponta com menor custo até a raiz; empate → menor BID. Todas as portas da raiz são designadas.</li><li>As demais portas ficam <strong>bloqueadas</strong>: não encaminham dados, mas continuam ouvindo BPDUs.</li></ol>
{{sm:root-prioridade}}
<table class="tbl"><thead><tr><th>Estado 802.1D</th><th>Faz</th><th>Dados?</th><th>Aprende MAC?</th></tr></thead><tbody><tr><td>Blocking</td><td>escuta BPDUs</td><td>não</td><td>não</td></tr><tr><td>Listening</td><td>prepara-se para RP/DP</td><td>não</td><td>não</td></tr><tr><td>Learning</td><td>monta a tabela MAC</td><td>não</td><td>sim</td></tr><tr><td>Forwarding</td><td>operação normal</td><td>sim</td><td>sim</td></tr><tr><td>Disabled</td><td>shutdown</td><td>não</td><td>não</td></tr></tbody></table>
<p><strong>RSTP (802.1w)</strong> tem apenas 3 estados — <strong>Discarding</strong> (= Blocking + Listening), <strong>Learning</strong>, <strong>Forwarding</strong> — e converge em segundos (proposal/agreement). Papéis novos: <strong>Alternate</strong> e <strong>Backup</strong>. Não confunda <em>papel</em> (Root/Designated/Alternate) com <em>estado</em> (Forwarding/Discarding…).</p>
<table class="tbl"><thead><tr><th>Protocolo</th><th>Norma</th><th>Convergência</th><th>Escopo</th></tr></thead><tbody><tr><td>STP</td><td>802.1D</td><td>30–50 s</td><td>uma árvore</td></tr><tr><td>PVST+</td><td>Cisco</td><td>30–50 s</td><td>por VLAN</td></tr><tr><td>RSTP</td><td>802.1w</td><td>&lt; 2 s</td><td>uma árvore</td></tr><tr><td>Rapid PVST+</td><td>Cisco</td><td>&lt; 2 s</td><td>por VLAN</td></tr><tr><td>MSTP</td><td>802.1s</td><td>&lt; 2 s</td><td>grupos de VLANs</td></tr></tbody></table>
<p><strong>PortFast</strong> leva portas de PCs/servidores direto a Forwarding; <strong>BPDU Guard</strong> desativa a porta se ela receber BPDU.</p>`,
      visual: `{{w:stpSim}}`,
      worked: { title: 'Eleição STP em triângulo (prioridades iguais)', steps: [
        ['S1 (…0003), S2 (…0001), S3 (…0002), todos com prioridade 32768 e enlaces de custo 19.', 'Prioridades iguais → decide o MAC.'],
        ['Root Bridge = S2 (menor MAC).', 'Menor BID vence.'],
        ['Root Ports: S1 e S3 usam o enlace direto para S2 (custo 19 < 38).', 'Menor custo até a raiz.'],
        ['Segmento S1–S3: os dois têm custo 19 até a raiz → empate → menor BID: S3 é designada.', 'Uma designada por segmento.'],
        ['A porta de S1 no enlace S1–S3 fica bloqueada (802.1D: Blocking; RSTP: Alternate/Discarding).', 'Quebra o único ciclo.'],
      ] },
      guided: { title: 'Agora você: S1 prio 4096, S2 e S3 prio 32768; custos S1–S2 = 19, S1–S3 = 19, S2–S3 = 4', steps: [
        { prompt: 'Root Bridge?', field: { type: 'choice', options: ['S1', 'S2', 'S3'] }, answer: 0, explain: 'Prioridade 4096 é a menor — o MAC nem precisa ser comparado.' },
        { prompt: 'Custo de S2 até a raiz?', field: { type: 'number' }, answer: 19, explain: 'Direto: 19. Via S3: 4 + 19 = 23. Fica 19.' },
        { prompt: 'No enlace S2–S3 (os dois com custo 19 até a raiz), quem decide a designada?', field: { type: 'choice', options: ['Maior custo', 'Menor BID entre S2 e S3', 'Sempre S3'] }, answer: 1, explain: 'Custos iguais → menor Bridge ID; a outra ponta é bloqueada.' },
      ] },
      practice: [{ gen: 'stp' }, { bank: 'v-mac-1' }, { bank: 'v-mac-2' }, { bank: 'v-mac-4' }, { bank: 'v-com-3' }, { bank: 'v-stp-4' }, { bank: 'v-stp-5' }],
      pitfalls: ['Dizer que o switch aprende o MAC de destino.', 'Achar que flooding vai para todas as VLANs.', 'Esquecer o enlace switch–roteador ao contar domínios de colisão.', 'Comparar MAC antes da prioridade.', 'Dar Root Port à Root Bridge.', 'Misturar estados do 802.1D com os do RSTP.'],
      check: 'Numa topologia com N switches conectados, a árvore STP usa exatamente N − 1 enlaces ativos; todo enlace a mais tem uma porta bloqueada.',
      smList: ['mac-origem', 'stp-loops', 'root-prioridade'],
    },
    /* =============================== MÓDULO 5 =============================== */
    {
      id: 'vlan', n: 5, title: 'VLANs, trunk e Inter-VLAN', group: 'g-vlan', topics: ['vlan', 'trunk', 'intervlan', 'ios'], minutes: 100,
      sources: ['8-VLAN.pdf', '7-3.4.6_Lab_-_Configure_VLANs_and_Trunking.pdf', '6-Comandos.pdf'],
      objectives: ['Explicar o que uma VLAN isola e por que hosts de VLANs diferentes precisam de roteamento.', 'Diferenciar porta access de trunk e descrever a tag 802.1Q (TPID, PCP, DEI, VID) e a VLAN nativa.', 'Configurar VLANs, portas access, trunk e router-on-a-stick no Cisco IOS.', 'Diagnosticar por que dois hosts não se comunicam (VLAN, trunk, gateway).'],
      intuition: `<p>Uma VLAN é como dividir um prédio em <strong>andares com elevadores privativos</strong>: todos usam a mesma estrutura física, mas quem está no 10º andar não ouve os avisos do 20º. Para ir de um andar a outro é preciso passar pela <strong>portaria</strong> (o roteador).</p><p class="limit"><strong>Limite:</strong> uma VLAN não é segurança completa por si só; configurações erradas (DTP, VLAN nativa) permitem ataques de VLAN hopping.</p>`,
      technical: `<p>{{prof}} <strong>VLAN</strong> = rede lógica dentro de uma LAN física. Cada VLAN é um <strong>domínio de broadcast</strong> distinto e, na prática, uma <strong>sub-rede IP</strong> distinta. Benefícios: isolamento, gerenciamento, desempenho (broadcasts menores), aplicação de regras entre VLANs.</p>
{{sm:vlan-porque}}
<ul><li><strong>Estática:</strong> por porta, configuração manual (padrão: todas as portas na VLAN 1).</li><li><strong>Dinâmica:</strong> por MAC/usuário/dispositivo, com servidor (MAB/802.1X + RADIUS, Cisco ISE, Aruba ClearPass).</li></ul>
<h4 id="trunk">Access, trunk e 802.1Q</h4>
<p><strong>Access:</strong> uma VLAN, liga dispositivos finais; o quadro do PC chega <strong>sem tag</strong>. <strong>Trunk:</strong> várias VLANs no mesmo enlace (switch–switch, switch–roteador), cada quadro identificado por uma <strong>tag</strong>.</p>
{{w:dot1q}}
<p>A tag <strong>IEEE 802.1Q</strong> tem <strong>4 bytes</strong>, inserida entre o <strong>MAC de origem</strong> e o <strong>EtherType</strong>: <strong>TPID</strong> (16 bits, 0x8100) + <strong>TCI</strong> (16 bits) = <strong>PCP</strong> (3 bits, prioridade/QoS) + <strong>DEI</strong> (1 bit, pode ser descartado) + <strong>VID</strong> (12 bits). 2^12 = 4096 valores; 0 e 4095 reservados → <strong>VLANs 1 a 4094</strong>.</p>
{{sm:trunk-tag}}
<p><strong>VLAN nativa:</strong> a VLAN dos quadros que trafegam <strong>sem tag</strong> no trunk (padrão: VLAN 1). Deve ser igual nas duas pontas.</p>
<p><strong>VTP</strong> (Cisco): propaga VLANs num domínio. Modos: <em>servidor</em> (padrão; cria/altera/exclui e propaga; guarda em NVRAM), <em>cliente</em> (só sincroniza), <em>transparente</em> (não participa; repassa anúncios; VLANs locais). Cuidado com o número de revisão: um switch com revisão maior pode sobrescrever (até apagar) as VLANs do domínio.</p>
<p><strong>VLAN hopping:</strong> (1) falsa negociação de trunk via <strong>DTP</strong> — mitigação: fixar access/trunk e ${c('switchport nonegotiate')}; (2) <strong>double tagging</strong> explorando a nativa — mitigação: nativa sem uso (${c('switchport trunk native vlan 999')}); e desligar portas sem uso.</p>
<p><strong>Arquitetura hierárquica:</strong> <em>acesso</em> (usuários, switches L2, IDF), <em>distribuição</em> (switches L3, inter-VLAN, políticas, redundância, QoS), <em>core</em> (backbone de alta velocidade).</p>
<h4 id="intervlan">Roteamento Inter-VLAN</h4>
<p>VLAN 10 e VLAN 20 são sub-redes diferentes → precisam de um equipamento de <strong>camada 3</strong>, que é o gateway de cada VLAN.</p>
{{sm:intervlan-porque}}
<p><strong>A) Router-on-a-stick:</strong> um trunk liga o switch ao roteador; cada VLAN ganha uma <strong>subinterface</strong> com ${c('encapsulation dot1Q N')} e o IP do gateway.</p>
<pre class="cli">Router(config)# interface g0/0
Router(config-if)# no shutdown
Router(config)# interface g0/0.10
Router(config-subif)# encapsulation dot1Q 10
Router(config-subif)# ip address 192.168.10.1 255.255.255.0
Router(config)# interface g0/0.20
Router(config-subif)# encapsulation dot1Q 20
Router(config-subif)# ip address 192.168.20.1 255.255.255.0</pre>
<p><strong>B) Switch L3:</strong> uma <strong>SVI</strong> por VLAN (${c('interface vlan 10')} + IP + ${c('no shutdown')}) e ${c('ip routing')}. Uma SVI de gerenciamento em switch L2 <em>não</em> roteia.</p>
{{w:interVlan}}
<h4 id="ios">Comandos Cisco IOS essenciais {{prof}}</h4>
<table class="tbl"><thead><tr><th>Comando</th><th>Modo / finalidade</th></tr></thead><tbody>
<tr><td>${c('enable')}</td><td>usuário (>) → privilegiado (#)</td></tr><tr><td>${c('configure terminal')}</td><td># → (config)#</td></tr>
<tr><td>${c('vlan 10')} / ${c('name financeiro')}</td><td>cria e nomeia (config-vlan)</td></tr>
<tr><td>${c('interface fa0/1')} / ${c('interface range fa0/2 - 5')}</td><td>uma ou várias portas</td></tr>
<tr><td>${c('switchport mode access')} + ${c('switchport access vlan 10')}</td><td>porta access</td></tr>
<tr><td>${c('switchport mode trunk')}</td><td>trunk (alguns switches exigem antes ${c('switchport trunk encapsulation dot1q')})</td></tr>
<tr><td>${c('switchport trunk allowed vlan 10,20,30')}</td><td>limita as VLANs (sem isso, passam todas)</td></tr>
<tr><td>${c('switchport trunk native vlan 999')}</td><td>VLAN nativa</td></tr>
<tr><td>${c('show vlan brief')}</td><td>VLANs e portas access</td></tr><tr><td>${c('show interfaces trunk')}</td><td>troncos, nativa, VLANs permitidas</td></tr>
<tr><td>${c('show mac address-table')}</td><td>MACs aprendidos</td></tr><tr><td>${c('show spanning-tree')}</td><td>raiz, papéis e estados</td></tr>
<tr><td>${c('show ip interface brief')}</td><td>IPs e status</td></tr><tr><td>${c('show ip route')}</td><td>tabela de rotas</td></tr>
<tr><td>${c('ip dhcp excluded-address A B')} · ${c('ip dhcp pool X')} · ${c('network')} · ${c('default-router')}</td><td>DHCP no roteador</td></tr>
<tr><td>${c('copy running-config startup-config')} / ${c('wr')}</td><td>salvar (RAM → NVRAM)</td></tr></tbody></table>
<div class="note correction"><strong>Correção das fontes (6-Comandos.pdf).</strong> "rota padrão para 110.1.1.1" deveria ser 10.1.1.1; as rotas estáticas ${c('ip route 192.168.100.0 … gi0/1')} apontam para redes já diretamente conectadas (desnecessárias — servem só para mostrar a sintaxe); o OSPF anuncia ${c('200.100.100.0 0.0.0.3')} sem interface nessa rede; ${c('bandwith')} → ${c('bandwidth')}; e prompts como "(config) # name Financeiro" deveriam ser "(config-vlan)#". RIP/OSPF/BGP aparecem no PDF, mas não estão no cronograma desta prova.</div>
<h4>Diagnóstico em 6 passos</h4><ol><li>O PC tem IP, máscara e gateway corretos?</li><li>A porta está na VLAN certa? (${c('show vlan brief')})</li><li>A VLAN existe nos switches e passa no trunk? (${c('show interfaces trunk')})</li><li>Há subinterface com ${c('encapsulation dot1Q')} correta ou SVI + ${c('ip routing')}?</li><li>Interfaces up? (${c('show ip interface brief')})</li><li>Pingue primeiro o gateway, depois o host da outra VLAN.</li></ol>`,
      visual: `{{w:vlanSim}}`,
      worked: { title: 'PC-A (VLAN 10) não pinga PC-B (VLAN 10) em outro switch — Lab 3.4.6', steps: [
        ['Mesma VLAN e mesma sub-rede → não precisa de roteador.', 'Primeiro, classifique o problema: L2 ou L3?'],
        ['show vlan brief nos dois switches: portas Fa0/6 e Fa0/18 na VLAN 10. OK.', 'Porta e VLAN corretas.'],
        ['show interfaces trunk: vazio. As duas pontas de Fa0/1 estão em dynamic auto.', 'auto + auto não forma trunk.'],
        ['Solução: switchport mode trunk em Fa0/1 dos dois lados.', 'Agora a VLAN 10 atravessa com tag.'],
        ['Ping OK; show interfaces trunk mostra Fa0/1 trunking.', 'Verifique sempre depois de corrigir.'],
      ] },
      guided: { title: 'Agora você: configure S1 Fa0/5 como access na VLAN 20 (a partir de S1#)', steps: [
        { prompt: 'Comando para entrar no modo de configuração global:', field: { type: 'text' }, answer: ['configure terminal', 'conf t', 'config t', 'configure t'], explain: 'De # para (config)#.' },
        { prompt: 'Comando para criar a VLAN 20:', field: { type: 'text' }, answer: ['vlan 20'], explain: 'Entra em (config-vlan)#.' },
        { prompt: 'Comando para entrar na interface Fa0/5:', field: { type: 'text' }, answer: ['interface fa0/5', 'interface fastethernet0/5', 'interface fastethernet 0/5', 'int fa0/5', 'int f0/5', 'interface f0/5'], explain: 'Entra em (config-if)#.' },
        { prompt: 'Comando para fixar o modo access:', field: { type: 'text' }, answer: ['switchport mode access', 'sw mode access', 'switchport mo acc'], explain: 'Evita negociação DTP.' },
        { prompt: 'Comando para colocar a porta na VLAN 20:', field: { type: 'text' }, answer: ['switchport access vlan 20', 'sw access vlan 20', 'switchport acc vlan 20'], explain: 'Associa a porta à VLAN.' },
      ] },
      practice: [{ bank: 'v-vlan-1' }, { bank: 'v-tr-1' }, { bank: 'v-tr-3' }, { bank: 'v-iv-1' }, { bank: 'v-iv-2' }, { bank: 'v-iv-5' }, { bank: 'v-ios-1' }, { bank: 'v-ios-2' }],
      pitfalls: ['Confundir access (uma VLAN, sem tag) com trunk (várias, com tag).', 'Achar que o mesmo número de VLAN em dois switches basta, sem trunk.', 'Esquecer o trunk na porta do switch ligada ao roteador.', 'Configurar IP na porta física do switch L2 (vai na SVI).', 'Usar encapsulation no switch (é comando do roteador).', 'Esquecer ip routing no switch L3.', 'Responder 4096 VLANs utilizáveis (são 4094).'],
      check: 'Sempre classifique primeiro: mesma VLAN → problema de camada 2 (porta/VLAN/trunk); VLANs diferentes → camada 3 (gateway/subinterface/SVI).',
      smList: ['vlan-porque', 'trunk-tag', 'intervlan-porque'],
    },
  ];

  /* =========================== SAIBA MAIS =========================== */
  const saibaMais = {
    'ipv4-rede-broadcast': { title: 'Por que existem endereços de rede e de broadcast?', kinds: ['Técnico'], s: {
      porque: 'Um roteador precisa de um nome para "a rede inteira" (para escrever na tabela de rotas) e os hosts precisam de um jeito de falar com "todos da rede" de uma vez (ex.: o ARP pergunta a todos "quem tem este IP?").',
      dentro: 'Convencionou-se usar os dois extremos do bloco: todos os bits de host em 0 identificam a rede; todos em 1 significam "todos os hosts desta rede" (broadcast direcionado). Como esses dois valores têm significado especial, não podem identificar uma única interface.',
      logica: 'Com h bits de host existem 2^h combinações. Tirando a combinação "tudo 0" e a "tudo 1", sobram 2^h − 2 para hosts. Ex.: /26 → h = 6 → 64 − 2 = 62.',
      diferente: 'Exceções reais: num /31 (RFC 3021), usado em enlaces ponto a ponto, não há hosts "a mais" para avisar, então os 2 endereços são usados pelas interfaces; num /32 o "bloco" é um único endereço (ex.: loopback de roteador). No IPv6 não há broadcast, por isso a fórmula −2 não se aplica.',
      exemplo: 'Em 192.168.1.0/24, um ping para 192.168.1.255 é um broadcast direcionado — muitos roteadores bloqueiam esse tráfego vindo de fora por segurança (era usado em ataques de amplificação, como o "smurf").',
    }, widget: null },
    'classful': { title: 'Por que existiam classes A, B e C?', kinds: ['Histórico', 'Técnico'], s: {
      porque: 'No início da Internet, era preciso que o roteador soubesse o tamanho da rede apenas olhando o endereço, sem informação extra.',
      dentro: 'Os primeiros bits do endereço indicavam a classe: começando com 0 → A; 10 → B; 110 → C; 1110 → D. Por isso as faixas do primeiro octeto são 0–127, 128–191, 192–223, 224–239.',
      logica: 'Com 1 bit fixo, sobram 7 bits de rede na classe A (128 redes, com 0 e 127 reservados); B fixa 2 bits (14 bits de rede); C fixa 3 bits (21 bits de rede).',
      diferente: 'O modelo desperdiçava muito: quem precisava de 300 hosts recebia uma classe B (65.534). Com o crescimento da Internet nos anos 1990, o CIDR (RFC 1519, 1993) aboliu as classes e passou a usar o prefixo /n explícito.',
      exemplo: 'Ainda falamos em "classe C" para um /24 por hábito, mas o roteador moderno ignora a classe e usa só o prefixo.',
    } },
    'potencias-de-dois': { title: 'Por que blocos são potências de 2? Por que /26 = 64 endereços?', kinds: ['Técnico', 'Matemático'], s: {
      porque: 'A máscara é uma régua de bits: ela não pode cortar "no meio" de um valor decimal arbitrário, só entre posições binárias.',
      dentro: 'Com h bits livres, cada bit pode ser 0 ou 1, de forma independente: 2 × 2 × … × 2 (h vezes) = 2^h combinações. /26 deixa 32 − 26 = 6 bits livres → 2^6 = 64.',
      logica: 'Como os bits de host ficam à direita, todos os endereços de um bloco compartilham os mesmos bits à esquerda — por isso o bloco sempre começa em múltiplo do seu tamanho (os bits livres em 0) e termina no múltiplo seguinte menos 1 (bits livres em 1). O "salto" 256 − máscara é exatamente 2^(bits livres no octeto).',
      diferente: 'Se tentássemos um bloco de 60 endereços, não haveria um padrão de bits fixo que selecionasse exatamente esses 60: o roteador teria de comparar faixas numéricas em vez de fazer um único AND — muito mais lento.',
      exemplo: 'Mexa nos bits abaixo e veja: cada bit a mais no prefixo corta o bloco pela metade.',
    }, widget: 'bitsMini' },
    'vlsm-ordem': { title: 'Por que alocar as maiores sub-redes primeiro?', kinds: ['Técnico'], s: {
      porque: 'Um bloco de tamanho 2^h só pode começar em endereços múltiplos de 2^h. Blocos grandes têm poucas posições válidas.',
      dentro: 'Num /24, um /25 só pode começar em .0 ou .128; um /26 em .0, .64, .128, .192. Se um bloco pequeno ocupa .0, a posição .0 deixa de servir para os grandes.',
      logica: 'Alocando do maior para o menor, cada bloco termina exatamente onde o próximo (menor ou igual) pode começar, porque múltiplos de um tamanho maior também são múltiplos dos tamanhos menores. Nenhum buraco é criado.',
      diferente: 'Exemplo: em 192.168.1.0/24, aloque primeiro um /30 em .0 e depois precise de 2 × /25 (126 hosts cada). O primeiro /25 válido livre é .128; o .0/25 está "furado" pelo /30 → a segunda demanda não cabe, embora sobrem 252 endereços no total.',
      exemplo: 'Compare abaixo as duas ordens de alocação para as mesmas demandas.',
    }, widget: 'vlsmCompare' },
    'cidr-sumarizacao': { title: 'Por que sumarizar rotas?', kinds: ['Técnico'], s: {
      porque: 'Tabelas de rotas grandes consomem memória e CPU; cada mudança precisa ser propagada.',
      dentro: 'Um roteador escolhe a rota pelo prefixo mais longo que casa com o destino (longest prefix match). Um resumo /23 casa com os dois /24 que contém.',
      logica: 'O resumo só é exato se as redes forem contíguas, de mesmo tamanho somando uma potência de 2, e alinhadas (a primeira começando num múltiplo do bloco resumo).',
      diferente: 'Se o resumo abranger redes que não existem atrás daquele roteador, ele pode atrair tráfego para destinos inexistentes (e descartá-lo) — por isso um resumo "não exato" deve ser usado com consciência.',
      exemplo: 'Provedores anunciam na Internet blocos agregados (ex.: um /16) em vez de milhares de /24 de clientes.',
    } },
    'ipv6-porque': { title: 'Por que o IPv6 foi desenvolvido?', kinds: ['Histórico', 'Técnico'], s: {
      porque: 'O IPv4 tem cerca de 4,3 bilhões de endereços (2^32), e o crescimento da Internet nos anos 1990 mostrou que acabariam. O pool central da IANA esgotou-se em 2011. NAT e CIDR adiaram o problema, mas com custos (quebra da conexão fim a fim, complexidade).',
      dentro: 'O IPv6 (especificado pelo IETF; atual RFC 8200) usa 128 bits, cabeçalho de tamanho fixo e mais simples, cabeçalhos de extensão, sem fragmentação nos roteadores, sem broadcast, com autoconfiguração (SLAAC) e descoberta de vizinhos (NDP) integradas.',
      logica: '128 bits não é "4 vezes mais endereços": é 2^128 / 2^32 = 2^96 vezes mais. Mas a meta não é numerar cada grão de areia, e sim permitir planejamento hierárquico folgado: toda sub-rede local é /64, e um site recebe tipicamente um /48 (65.536 sub-redes /64).',
      diferente: 'Se apenas aumentássemos o IPv4 para 64 bits mantendo o resto, continuaríamos com broadcast, ARP e configuração manual; aproveitou-se a transição para corrigir decisões antigas.',
      exemplo: 'Por que /64? Porque o identificador de interface de 64 bits permite que o host gere o próprio endereço (SLAAC) sem coordenação.',
    } },
    'mac-origem': { title: 'Por que o switch aprende o MAC de ORIGEM?', kinds: ['Técnico'], s: {
      porque: 'O switch precisa descobrir, sem configuração, em qual porta está cada dispositivo.',
      dentro: 'Quando um quadro entra pela porta 3 com origem AA:AA, isso é uma prova: AA:AA está alcançável pela porta 3 (naquela VLAN). O switch grava (VLAN, MAC, porta) e renova o tempo de vida a cada quadro.',
      logica: 'O destino não prova nada: o quadro só diz para quem quer ir, não onde o destinatário está. Por isso, para um destino desconhecido o switch inunda (flooding); quando o destino responder, a resposta trará o MAC dele como ORIGEM, e o switch aprende.',
      diferente: 'Se aprendesse pelo destino, associaria MACs a portas erradas (a porta de entrada nada tem a ver com o destino) e encaminharia quadros para lugares errados.',
      exemplo: 'Num loop L2, o mesmo MAC de origem chega por portas diferentes em instantes diferentes — a tabela fica "pulando" (MAC flapping), um dos sintomas que o STP evita.',
    } },
    'stp-loops': { title: 'Por que bloquear caminhos redundantes?', kinds: ['Técnico'], s: {
      porque: 'Redundância física é desejável (se um cabo cair, há outro), mas Ethernet não foi feita para múltiplos caminhos ativos.',
      dentro: 'O quadro Ethernet não tem TTL (o IP tem; o quadro não). Um broadcast é replicado por todo switch para todas as portas; num ciclo, as cópias voltam e são replicadas de novo, indefinidamente → tempestade de broadcast, CPU e links saturados, MAC flapping e quadros unicast duplicados.',
      logica: 'Uma árvore (grafo sem ciclos) liga todos os nós com exatamente N − 1 enlaces e um único caminho entre quaisquer dois pontos. O STP escolhe uma árvore e deixa os enlaces extras bloqueados, mas ainda ouvindo BPDUs: se um enlace ativo falhar, a árvore é recalculada e um enlace bloqueado assume.',
      diferente: 'Alternativas modernas usam todos os enlaces sem loops por outros meios (agregação de links/EtherChannel, roteamento na camada 3, TRILL/SPB), mas o STP continua como proteção básica.',
      exemplo: 'O algoritmo do STP foi criado por Radia Perlman (DEC, anos 1980) e padronizado como IEEE 802.1D.',
    } },
    'root-prioridade': { title: 'Por que a prioridade vem antes do MAC?', kinds: ['Técnico'], s: {
      porque: 'Se valesse só o MAC, a raiz seria o switch "mais antigo" (MACs baixos costumam ser de equipamentos mais velhos) — talvez um switch de acesso fraco num canto da rede.',
      dentro: 'A Bridge ID é comparada como um número único de 8 bytes: os 2 bytes mais significativos são a prioridade (no PVST+, prioridade de 4 bits × 4096 + 12 bits de VLAN), seguidos dos 6 bytes do MAC. Como a prioridade ocupa os bits mais altos, ela decide primeiro; o MAC só desempata.',
      logica: 'É por isso que a prioridade só pode ser múltiplo de 4096: os 12 bits mais baixos do campo foram cedidos ao System ID Extension (número da VLAN), permitindo uma raiz diferente por VLAN.',
      diferente: 'Sem um campo configurável, o administrador não conseguiria escolher a raiz — e a raiz define todos os caminhos ativos da rede.',
      exemplo: 'Por isso o show spanning-tree mostra "Priority 32769" para a VLAN 1 com prioridade padrão: 32768 + 1.',
    } },
    'vlan-porque': { title: 'Por que separar uma rede física em redes lógicas?', kinds: ['Técnico'], s: {
      porque: 'Numa LAN plana, todo broadcast (ARP, DHCP…) chega a todos os hosts. Com centenas de máquinas, isso consome banda e CPU, e qualquer host enxerga o tráfego de difusão de todos.',
      dentro: 'O switch marca internamente cada porta com uma VLAN e só faz flooding/broadcast entre portas da mesma VLAN; a tabela MAC é separada por VLAN.',
      logica: 'Cada VLAN vira um domínio de broadcast e, por convenção, uma sub-rede IP. Assim, o tráfego entre grupos (ex.: Financeiro × Engenharia) precisa passar por um roteador, onde se podem aplicar regras (ACLs, firewall).',
      diferente: 'Sem VLANs, separar departamentos exigiria switches e cabos físicos diferentes para cada grupo — caro e rígido. Com VLANs, mover um usuário de grupo é só reconfigurar a porta.',
      exemplo: 'Uma VLAN separada para telefones IP permite priorizar voz (PCP/QoS) sem misturar com dados.',
    } },
    'trunk-tag': { title: 'Por que adicionar uma TAG ao quadro?', kinds: ['Técnico'], s: {
      porque: 'Quando um único cabo transporta várias VLANs, o switch do outro lado precisa saber a qual VLAN cada quadro pertence — o quadro Ethernet original não tem esse campo.',
      dentro: 'O 802.1Q insere 4 bytes depois do MAC de origem: TPID = 0x8100 aparece no lugar onde normalmente estaria o EtherType, sinalizando "este quadro tem tag"; em seguida vêm PCP, DEI e o VID de 12 bits; depois, o EtherType original. O FCS é recalculado.',
      logica: 'Colocar a tag nessa posição mantém o quadro reconhecível por equipamentos antigos (eles veem um EtherType desconhecido) e permite que o switch leia a VLAN nos primeiros bytes, antes do payload.',
      diferente: 'Alternativa histórica: o ISL da Cisco encapsulava o quadro inteiro com um cabeçalho novo (mais overhead) e foi abandonado em favor do padrão aberto 802.1Q. Quadros da VLAN nativa vão sem tag para compatibilidade com dispositivos que não entendem 802.1Q.',
      exemplo: 'Double tagging: um atacante na VLAN nativa envia um quadro com duas tags; o primeiro switch remove a externa (a nativa sai sem tag) e o segundo lê a interna — por isso a nativa deve ser uma VLAN sem usuários.',
    } },
    'intervlan-porque': { title: 'Por que um switch L2 não comunica VLANs distintas?', kinds: ['Técnico'], s: {
      porque: 'Porque VLANs diferentes são sub-redes IP diferentes, e mudar de sub-rede é, por definição, roteamento.',
      dentro: 'O switch L2 decide pelo MAC de destino dentro da VLAN de entrada; ele nunca olha o IP. O PC, ao ver que o destino está em outra sub-rede (comparando com sua máscara), envia o quadro ao MAC do gateway. O roteador recebe, retira o cabeçalho Ethernet, consulta a tabela de rotas pelo IP de destino e monta um quadro NOVO (MAC de origem = sua interface de saída; MAC de destino = o host, descoberto via ARP; tag da VLAN de saída, se for subinterface).',
      logica: 'O IP é preservado (exceto TTL, que diminui); o cabeçalho Ethernet é trocado a cada salto — por isso não é correto dizer que o roteador "só troca a VLAN".',
      diferente: 'Se o switch simplesmente encaminhasse entre VLANs, não haveria isolamento algum — seria uma VLAN só.',
      exemplo: 'Um switch L3 faz a mesma coisa em hardware (ASIC), por isso é preferido na camada de distribuição: roteamento entre VLANs na velocidade de comutação.',
    } },
  };

  return { modules, saibaMais, byId: Object.fromEntries(modules.map(m => [m.id, m])) };
})();
