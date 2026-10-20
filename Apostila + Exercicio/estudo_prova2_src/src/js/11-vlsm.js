/* ==========================================================================
   Engine VLSM — alocação, validação e explicação (puro)
   ========================================================================== */
const VLSM = (() => {
  const { network, broadcast, blockSize, minPrefixForHosts, toStr, maskStr, isAligned, usableHosts } = IPv4;

  /**
   * Aloca demandas (maior → menor), cada uma na próxima fronteira válida.
   * demands: [{name, hosts}] ; retorna {ok, allocations:[{name,hosts,prefix,net,bc,first,last,size}], error, used, free}
   */
  function allocate(baseNet, basePrefix, demands) {
    const base = network(baseNet, basePrefix);
    const end = broadcast(base, basePrefix);
    const order = demands.map((d, i) => ({ ...d, _i: i }))
      .sort((a, b) => b.hosts - a.hosts || a._i - b._i);
    let cursor = base;
    const allocations = [];
    for (const d of order) {
      const p = minPrefixForHosts(d.hosts);
      if (p === null || p < basePrefix) return { ok: false, allocations, error: `A demanda ${d.name} (${d.hosts} hosts) não cabe em /${basePrefix}.` };
      const size = blockSize(p);
      const aligned = Math.ceil((cursor - base) / size) * size + base;
      if (aligned + size - 1 > end) return { ok: false, allocations, error: `Espaço insuficiente para ${d.name} (${d.hosts} hosts, /${p}).` };
      allocations.push({ name: d.name, hosts: d.hosts, prefix: p, net: aligned, bc: aligned + size - 1, first: aligned + 1, last: aligned + size - 2, size, mask: maskStr(p) });
      cursor = aligned + size;
    }
    const used = allocations.reduce((s, a) => s + a.size, 0);
    return { ok: true, allocations, used, free: blockSize(basePrefix) - used, next: cursor <= end ? cursor : null };
  }

  /** Verifica sobreposição em lista [{net,prefix,name}] */
  function findOverlaps(list) {
    const out = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (IPv4.overlaps(a.net, a.prefix, b.net, b.prefix)) out.push([a.name, b.name]);
      }
    return out;
  }

  /** Diagnóstico de uma sub-rede escrita pelo aluno (ex.: 192.168.1.32/26). */
  function checkAlignment(net, prefix) {
    if (isAligned(net, prefix)) return { aligned: true };
    const real = network(net, prefix);
    const size = blockSize(prefix);
    return { aligned: false, realNetwork: real, nextValid: real + size, size };
  }

  /** Passos explicativos de uma alocação completa */
  function explain(baseNet, basePrefix, demands) {
    const r = allocate(baseNet, basePrefix, demands);
    const steps = [];
    const order = [...demands].sort((a, b) => b.hosts - a.hosts);
    steps.push(`Ordene as demandas da maior para a menor: ${order.map(d => `${d.name}=${d.hosts}`).join(', ')}.`);
    for (const a of r.allocations) {
      const h = 32 - a.prefix;
      steps.push(`${a.name}: precisa de ${a.hosts} hosts → menor 2^h − 2 ≥ ${a.hosts} é h=${h} (${2 ** h - 2} hosts) → /${a.prefix} (bloco de ${a.size}). Próxima fronteira múltipla de ${a.size}: ${toStr(a.net)}. Broadcast ${toStr(a.bc)}.`);
    }
    if (r.ok) steps.push(`Espaço usado: ${r.used} de ${blockSize(basePrefix)} endereços; livre a partir de ${r.next !== null ? toStr(r.next) : '—'}.`);
    else steps.push(r.error);
    return { result: r, steps };
  }

  return { allocate, findOverlaps, checkAlignment, explain, usableHosts };
})();
