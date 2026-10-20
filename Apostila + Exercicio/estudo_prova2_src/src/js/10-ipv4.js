/* ==========================================================================
   Engine IPv4 / CIDR / sumarização — funções puras, sem DOM
   ========================================================================== */
const IPv4 = (() => {
  function toInt(s) {
    if (typeof s !== 'string') return null;
    const p = s.trim().split('.');
    if (p.length !== 4) return null;
    let n = 0;
    for (const x of p) {
      if (!/^\d{1,3}$/.test(x)) return null;
      const v = Number(x);
      if (v > 255) return null;
      n = n * 256 + v;
    }
    return n >>> 0;
  }
  const toStr = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  const maskInt = p => (p <= 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0);
  const maskStr = p => toStr(maskInt(p));
  const wildcardStr = p => toStr((~maskInt(p)) >>> 0);
  const blockSize = p => 2 ** (32 - p);

  /** Prefixo a partir de máscara decimal; null se não for contígua. */
  function prefixFromMask(s) {
    const m = toInt(s);
    if (m === null) return null;
    const inv = (~m) >>> 0;
    if (((inv + 1) & inv) !== 0) return null; // inv deve ser 2^k - 1
    let p = 0;
    for (let i = 31; i >= 0; i--) if ((m >>> i) & 1) p++; else break;
    return p;
  }

  /** Aceita "/26", "26", "255.255.255.192". */
  function parsePrefix(s) {
    if (typeof s !== 'string') return null;
    const t = s.trim();
    const m = t.match(/^\/?\s*(\d{1,2})$/);
    if (m) { const v = Number(m[1]); return v >= 0 && v <= 32 ? v : null; }
    return prefixFromMask(t);
  }

  /** Aceita "a.b.c.d/p" ou "a.b.c.d máscara". */
  function parseCidr(s) {
    const m = String(s).trim().match(/^(\S+?)\s*(?:\/|\s)\s*(\S+)$/);
    if (!m) return null;
    const ip = toInt(m[1]);
    const p = parsePrefix(m[2]);
    if (ip === null || p === null) return null;
    return { ip, prefix: p };
  }

  const network = (ip, p) => (ip & maskInt(p)) >>> 0;
  const broadcast = (ip, p) => (network(ip, p) | ((~maskInt(p)) >>> 0)) >>> 0;
  const isAligned = (ip, p) => network(ip, p) === (ip >>> 0);

  /** Hosts utilizáveis. Convencional: 2^h − 2. /31 (RFC 3021) = 2; /32 = 1 endereço. */
  function usableHosts(p) {
    if (p === 32) return 1;
    if (p === 31) return 2;
    return 2 ** (32 - p) - 2;
  }

  /** Octeto "interessante": onde a máscara deixa de ser 255. Índice 0..3. */
  function interestingOctet(p) {
    if (p >= 32) return 3;
    return Math.floor(p / 8);
  }
  function jump(p) {
    const idx = interestingOctet(p);
    const octet = (maskInt(p) >>> (24 - idx * 8)) & 255;
    return { octetIndex: idx, maskOctet: octet, jump: 256 - octet };
  }

  function info(ip, p) {
    const net = network(ip, p), bc = broadcast(ip, p);
    let first, last;
    if (p === 32) { first = last = net; }
    else if (p === 31) { first = net; last = bc; }
    else { first = net + 1; last = bc - 1; }
    return {
      ip, prefix: p, mask: maskStr(p), network: net, broadcast: bc,
      first: first >>> 0, last: last >>> 0, total: blockSize(p), usable: usableHosts(p),
      ...jump(p),
    };
  }

  /** Menor prefixo (bloco) que comporta n hosts utilizáveis (convencional, h ≥ 2). */
  function minPrefixForHosts(n) {
    for (let h = 2; h <= 32; h++) if (2 ** h - 2 >= n) return 32 - h;
    return null;
  }
  /** Bits a emprestar para obter pelo menos k sub-redes. */
  const bitsForSubnets = k => (k <= 1 ? 0 : Math.ceil(Math.log2(k) - 1e-9));

  const octetBin = v => v.toString(2).padStart(8, '0');
  const toBin = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(octetBin).join('.');

  /** Classe histórica pelo primeiro octeto. */
  function classOf(ipOrOctet) {
    const o = typeof ipOrOctet === 'number' && ipOrOctet <= 255 ? ipOrOctet : (ipOrOctet >>> 24);
    if (o === 0) return { cls: 'Especial', note: '0.0.0.0/8 — "esta rede" (reservado)', defPrefix: null };
    if (o <= 126) return { cls: 'A', defPrefix: 8 };
    if (o === 127) return { cls: 'Loopback', note: '127.0.0.0/8 é reservado para loopback (faixa da antiga classe A)', defPrefix: 8 };
    if (o <= 191) return { cls: 'B', defPrefix: 16 };
    if (o <= 223) return { cls: 'C', defPrefix: 24 };
    if (o <= 239) return { cls: 'D', note: 'Multicast', defPrefix: null };
    return { cls: 'E', note: 'Reservado/experimental', defPrefix: null };
  }

  function isPrivate(ip) {
    return network(ip, 8) === toInt('10.0.0.0') ||
      network(ip, 12) === toInt('172.16.0.0') ||
      network(ip, 16) === toInt('192.168.0.0');
  }

  const overlaps = (a, pa, b, pb) => {
    const p = Math.min(pa, pb);
    return network(a, p) === network(b, p);
  };

  /**
   * Sumarização: menor prefixo único que cobre todas as redes.
   * exact = true se o resumo cobre exatamente as redes dadas (sem endereços extras).
   */
  function summarize(nets) {
    if (!nets.length) return null;
    const norm = nets.map(n => ({ net: network(n.net, n.prefix), prefix: n.prefix }));
    const lo = Math.min(...norm.map(n => n.net));
    const hi = Math.max(...norm.map(n => broadcast(n.net, n.prefix)));
    // maior prefixo cujo bloco contém o menor e o maior endereço
    let p = Math.min(...norm.map(n => n.prefix));
    while (p > 0 && network(lo, p) !== network(hi, p)) p--;
    const sumNet = network(lo, p);
    // cobertura: soma dos tamanhos sem sobreposição
    const sorted = [...norm].sort((x, y) => x.net - y.net);
    let covered = 0, overlap = false, cursor = -1;
    for (const n of sorted) {
      const s = n.net, e = broadcast(n.net, n.prefix);
      if (s <= cursor) overlap = true;
      covered += blockSize(n.prefix);
      cursor = Math.max(cursor, e);
    }
    const exact = !overlap && covered === blockSize(p);
    return { net: sumNet, prefix: p, exact, extra: exact ? 0 : blockSize(p) - covered, overlap };
  }

  /** Passos explicativos para rede/broadcast pelo método do salto. */
  function explainSteps(ip, p) {
    const i = info(ip, p);
    const oct = ['1º', '2º', '3º', '4º'][i.octetIndex];
    const ipOct = (ip >>> (24 - i.octetIndex * 8)) & 255;
    const start = Math.floor(ipOct / i.jump) * i.jump;
    const steps = [];
    steps.push(`/${p} = ${i.mask}. Bits de host: 32 − ${p} = ${32 - p}.`);
    if (p % 8 === 0 && p < 32) {
      steps.push(`A máscara termina exatamente num octeto: o ${oct} octeto da máscara é 0, então o "salto" é 256 e o bloco começa em 0 nesse octeto.`);
    } else {
      steps.push(`O octeto interessante é o ${oct} (onde a máscara vale ${i.maskOctet}). Salto = 256 − ${i.maskOctet} = ${i.jump}.`);
    }
    steps.push(`No ${oct} octeto o IP vale ${ipOct}. Múltiplo de ${i.jump} imediatamente ≤ ${ipOct}: ${start} (próximo bloco começaria em ${start + i.jump}).`);
    steps.push(`Rede: ${toStr(i.network)} (bits de host = 0 → octetos seguintes viram 0).`);
    steps.push(`Broadcast: um antes do próximo bloco → ${toStr(i.broadcast)} (bits de host = 1 → octetos seguintes viram 255).`);
    if (p <= 30) steps.push(`Hosts: ${toStr(i.first)} até ${toStr(i.last)} → 2^${32 - p} − 2 = ${i.usable} utilizáveis.`);
    return steps;
  }

  return {
    toInt, toStr, maskInt, maskStr, wildcardStr, blockSize, prefixFromMask, parsePrefix, parseCidr,
    network, broadcast, isAligned, usableHosts, interestingOctet, jump, info, minPrefixForHosts,
    bitsForSubnets, octetBin, toBin, classOf, isPrivate, overlaps, summarize, explainSteps,
  };
})();
