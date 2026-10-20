/* ==========================================================================
   Questões: modelo, normalização/correção de campos, geradores (puros)
   Modelo de questão:
   { id, sig, topic, difficulty, kind, source:'prof'|'var'|'comp'|'gen', ref,
     prompt (HTML), fields:[{key,label,type,options?,placeholder?}], answer:{key:valor},
     hints:[3], fb:{asked, concept, rule, steps[], why, pitfalls[]}, tags:{campo|'*': tag}, fullVlsm? }
   ========================================================================== */
const Check = (() => {
  const norm = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const types = {
    ip: (v, a) => IPv4.toInt(String(v)) !== null && IPv4.toInt(String(v)) === IPv4.toInt(String(a)),
    prefix: (v, a) => { const p = IPv4.parsePrefix(String(v)); return p !== null && p === IPv4.parsePrefix(String(a)); },
    number: (v, a) => { const t = String(v).replace(/[.\s]/g, '').replace(',', '.'); return t !== '' && Number(t) === Number(a); },
    cidr: (v, a) => { const x = IPv4.parseCidr(String(v)), y = IPv4.parseCidr(String(a)); return !!x && !!y && x.ip === y.ip && x.prefix === y.prefix; },
    ipv6short: (v, a) => { const c = IPv6.compress(String(v)); return IPv6.equal(v, a) && c !== null && String(v).trim().length === IPv6.compress(a).length && !/(^|:)0[0-9a-f]/i.test(String(v)); },
    ipv6full: (v, a) => norm(v) === norm(IPv6.expand(a)),
    choice: (v, a) => v !== '' && v !== null && v !== undefined && Number(v) === Number(a),
    text: (v, a) => (Array.isArray(a) ? a : [a]).some(x => norm(x) === norm(v)),
  };
  /** Valida um campo; retorna true/false. */
  const field = (f, value, answer) => (types[f.type] || types.text)(value, answer);
  /** Corrige questão inteira: {ok, perField:{key:bool}, wrongKeys:[]} */
  function question(q, values) {
    const perField = {};
    for (const f of q.fields) perField[f.key] = field(f, values[f.key] ?? '', q.answer[f.key]);
    const wrongKeys = Object.keys(perField).filter(k => !perField[k]);
    return { ok: wrongKeys.length === 0, perField, wrongKeys };
  }
  /** Texto legível da resposta correta de um campo. */
  function display(f, a) {
    if (f.type === 'choice') return f.options[a];
    if (f.type === 'prefix') { const p = IPv4.parsePrefix(String(a)); return `/${p} (${IPv4.maskStr(p)})`; }
    if (f.type === 'ipv6short') return IPv6.compress(a);
    if (f.type === 'ipv6full') return IPv6.expand(a);
    return String(a);
  }
  return { field, question, display, types };
})();

/** RNG determinístico (mulberry32) para geradores reprodutíveis */
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: arr => arr[Math.floor(next() * arr.length)], shuffle: arr => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; } };
}

