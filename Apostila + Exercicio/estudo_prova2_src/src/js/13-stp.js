/* ==========================================================================
   Engine STP (802.1D clássico) — eleição de root, root ports, designated
   Desempates: menor BID (prioridade, depois MAC) → menor custo até a raiz →
   menor BID do vizinho que envia a BPDU → menor Port ID do vizinho → menor Port ID local.
   ========================================================================== */
const STP = (() => {
  /** Custos curtos 802.1D-1998 por velocidade (Mb/s). */
  const COSTS = { 10: 100, 100: 19, 1000: 4, 10000: 2 };

  const macKey = m => m.toLowerCase().replace(/[^0-9a-f]/g, '').padStart(12, '0');
  /** Compara BIDs: prioridade primeiro, depois MAC (como número hexadecimal). */
  function cmpBid(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const x = macKey(a.mac), y = macKey(b.mac);
    return x < y ? -1 : x > y ? 1 : 0;
  }
  const cmpTuple = (a, b) => { for (let i = 0; i < a.length; i++) { const d = typeof a[i] === 'number' ? a[i] - b[i] : (a[i] < b[i] ? -1 : a[i] > b[i] ? 1 : 0); if (d) return d; } return 0; };

  /**
   * switches: [{id, priority, mac}]
   * links: [{id, a, pa, b, pb, cost, up}]  — pa/pb: {name, num} (num = número usado no Port ID; prioridade de porta 128)
   * retorna { roots:{componentRoot por switch}, cost:{}, ports: {"sw|portName": {role, state, link}}, rootPort:{}, explain:[] }
   */
  function compute(switches, links) {
    const sw = Object.fromEntries(switches.map(s => [s.id, s]));
    const up = links.filter(l => l.up !== false);
    const adj = Object.fromEntries(switches.map(s => [s.id, []]));
    for (const l of up) {
      adj[l.a].push({ link: l, me: l.pa, nb: l.b, nbPort: l.pb });
      adj[l.b].push({ link: l, me: l.pb, nb: l.a, nbPort: l.pa });
    }
    // componentes conectados
    const comp = {}; let c = 0;
    for (const s of switches) {
      if (comp[s.id] !== undefined) continue;
      const stack = [s.id]; comp[s.id] = c;
      while (stack.length) { const x = stack.pop(); for (const e of adj[x]) if (comp[e.nb] === undefined) { comp[e.nb] = c; stack.push(e.nb); } }
      c++;
    }
    const rootOf = {};
    for (let k = 0; k < c; k++) {
      const members = switches.filter(s => comp[s.id] === k).sort(cmpBid);
      for (const m of members) rootOf[m.id] = members[0].id;
    }
    // Dijkstra por componente
    const cost = {};
    for (const s of switches) cost[s.id] = s.id === rootOf[s.id] ? 0 : Infinity;
    const done = new Set();
    while (done.size < switches.length) {
      let best = null;
      for (const s of switches) if (!done.has(s.id) && (best === null || cost[s.id] < cost[best])) best = s.id;
      if (best === null || cost[best] === Infinity) break;
      done.add(best);
      for (const e of adj[best]) if (cost[best] + e.link.cost < cost[e.nb]) cost[e.nb] = cost[best] + e.link.cost;
    }
    const portId = p => 128 * 1000 + p.num;
    const ports = {}; const rootPort = {}; const explain = [];
    // Root ports
    for (const s of switches) {
      if (s.id === rootOf[s.id]) { explain.push(`${s.id} é a Root Bridge (menor BID: prioridade ${s.priority}, MAC ${s.mac}). Root Bridge não tem Root Port.`); continue; }
      let bestE = null, bestT = null;
      for (const e of adj[s.id]) {
        const t = [cost[e.nb] + e.link.cost, sw[e.nb].priority, macKey(sw[e.nb].mac), portId(e.nbPort), portId(e.me)];
        if (bestT === null || cmpTuple(t, bestT) < 0) { bestT = t; bestE = e; }
      }
      if (bestE) {
        rootPort[s.id] = bestE.me.name;
        const cands = adj[s.id].map(e => `${e.me.name}: custo ${cost[e.nb] + e.link.cost} via ${e.nb}`).join('; ');
        explain.push(`${s.id}: candidatos ${cands} → Root Port = ${bestE.me.name}${adj[s.id].filter(e => cost[e.nb] + e.link.cost === bestT[0]).length > 1 ? ' (empate de custo resolvido pelo menor BID do vizinho e depois Port ID)' : ''}.`);
      }
    }
    // Designated por segmento
    for (const l of links) {
      if (l.up === false) {
        ports[`${l.a}|${l.pa.name}`] = { role: 'disabled', state: 'disabled', link: l.id };
        ports[`${l.b}|${l.pb.name}`] = { role: 'disabled', state: 'disabled', link: l.id };
        continue;
      }
      const ta = [cost[l.a], sw[l.a].priority, macKey(sw[l.a].mac), portId(l.pa)];
      const tb = [cost[l.b], sw[l.b].priority, macKey(sw[l.b].mac), portId(l.pb)];
      const aWins = cmpTuple(ta, tb) < 0;
      const [dSw, dP, oSw, oP] = aWins ? [l.a, l.pa, l.b, l.pb] : [l.b, l.pb, l.a, l.pa];
      ports[`${dSw}|${dP.name}`] = { role: 'designated', state: 'forwarding', link: l.id };
      const isRP = rootPort[oSw] === oP.name;
      ports[`${oSw}|${oP.name}`] = isRP ? { role: 'root', state: 'forwarding', link: l.id } : { role: 'blocked', state: 'blocking', link: l.id };
      if (!isRP) explain.push(`Enlace ${l.a}(${l.pa.name})–${l.b}(${l.pb.name}): designada = ${dSw} ${dP.name} (custo até a raiz ${cost[dSw]} vs ${cost[oSw]}${cost[dSw] === cost[oSw] ? ', empate → menor BID' : ''}). ${oSw} ${oP.name} não é Root nem Designada → bloqueada (802.1D: Blocking; RSTP: Alternate/Discarding).`);
    }
    return { rootOf, cost, ports, rootPort, explain };
  }

  return { compute, cmpBid, COSTS, macKey };
})();
