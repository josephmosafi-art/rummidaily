/*
  RummiDaily exact-cover solver.
  It does not know the intended answer. It creates all legal candidate melds
  from the full tile pool, then searches for a partition covering every tile.
*/
(function () {
  function allTiles(puzzle) {
    return [...puzzle.groups.flat(), ...puzzle.rack];
  }

  function combinations(arr) {
    const out = [];
    const n = arr.length;
    for (let mask = 1; mask < (1 << n); mask++) {
      const c = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) c.push(arr[i]);
      out.push(c);
    }
    return out;
  }

  function validSet(group) {
    if (group.length < 3 || group.length > 4) return false;
    const real = group.filter(t => !t.joker);
    const jokers = group.length - real.length;
    if (!real.length) return false;
    if (!real.every(t => t.value === real[0].value)) return false;
    const colors = new Set(real.map(t => t.color));
    return colors.size === real.length && colors.size + jokers <= 4;
  }

  function validRunUnordered(group) {
    if (group.length < 3) return false;
    const real = group.filter(t => !t.joker);
    const jokers = group.length - real.length;
    if (!real.length) return false;
    if (!real.every(t => t.color === real[0].color)) return false;
    const vals = real.map(t => t.value).sort((a,b) => a-b);
    if (new Set(vals).size !== vals.length) return false;
    let gaps = 0;
    for (let i=1; i<vals.length; i++) gaps += vals[i]-vals[i-1]-1;
    if (gaps > jokers) return false;
    const spare = jokers - gaps;
    return spare <= (vals[0]-1) + (13-vals[vals.length-1]);
  }

  function candidateMelds(tiles) {
    const candidates = new Map();
    const jokers = tiles.filter(t => t.joker);

    function add(group) {
      if (!(validSet(group) || validRunUnordered(group))) return;
      const ids = group.map(t => t.id).sort();
      candidates.set(ids.join("|"), ids);
    }

    // Sets: same number, plus optional joker.
    for (let value=1; value<=13; value++) {
      const same = tiles.filter(t => !t.joker && t.value === value);
      for (const combo of combinations(same)) {
        if (combo.length >= 3) add(combo);
        if (jokers.length && combo.length >= 2 && combo.length <= 3) add([...combo, jokers[0]]);
      }
    }

    // Runs: subsets of each color + optional joker. Typical daily positions are small,
    // so this bounded enumeration is fast and much smaller than all-tile power sets.
    for (const color of ["red","blue","black","yellow"]) {
      const same = tiles.filter(t => !t.joker && t.color === color);
      for (const combo of combinations(same)) {
        if (combo.length >= 3) add(combo);
        if (jokers.length && combo.length >= 2) add([...combo, jokers[0]]);
      }
    }

    return [...candidates.values()];
  }

  function verify(puzzle) {
    const tiles = allTiles(puzzle);
    if (tiles.length > 52) return {solvable:false, reason:"too many tiles"};

    const index = new Map(tiles.map((t,i) => [t.id, i]));
    const meldIds = candidateMelds(tiles);
    const melds = meldIds.map(ids => ids.reduce((m,id) => m | (1n << BigInt(index.get(id))), 0n));
    const full = (1n << BigInt(tiles.length)) - 1n;

    const byTile = Array.from({length:tiles.length}, () => []);
    melds.forEach((mask, mi) => {
      for (let i=0;i<tiles.length;i++) {
        if (mask & (1n << BigInt(i))) byTile[i].push(mi);
      }
    });

    const memo = new Set();
    function dfs(used) {
      if (used === full) return true;
      const key = used.toString();
      if (memo.has(key)) return false;

      let best = -1;
      let bestOptions = null;
      for (let i=0;i<tiles.length;i++) {
        const bit = 1n << BigInt(i);
        if (used & bit) continue;
        const opts = byTile[i].filter(mi => !(melds[mi] & used));
        if (!opts.length) { memo.add(key); return false; }
        if (bestOptions === null || opts.length < bestOptions.length) {
          best = i; bestOptions = opts;
        }
      }

      for (const mi of bestOptions) {
        if (dfs(used | melds[mi])) return true;
      }
      memo.add(key);
      return false;
    }

    return {solvable: dfs(0n), candidates: melds.length, states: memo.size};
  }

  window.RummiSolver = { verify };
})();