const Gen = (() => {
  const { toStr, maskStr, info, minPrefixForHosts, usableHosts, blockSize } = IPv4;
  const code = s => `<code>${s}</code>`;
  const DIFF = ['basico', 'intermediario', 'avancado'];

  function randomIp(rng, p, difficulty) {
    // básico: 192.168.x.y; intermediário: 172.16–31.x.y; avançado: qualquer unicast A/B/C
    if (difficulty === 'basico') return (192 * 2 ** 24) + (168 * 65536) + rng.int(0, 255) * 256 + rng.int(1, 254);
    if (difficulty === 'intermediario') return (172 * 2 ** 24) + rng.int(16, 31) * 65536 + rng.int(0, 255) * 256 + rng.int(0, 255);
    return rng.pick([rng.int(1, 126), rng.int(128, 223)]) * 2 ** 24 + rng.int(0, 255) * 65536 + rng.int(0, 255) * 256 + rng.int(0, 255);
  }
  const prefixFor = (rng, d) => d === 'basico' ? rng.int(25, 30) : d === 'intermediario' ? rng.pick([rng.int(17, 23), rng.int(25, 30)]) : rng.pick([rng.int(8, 15), rng.int(17, 23), rng.int(25, 30), 16, 24]);

  const generators = {
    /** Rede, broadcast, faixa e hosts a partir de IP/prefixo */
    subnetInfo(rng, d) {
      const p = prefixFor(rng, d); let ip = randomIp(rng, p, d);
      const i = info(ip, p);
      if (ip === i.network || ip === i.broadcast) ip = i.first;
      const useMask = d !== 'basico' && rng.next() < 0.5;
      const given = useMask ? `${toStr(ip)} com máscara ${maskStr(p)}` : `${toStr(ip)}/${p}`;
      const j = IPv4.jump(p);
      return {
        topic: 'mascara', kind: 'subnetInfo', sig: `subnetInfo:${toStr(ip)}/${p}`,
        prompt: `Para o endereço ${code(given)}, informe o endereço de rede, o primeiro e o último host utilizáveis, o broadcast e a quantidade de hosts utilizáveis.`,
        fields: [{ key: 'net', label: 'Rede', type: 'ip' }, { key: 'first', label: 'Primeiro host', type: 'ip' }, { key: 'last', label: 'Último host', type: 'ip' }, { key: 'bc', label: 'Broadcast', type: 'ip' }, { key: 'hosts', label: 'Hosts utilizáveis', type: 'number' }],
        answer: { net: toStr(i.network), first: toStr(i.first), last: toStr(i.last), bc: toStr(i.broadcast), hosts: i.usable },
        hints: [
          'A máscara separa rede (bits 1) de host (bits 0). Rede = todos os bits de host em 0; broadcast = todos em 1.',
          `Ache o octeto interessante: é o ${j.octetIndex + 1}º octeto, onde a máscara vale ${j.maskOctet}. Calcule 256 − ${j.maskOctet}.`,
          `O salto é ${j.jump}. Liste os múltiplos de ${j.jump} no ${j.octetIndex + 1}º octeto e veja em qual bloco o IP cai.`,
        ],
        fb: { asked: 'Rede, faixa de hosts, broadcast e quantidade de hosts', concept: 'Sub-rede IPv4: bloco de 2^h endereços alinhado em múltiplos do seu tamanho', rule: 'Salto = 256 − valor da máscara no octeto interessante; hosts = 2^(32−prefixo) − 2', steps: IPv4.explainSteps(ip, p), why: 'O endereço de rede é o início do bloco (bits de host = 0); o broadcast é o fim (bits de host = 1). Entre eles ficam os hosts.', pitfalls: ['Usar o salto no octeto errado (ex.: /22 varia no 3º octeto, não no 4º).', 'Esquecer de subtrair 2 (rede e broadcast) na contagem de hosts.', 'Escrever o broadcast como o início do próximo bloco em vez de um antes dele.'] },
        tags: { net: 'salto', bc: 'rede-vs-broadcast', first: 'rede-vs-broadcast', last: 'rede-vs-broadcast', hosts: 'contagem-hosts' },
      };
    },
    /** Máscara mínima para N hosts */
    minMask(rng, d) {
      const n = d === 'basico' ? rng.int(3, 120) : d === 'intermediario' ? rng.int(100, 1000) : rng.pick([rng.int(1000, 16000), rng.pick([62, 126, 254, 510, 30, 14])]);
      const p = minPrefixForHosts(n), h = 32 - p;
      return {
        topic: 'cidr', kind: 'minMask', sig: `minMask:${n}`,
        prompt: `Qual é o <strong>menor bloco</strong> (máscara com menos desperdício) que comporta <strong>${n} hosts</strong> utilizáveis? Informe o prefixo (ou a máscara decimal) e quantos hosts ele comporta.`,
        fields: [{ key: 'prefix', label: 'Prefixo ou máscara', type: 'prefix', placeholder: '/26 ou 255.255.255.192' }, { key: 'hosts', label: 'Hosts utilizáveis', type: 'number' }],
        answer: { prefix: `/${p}`, hosts: usableHosts(p) },
        hints: ['Procure o menor h (bits de host) tal que 2^h − 2 ≥ número de hosts.', `Teste potências: 2^${h - 1} − 2 = ${2 ** (h - 1) - 2}; é suficiente para ${n}?`, `h = ${h} bits de host. Prefixo = 32 − h.`],
        fb: { asked: `Menor prefixo para ${n} hosts`, concept: 'Cada bit de host dobra o tamanho do bloco', rule: '2^h − 2 ≥ hosts → prefixo = 32 − h', steps: [`2^${h - 1} − 2 = ${2 ** (h - 1) - 2} ${2 ** (h - 1) - 2 >= n ? '≥' : '<'} ${n} → ${2 ** (h - 1) - 2 >= n ? 'basta' : 'não basta'}.`, `2^${h} − 2 = ${2 ** h - 2} ≥ ${n} → basta.`, `Prefixo = 32 − ${h} = /${p} → máscara ${maskStr(p)}.`], why: `Com ${h - 1} bits não cabem ${n} hosts; com ${h} bits cabem ${2 ** h - 2}. Um prefixo maior que /${p} seria pequeno demais; menor desperdiçaria endereços.`, pitfalls: ['Escolher o prefixo "mais próximo" sem verificar se cabe (ex.: /27 para 60 hosts → só 30).', 'Esquecer o −2 (rede e broadcast): 64 endereços não são 64 hosts.'] },
        tags: { prefix: 'escolha-mascara', hosts: 'contagem-hosts' },
      };
    },
    /** n-ésima sub-rede ao dividir em partes iguais */
    nthSubnet(rng, d) {
      const bp = d === 'avancado' ? rng.pick([16, 20, 22]) : 24;
      const k = d === 'basico' ? rng.int(1, 3) : rng.int(2, 4);
      const parts = 2 ** k; const np = bp + k; const nth = rng.int(2, parts);
      const base = d === 'avancado' ? IPv4.network(172 * 2 ** 24 + rng.int(16, 31) * 65536 + rng.int(0, 255) * 256, bp) : IPv4.network(192 * 2 ** 24 + 168 * 65536 + rng.int(0, 255) * 256, 24);
      const net = base + (nth - 1) * blockSize(np); const i = info(net, np);
      return {
        topic: 'cidr', kind: 'nthSubnet', sig: `nth:${toStr(base)}/${bp}:${parts}:${nth}`,
        prompt: `A rede ${code(`${toStr(base)}/${bp}`)} foi dividida em <strong>${parts} sub-redes de mesmo tamanho</strong>. Informe o novo prefixo e, para a <strong>${nth}ª sub-rede</strong> (contando a primeira como 1ª), o endereço de rede e o broadcast.`,
        fields: [{ key: 'prefix', label: 'Novo prefixo', type: 'prefix' }, { key: 'net', label: `Rede da ${nth}ª`, type: 'ip' }, { key: 'bc', label: `Broadcast da ${nth}ª`, type: 'ip' }],
        answer: { prefix: `/${np}`, net: toStr(i.network), bc: toStr(i.broadcast) },
        hints: ['Sub-redes = 2^(bits emprestados).', `${parts} = 2^${k} → empreste ${k} bits: /${bp} + ${k}.`, `Cada sub-rede tem ${blockSize(np)} endereços. A ${nth}ª começa em base + (${nth} − 1) × ${blockSize(np)}.`],
        fb: { asked: `Prefixo, rede e broadcast da ${nth}ª sub-rede`, concept: 'Subdivisão por bits emprestados', rule: 'sub-redes = 2^bits emprestados; tamanho = 2^(32 − novo prefixo)', steps: [`${parts} sub-redes → 2^${k} → ${k} bits emprestados → /${np} (${maskStr(np)}).`, `Tamanho de cada bloco: 2^${32 - np} = ${blockSize(np)} endereços.`, `${nth}ª sub-rede: ${toStr(base)} + ${nth - 1} × ${blockSize(np)} = ${toStr(i.network)}.`, `Broadcast: próximo bloco − 1 = ${toStr(i.broadcast)}.`], why: 'Os blocos são consecutivos e do mesmo tamanho, então a posição n basta para localizar a sub-rede.', pitfalls: ['Contar a primeira sub-rede como "0ª" quando o enunciado diz "primeira = 1ª".', 'Somar o tamanho do bloco no octeto errado em prefixos menores que /24.'] },
        tags: { prefix: 'escolha-mascara', net: 'salto', bc: 'rede-vs-broadcast' },
      };
    },
    /** Conversões máscara ↔ prefixo ↔ binário */
    maskConvert(rng, d) {
      const p = d === 'basico' ? rng.int(24, 30) : rng.int(8, 30);
      const dir = rng.next() < 0.5;
      const bin = IPv4.toBin(IPv4.maskInt(p));
      return {
        topic: 'cidr', kind: 'maskConvert', sig: `maskConvert:${p}:${dir}`,
        prompt: dir ? `Converta o prefixo ${code('/' + p)} para máscara decimal e informe quantos bits de host ele deixa.` : `Converta a máscara ${code(maskStr(p))} para prefixo CIDR e informe quantos bits de host ela deixa.`,
        fields: [dir ? { key: 'm', label: 'Máscara decimal', type: 'ip' } : { key: 'm', label: 'Prefixo', type: 'prefix', placeholder: '/n' }, { key: 'h', label: 'Bits de host', type: 'number' }],
        answer: { m: dir ? maskStr(p) : `/${p}`, h: 32 - p },
        hints: ['O prefixo conta quantos bits 1 há na máscara, da esquerda para a direita.', 'Valores possíveis de um octeto de máscara: 0, 128, 192, 224, 240, 248, 252, 254, 255.', `Em binário: ${bin}`],
        fb: { asked: 'Converter máscara/prefixo', concept: 'Máscara = bits 1 contíguos à esquerda', rule: '128, 192, 224, 240, 248, 252, 254, 255 = 1 a 8 bits ligados', steps: [`Binário: ${bin}.`, `Bits 1: ${p} → /${p}; máscara ${maskStr(p)}.`, `Bits de host: 32 − ${p} = ${32 - p}.`], why: 'Cada 255 vale 8 bits; o octeto parcial soma os pesos 128+64+32+… ligados.', pitfalls: ['Achar que 255.255.255.192 é /27 (é /26: 24 + 2 bits).', 'Confundir bits de host com bits emprestados.'] },
        tags: { m: 'binario', h: 'contagem-hosts' },
      };
    },
    /** Decimal ↔ binário de um octeto */
    binary(rng, d) {
      const v = d === 'basico' ? rng.pick([128, 192, 224, 240, 248, 252, 254, 255, 10, 172, 168]) : rng.int(1, 255);
      const toBin = rng.next() < 0.5;
      const parts = [128, 64, 32, 16, 8, 4, 2, 1].filter(w => v & w);
      return {
        topic: 'ipv4', kind: 'binary', sig: `binary:${v}:${toBin}`,
        prompt: toBin ? `Converta o octeto ${code(v)} para binário (8 bits).` : `Converta o octeto binário ${code(IPv4.octetBin(v))} para decimal.`,
        fields: [{ key: 'v', label: toBin ? 'Binário (8 bits)' : 'Decimal', type: 'text' }],
        answer: { v: toBin ? IPv4.octetBin(v) : String(v) },
        hints: ['Pesos de um octeto: 128 64 32 16 8 4 2 1.', toBin ? 'Subtraia o maior peso possível e marque 1 nessa posição; repita.' : 'Some os pesos das posições com 1.', `Pesos usados: ${parts.join(' + ')}.`],
        fb: { asked: 'Conversão de um octeto', concept: 'Octeto = 8 bits, valores 0–255', rule: 'Pesos 128 64 32 16 8 4 2 1', steps: [`${v} = ${parts.join(' + ')}.`, `Bits: ${IPv4.octetBin(v)}.`], why: 'Cada posição representa uma potência de 2; o valor é a soma das posições ligadas.', pitfalls: ['Escrever menos de 8 dígitos (complete com zeros à esquerda).'] },
        tags: { v: 'binario' },
      };
    },
    /** Classe histórica / privado / especial */
    ipClass(rng, d) {
      const pool = d === 'basico' ? [10, 8, 20, 120, 130, 172, 186, 191, 192, 200, 223] : [1, 126, 127, 128, 186, 191, 192, 223, 224, 239, 240];
      const o = rng.pick(pool);
      const ip = `${o}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
      const c = IPv4.classOf(o);
      const opts = ['A', 'B', 'C', 'D (multicast)', 'E (experimental)', 'Loopback (127/8)'];
      const idx = { A: 0, B: 1, C: 2, D: 3, E: 4, Loopback: 5 }[c.cls];
      return {
        topic: 'ipv4', kind: 'ipClass', sig: `ipClass:${o}`,
        prompt: `Pela classificação histórica (classful), a que classe pertence ${code(ip)}?`,
        fields: [{ key: 'c', label: 'Classe', type: 'choice', options: opts }], answer: { c: idx },
        hints: ['A classe é definida apenas pelo primeiro octeto.', 'A: 1–126 · B: 128–191 · C: 192–223 · D: 224–239 · E: 240–255.', '127 é reservado para loopback.'],
        fb: { asked: 'Classe do endereço', concept: 'Endereçamento classful (histórico)', rule: 'A 1–126, B 128–191, C 192–223, D 224–239, E 240–255; 127/8 loopback', steps: [`Primeiro octeto: ${o}.`, `Faixa → ${opts[idx]}${c.note ? ' — ' + c.note : ''}.`], why: 'Antes do CIDR, os bits iniciais do primeiro octeto definiam a classe e a máscara padrão.', pitfalls: ['Classificar 186.x como classe C (é B: 128–191).', 'Incluir 127 na classe A como endereço utilizável.'] },
        tags: { c: 'classes' },
      };
    },
    /** VLSM completo */
    vlsm(rng, d) {
      const bp = d === 'avancado' ? rng.pick([23, 24]) : 24;
      const base = IPv4.network(192 * 2 ** 24 + 168 * 65536 + rng.int(0, 254) * 256, bp);
      const n = d === 'basico' ? 3 : d === 'intermediario' ? 4 : 5;
      const space = blockSize(bp);
      let demands, r;
      for (let tries = 0; tries < 50; tries++) {
        demands = Array.from({ length: n }, (_, j) => ({ name: String.fromCharCode(65 + j), hosts: rng.int(2, Math.floor(space / (j + 2.5))) }));
        r = VLSM.allocate(base, bp, demands);
        if (r.ok) break;
      }
      while (!r.ok) { demands = demands.map(x => ({ ...x, hosts: Math.max(2, Math.floor(x.hosts / 2)) })); r = VLSM.allocate(base, bp, demands); }
      const sorted = [...r.allocations];
      const fields = []; const answer = {};
      for (const a of sorted) {
        fields.push({ key: `${a.name}p`, label: `${a.name} (${a.hosts} hosts) — prefixo`, type: 'prefix', group: a.name });
        fields.push({ key: `${a.name}n`, label: `${a.name} — rede`, type: 'ip', group: a.name });
        fields.push({ key: `${a.name}b`, label: `${a.name} — broadcast`, type: 'ip', group: a.name });
        answer[`${a.name}p`] = `/${a.prefix}`; answer[`${a.name}n`] = toStr(a.net); answer[`${a.name}b`] = toStr(a.bc);
      }
      const ex = VLSM.explain(base, bp, demands);
      const tags = {}; for (const f of fields) tags[f.key] = f.key.endsWith('p') ? 'escolha-mascara' : f.key.endsWith('n') ? 'alinhamento' : 'rede-vs-broadcast';
      return {
        topic: 'vlsm', kind: 'vlsm', fullVlsm: true, sig: `vlsm:${toStr(base)}/${bp}:${demands.map(x => x.hosts).join(',')}`,
        prompt: `Divida ${code(`${toStr(base)}/${bp}`)} com VLSM para as demandas: ${demands.map(x => `<strong>${x.name}</strong> = ${x.hosts} hosts`).join(', ')}. Aloque da maior para a menor, começando em ${toStr(base)}, sempre na próxima fronteira válida.`,
        fields, answer,
        hints: ['Ordene da maior demanda para a menor. Cada bloco precisa comportar hosts + rede + broadcast.', `Comece por ${sorted[0].name} (${sorted[0].hosts} hosts): menor 2^h − 2 ≥ ${sorted[0].hosts}.`, `${sorted[0].name} = /${sorted[0].prefix} em ${toStr(sorted[0].net)}; a próxima começa em ${toStr(sorted[0].bc + 1)}${sorted[1] ? ` e ${sorted[1].name} = /${sorted[1].prefix}` : ''}.`],
        fb: { asked: 'Plano VLSM: prefixo, rede e broadcast de cada sub-rede', concept: 'VLSM = sub-redes de tamanhos diferentes dentro do mesmo bloco', rule: 'Maior primeiro; bloco = menor 2^h com 2^h − 2 ≥ hosts; rede sempre múltipla do tamanho do bloco', steps: ex.steps, why: 'Alocar do maior para o menor mantém cada bloco naturalmente alinhado e evita buracos que impediriam encaixar blocos grandes depois.', pitfalls: ['Alocar na ordem do enunciado em vez da maior para a menor.', 'Começar um bloco /26 em .32 (não alinhado).', 'Esquecer que "2 hosts" exige /30, não /31, no cálculo convencional.'] },
        tags,
      };
    },
    /** Alinhamento/sobreposição */
    alignment(rng, d) {
      const p = rng.int(25, 28); const size = blockSize(p);
      const step = size / 2; const off = rng.int(0, (256 / step) - 1) * step;
      const net = 192 * 2 ** 24 + 168 * 65536 + rng.int(0, 255) * 256 + off;
      const c = VLSM.checkAlignment(net, p);
      return {
        topic: 'vlsm', kind: 'alignment', sig: `align:${toStr(net)}/${p}`,
        prompt: `Um analista configurou a sub-rede ${code(`${toStr(net)}/${p}`)}. Esse é um endereço de rede válido para /${p}? Se não for, qual é a rede /${p} que realmente contém esse endereço?`,
        fields: [{ key: 'v', label: 'É válido?', type: 'choice', options: ['Sim, está alinhado', 'Não, não está alinhado'] }, { key: 'real', label: 'Rede /' + p + ' que contém o endereço', type: 'ip' }],
        answer: { v: c.aligned ? 0 : 1, real: toStr(c.aligned ? net : c.realNetwork) },
        hints: [`Um bloco /${p} tem ${size} endereços e só pode começar em múltiplos de ${size}.`, `O último octeto é ${net & 255}. Ele é múltiplo de ${size}?`, `Múltiplo de ${size} imediatamente ≤ ${net & 255}: ${(net & 255) - ((net & 255) % size)}.`],
        fb: { asked: 'Validar o alinhamento da sub-rede', concept: 'Blocos CIDR são alinhados ao próprio tamanho', rule: `Rede /${p} ⇒ último octeto múltiplo de ${size}`, steps: [`/${p} → blocos de ${size}.`, `${net & 255} ${(net & 255) % size === 0 ? 'é' : 'não é'} múltiplo de ${size}.`, `Rede real: ${toStr(c.aligned ? net : c.realNetwork)}/${p}.`], why: 'O endereço de rede tem todos os bits de host em 0; se algum bit de host estiver em 1, o valor é um host, não uma rede.', pitfalls: ['Achar que qualquer endereço "redondo" serve como rede.', 'Não perceber a sobreposição com blocos já alocados (Lista Q19).'] },
        tags: { v: 'alinhamento', real: 'alinhamento' },
      };
    },
    /** Sumarização */
    summarize(rng, d) {
      const p = d === 'basico' ? 24 : rng.pick([24, 25, 26]);
      const k = d === 'basico' ? 1 : rng.int(1, 2);
      const cnt = 2 ** k; const sp = p - k;
      const exactCase = d !== 'avancado' || rng.next() < 0.5;
      let base = IPv4.network(192 * 2 ** 24 + 168 * 65536 + rng.int(0, 255) * 256, sp);
      let nets = Array.from({ length: cnt }, (_, j) => ({ net: base + j * blockSize(p), prefix: p }));
      if (!exactCase) nets = nets.map(n => ({ ...n, net: n.net + blockSize(p) }));
      const s = IPv4.summarize(nets);
      return {
        topic: 'sumarizacao', kind: 'summarize', sig: `sum:${nets.map(n => toStr(n.net)).join(',')}/${p}`,
        prompt: `Sumarize em uma única rota as redes ${nets.map(n => code(`${toStr(n.net)}/${p}`)).join(', ')}. Informe o resumo (rede/prefixo) e se ele cobre <strong>exatamente</strong> essas redes.`,
        fields: [{ key: 's', label: 'Resumo (rede/prefixo)', type: 'cidr', placeholder: 'a.b.c.d/n' }, { key: 'x', label: 'Cobre exatamente?', type: 'choice', options: ['Sim, exatamente', 'Não, inclui endereços extras'] }],
        answer: { s: `${toStr(s.net)}/${s.prefix}`, x: s.exact ? 0 : 1 },
        hints: ['Escreva em binário o octeto que varia e veja quantos bits iniciais são comuns a todas as redes.', 'O resumo é o maior prefixo cujo bloco contém o menor e o maior endereço.', `O bloco resumo tem ${blockSize(s.prefix)} endereços; as redes somam ${nets.length * blockSize(p)}.`],
        fb: { asked: 'Rota resumida', concept: 'Sumarização (super-rede) com CIDR', rule: 'Bits iniciais comuns = prefixo do resumo; o bloco deve ser alinhado', steps: [`Menor endereço: ${toStr(Math.min(...nets.map(n => n.net)))}; maior: ${toStr(Math.max(...nets.map(n => n.net)) + blockSize(p) - 1)}.`, `Menor bloco alinhado que contém ambos: ${toStr(s.net)}/${s.prefix} (${blockSize(s.prefix)} endereços).`, s.exact ? 'As redes preenchem o bloco inteiro → resumo exato.' : `As redes somam ${nets.length * blockSize(p)} endereços; o resumo inclui ${s.extra} endereços que não pertencem a elas.`], why: 'Um roteador anuncia um único prefixo que contém todas as redes; se o bloco for maior que a soma, ele também "atrai" tráfego para redes que não existem ali.', pitfalls: ['Somar os prefixos ou só subtrair 1 sem conferir o alinhamento.', 'Ignorar que redes não alinhadas exigem um resumo maior (com endereços extras).'] },
        tags: { s: 'sumarizacao', x: 'sumarizacao' },
      };
    },
    ipv6Compress(rng, d) {
      const g = Array.from({ length: 8 }, (_, i) => (rng.next() < (d === 'basico' ? 0.5 : 0.4) ? 0 : rng.int(1, d === 'basico' ? 255 : 65535)));
      g[0] = rng.pick([0x2001, 0xfe80, 0x2804, 0xfd00]); if (g[0] === 0x2001 && rng.next() < 0.6) g[1] = 0x0db8;
      const full = g.map(x => x.toString(16).padStart(4, '0')).join(':');
      return {
        topic: 'ipv6', kind: 'ipv6Compress', sig: `v6c:${full}`,
        prompt: `Escreva a forma <strong>mais curta</strong> (canônica) do endereço ${code(full)}.`,
        fields: [{ key: 'a', label: 'Forma abreviada', type: 'ipv6short' }], answer: { a: full },
        hints: ['Regra 1: retire os zeros à esquerda de cada grupo (0db8 → db8, 0000 → 0).', 'Regra 2: troque UMA sequência contínua de grupos 0 por "::" — escolha a mais longa.', `Depois da regra 1: ${g.map(x => x.toString(16)).join(':')}`],
        fb: { asked: 'Abreviar IPv6', concept: 'Notação IPv6 (RFC 4291/5952)', rule: 'Zeros à esquerda saem; "::" uma única vez na maior sequência de zeros', steps: IPv6.explainCompress(full), why: '"::" significa "quantos grupos zero forem necessários para completar 8"; se aparecesse duas vezes, não daria para saber quantos zeros há em cada lugar.', pitfalls: ['Usar "::" duas vezes.', 'Retirar zeros à DIREITA de um grupo (db80 ≠ db8).', 'Comprimir a sequência menor em vez da maior.'] },
        tags: { a: 'ipv6-abrev' },
      };
    },
    ipv6Expand(rng, d) {
      const g = Array.from({ length: 8 }, () => (rng.next() < 0.45 ? 0 : rng.int(1, 4095)));
      g[0] = rng.pick([0x2001, 0xfe80, 0x2804]);
      const short = IPv6.compress(g);
      return {
        topic: 'ipv6', kind: 'ipv6Expand', sig: `v6e:${short}`,
        prompt: `Expanda o endereço ${code(short)} para a forma completa (8 grupos de 4 dígitos hexadecimais).`,
        fields: [{ key: 'a', label: 'Forma completa', type: 'ipv6full' }], answer: { a: short },
        hints: ['Conte quantos grupos aparecem; "::" vale os grupos que faltam para completar 8.', `Há ${short.split(':').filter(x => x).length} grupos escritos.`, 'Complete cada grupo com zeros à esquerda até ter 4 dígitos.'],
        fb: { asked: 'Expandir IPv6', concept: 'Notação IPv6', rule: '8 grupos × 16 bits; "::" = grupos zero omitidos', steps: [`Grupos escritos: ${short.split(':').filter(x => x).length}; "::" representa ${8 - short.split(':').filter(x => x).length} grupo(s) 0000.`, `Resultado: ${IPv6.expand(short)}.`], why: '128 bits = 8 grupos de 16 bits = 32 dígitos hexadecimais.', pitfalls: ['Errar a quantidade de grupos que "::" representa.', 'Esquecer de completar grupos curtos com zeros à esquerda.'] },
        tags: { a: 'ipv6-abrev' },
      };
    },
    ipv6Type(rng) {
      const samples = [['fe80::1a2b:3cff:fe4d:5e6f', 'link-local'], ['ff02::1', 'multicast'], ['ff02::2', 'multicast'], ['2001:db8:acad::10', 'documentation'], ['2804:14c:65::1', 'global'], ['fd12:3456:789a::1', 'ula'], ['::1', 'loopback'], ['::', 'unspecified'], ['2001:4860:4860::8888', 'global'], ['fe80::1', 'link-local']];
      const [addr, id] = rng.pick(samples);
      const opts = ['Global unicast (2000::/3)', 'Link-local (fe80::/10)', 'Unique local – ULA (fc00::/7)', 'Multicast (ff00::/8)', 'Loopback (::1/128)', 'Não especificado (::/128)', 'Documentação (2001:db8::/32)'];
      const map = { global: 0, 'link-local': 1, ula: 2, multicast: 3, loopback: 4, unspecified: 5, documentation: 6 };
      return {
        topic: 'ipv6', kind: 'ipv6Type', sig: `v6t:${addr}`,
        prompt: `Qual é o tipo do endereço IPv6 ${code(addr)}?`,
        fields: [{ key: 't', label: 'Tipo', type: 'choice', options: opts }], answer: { t: map[id] },
        hints: ['Olhe o primeiro grupo (e os primeiros bits).', 'fe80 → link-local; ff → multicast; fc/fd → ULA; 2xxx/3xxx → global.', '2001:db8:: é global unicast reservado para documentação.'],
        fb: { asked: 'Tipo de endereço IPv6', concept: 'Tipos de endereço pelo prefixo', rule: 'fe80::/10 link-local · ff00::/8 multicast · fc00::/7 ULA · 2000::/3 global · ::1 loopback', steps: [`${addr} → ${opts[map[id]]}.`], why: 'Os primeiros bits definem o escopo e o uso do endereço.', pitfalls: ['Achar que fe80 é roteável na Internet (link-local só vale no enlace).', 'Procurar broadcast no IPv6 — ele não existe; usa-se multicast (ex.: ff02::1 = todos os nós do enlace).'] },
        tags: { t: 'ipv6-tipos' },
      };
    },
    /** STP: topologia aleatória de 3 switches */
    stp(rng, d) {
      const prios = d === 'basico' ? [rng.pick([4096, 8192, 24576]), 32768, 32768] : [32768, 32768, 32768].map(() => rng.pick([28672, 32768]));
      const ids = rng.shuffle(['S1', 'S2', 'S3']);
      const sws = ['S1', 'S2', 'S3'].map((id, i) => ({ id, priority: prios[ids.indexOf(id)], mac: `00${rng.int(10, 99)}.${rng.int(1000, 9999)}.${(0xa000 + rng.int(0, 0xfff)).toString(16)}` }));
      const speeds = d === 'avancado' ? [19, 19, 4] : [19, 19, 19];
      const sh = rng.shuffle(speeds);
      const P = (name, num) => ({ name, num });
      const links = [
        { id: 'L12', a: 'S1', pa: P('Fa0/1', 1), b: 'S2', pb: P('Fa0/1', 1), cost: sh[0] },
        { id: 'L13', a: 'S1', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/1', 1), cost: sh[1] },
        { id: 'L23', a: 'S2', pa: P('Fa0/2', 2), b: 'S3', pb: P('Fa0/2', 2), cost: sh[2] },
      ];
      const r = STP.compute(sws, links);
      const root = r.rootOf.S1;
      const blockedKey = Object.keys(r.ports).find(k => r.ports[k].role === 'blocked');
      const portOpts = ['S1 Fa0/1', 'S1 Fa0/2', 'S2 Fa0/1', 'S2 Fa0/2', 'S3 Fa0/1', 'S3 Fa0/2'];
      const nonRoot = sws.filter(s => s.id !== root).map(s => s.id);
      const ask = rng.pick(nonRoot);
      const rpOpts = ['Fa0/1', 'Fa0/2'];
      return {
        topic: 'stp', kind: 'stp', sig: `stp:${sws.map(s => s.priority + s.mac).join('|')}:${sh.join(',')}`,
        stpData: { switches: sws, links },
        prompt: `Três switches em triângulo rodando STP 802.1D. Dados: ${sws.map(s => `<strong>${s.id}</strong> prioridade ${s.priority}, MAC ${code(s.mac)}`).join('; ')}. Custos: S1–S2 = ${sh[0]}, S1–S3 = ${sh[1]}, S2–S3 = ${sh[2]}. Portas: S1 Fa0/1↔S2 Fa0/1, S1 Fa0/2↔S3 Fa0/1, S2 Fa0/2↔S3 Fa0/2.`,
        fields: [
          { key: 'root', label: 'Root Bridge', type: 'choice', options: ['S1', 'S2', 'S3'] },
          { key: 'rp', label: `Root Port de ${ask}`, type: 'choice', options: rpOpts },
          { key: 'blk', label: 'Porta bloqueada', type: 'choice', options: portOpts },
        ],
        answer: { root: ['S1', 'S2', 'S3'].indexOf(root), rp: rpOpts.indexOf(r.rootPort[ask]), blk: portOpts.indexOf(blockedKey.replace('|', ' ')) },
        hints: ['Root Bridge = menor Bridge ID: compare a prioridade; só em empate compare o MAC (menor vence).', 'Root Port = porta do switch não-root com menor custo acumulado até a raiz.', 'No enlace entre os dois não-root, a porta do switch com maior custo até a raiz (ou, empatado, maior BID) fica bloqueada.'],
        fb: { asked: 'Root Bridge, Root Port e porta bloqueada', concept: 'Eleição STP 802.1D', rule: 'Menor BID → menor custo até a raiz → menor BID do vizinho → menor Port ID', steps: r.explain, why: 'O STP mantém exatamente um caminho ativo entre quaisquer dois switches; a porta que sobra no triângulo é bloqueada para quebrar o loop.', pitfalls: ['Comparar MAC antes da prioridade.', 'Achar que a raiz tem Root Port (ela não tem; todas as suas portas são designadas).', 'Esquecer que custo menor = enlace mais rápido.'] },
        tags: { root: 'root-bridge', rp: 'papeis-porta', blk: 'papeis-porta' },
      };
    },
  };

  /** Catálogo: quais geradores servem cada tópico */
  const byTopic = {
    ipv4: ['binary', 'ipClass'], mascara: ['subnetInfo'], cidr: ['minMask', 'nthSubnet', 'maskConvert'],
    vlsm: ['vlsm', 'alignment'], sumarizacao: ['summarize'], ipv6: ['ipv6Compress', 'ipv6Expand', 'ipv6Type'], stp: ['stp'],
  };

  /** Gera evitando assinaturas já resolvidas. */
  function make(name, difficulty = 'basico', seed = Date.now(), avoid = new Set()) {
    const rng = makeRng(seed);
    let q = null;
    for (let i = 0; i < 60; i++) {
      q = generators[name](rng, difficulty);
      if (!avoid.has(q.sig)) break;
    }
    q.id = `gen:${q.sig}`; q.difficulty = difficulty; q.source = 'gen'; q.generator = name;
    return q;
  }

  return { make, byTopic, names: Object.keys(generators), DIFF };
})();
