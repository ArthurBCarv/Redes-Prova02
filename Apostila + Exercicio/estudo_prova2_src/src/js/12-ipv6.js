/* ==========================================================================
   Engine IPv6 — expandir, abreviar (RFC 5952), classificar (puro)
   ========================================================================== */
const IPv6 = (() => {
  /** Retorna array de 8 números (0..65535) ou null se inválido. */
  function parse(s) {
    if (typeof s !== 'string') return null;
    let t = s.trim().toLowerCase();
    const slash = t.indexOf('/');
    if (slash >= 0) t = t.slice(0, slash);
    if (!/^[0-9a-f:]+$/.test(t)) return null;
    const dbl = t.split('::');
    if (dbl.length > 2) return null; // "::" no máximo uma vez
    const head = dbl[0] ? dbl[0].split(':') : [];
    const tail = dbl.length === 2 && dbl[1] ? dbl[1].split(':') : [];
    const all = [...head, ...tail];
    if (all.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    if (dbl.length === 1 && head.length !== 8) return null;
    if (dbl.length === 2 && head.length + tail.length > 7) return null;
    const fill = dbl.length === 2 ? 8 - head.length - tail.length : 0;
    return [...head, ...Array(fill).fill('0'), ...tail].map(g => parseInt(g, 16));
  }

  const expand = s => { const g = parse(s); return g ? g.map(x => x.toString(16).padStart(4, '0')).join(':') : null; };

  /** Forma canônica RFC 5952: minúsculas, sem zeros à esquerda, :: na maior sequência (≥2) de zeros; empate → primeira. */
  function compress(s) {
    const g = Array.isArray(s) ? s : parse(s);
    if (!g) return null;
    let bestStart = -1, bestLen = 0;
    for (let i = 0; i < 8;) {
      if (g[i] !== 0) { i++; continue; }
      let j = i; while (j < 8 && g[j] === 0) j++;
      if (j - i > bestLen) { bestStart = i; bestLen = j - i; }
      i = j;
    }
    const hex = g.map(x => x.toString(16));
    if (bestLen < 2) return hex.join(':');
    const left = hex.slice(0, bestStart).join(':');
    const right = hex.slice(bestStart + bestLen).join(':');
    return `${left}::${right}`;
  }

  /** Igualdade semântica (duas grafias do mesmo endereço). */
  const equal = (a, b) => { const x = parse(a), y = parse(b); return !!x && !!y && x.every((v, i) => v === y[i]); };

  function inPrefix(g, prefixGroups, bits) {
    let remaining = bits;
    for (let i = 0; i < 8 && remaining > 0; i++) {
      const take = Math.min(16, remaining);
      const mask = take === 16 ? 0xffff : (0xffff << (16 - take)) & 0xffff;
      if ((g[i] & mask) !== (prefixGroups[i] & mask)) return false;
      remaining -= take;
    }
    return true;
  }

  const TYPES = [
    { id: 'unspecified', name: 'Não especificado', prefix: '::', bits: 128 },
    { id: 'loopback', name: 'Loopback', prefix: '::1', bits: 128 },
    { id: 'multicast', name: 'Multicast', prefix: 'ff00::', bits: 8 },
    { id: 'link-local', name: 'Link-local unicast', prefix: 'fe80::', bits: 10 },
    { id: 'ula', name: 'Unique local (ULA)', prefix: 'fc00::', bits: 7 },
    { id: 'documentation', name: 'Documentação (global unicast reservado a exemplos)', prefix: '2001:db8::', bits: 32 },
    { id: 'global', name: 'Global unicast', prefix: '2000::', bits: 3 },
  ];

  /** Classifica pelo prefixo. Anycast não é identificável pelo formato (usa espaço unicast). */
  function classify(s) {
    const g = parse(s);
    if (!g) return null;
    for (const t of TYPES) if (inPrefix(g, parse(t.prefix), t.bits)) return { ...t, cidr: `${t.prefix}/${t.bits}` };
    return { id: 'other', name: 'Outro/reservado', cidr: '' };
  }

  function explainCompress(s) {
    const g = parse(s);
    if (!g) return ['Endereço inválido.'];
    const steps = [];
    steps.push(`Grupos: ${g.map(x => x.toString(16).padStart(4, '0')).join(' : ')}`);
    steps.push(`1) Retire zeros à esquerda de cada grupo: ${g.map(x => x.toString(16)).join(':')}`);
    const c = compress(g);
    if (c.includes('::')) steps.push(`2) Troque a MAIOR sequência contínua de grupos 0 (com 2 ou mais grupos; empate → a primeira) por "::" uma única vez: ${c}`);
    else steps.push('2) Não há sequência de 2+ grupos zerados; não se usa "::" para um único grupo 0 (forma canônica RFC 5952).');
    return steps;
  }

  return { parse, expand, compress, equal, classify, explainCompress, TYPES };
})();
