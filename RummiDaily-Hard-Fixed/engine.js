(function () {
  const COLORS = ["red", "blue", "black", "yellow"];

  function isValidSet(group) {
    if (group.length < 3 || group.length > 4) return false;
    const real = group.filter(t => !t.joker);
    const jokers = group.length - real.length;
    if (!real.length) return false;
    if (!real.every(t => t.value === real[0].value)) return false;
    const colors = new Set(real.map(t => t.color));
    return colors.size === real.length && colors.size + jokers <= 4;
  }

  function isValidRun(group) {
    if (group.length < 3) return false;
    const real = group.filter(t => !t.joker);
    if (!real.length) return false;
    if (!real.every(t => t.color === real[0].color)) return false;

    // Visible order matters in the player UI.
    const firstRealIndex = group.findIndex(t => !t.joker);
    const firstRealValue = group[firstRealIndex].value;
    const start = firstRealValue - firstRealIndex;
    if (start < 1 || start + group.length - 1 > 13) return false;

    for (let i = 0; i < group.length; i++) {
      if (!group[i].joker && group[i].value !== start + i) return false;
    }
    return true;
  }

  function isValidMeld(group) {
    return isValidSet(group) || isValidRun(group);
  }

  function allTiles(puzzle) {
    return [...puzzle.groups.flat(), ...puzzle.rack];
  }

  function tileMap(puzzle) {
    return new Map(allTiles(puzzle).map(t => [t.id, t]));
  }

  function rackHasShortcut(puzzle) {
    return isValidMeld(puzzle.rack);
  }

  function verifyStoredSolution(puzzle) {
    const map = tileMap(puzzle);
    const seen = [];
    let legal = true;

    for (const ids of puzzle.solution) {
      const meld = ids.map(id => map.get(id));
      if (meld.some(t => !t)) {
        legal = false;
        continue;
      }
      if (!isValidMeld(meld)) legal = false;
      seen.push(...ids);
    }

    const expected = [...map.keys()].sort();
    const actual = [...seen].sort();
    const exactTileMatch =
      expected.length === actual.length &&
      expected.every((id, i) => id === actual[i]);

    return { legal, exactTileMatch };
  }

  function validatePuzzleDefinition(puzzle) {
    const allStartMeldsLegal = puzzle.groups.every(isValidMeld);
    const rackOnlyShortcut = rackHasShortcut(puzzle);
    const stored = verifyStoredSolution(puzzle);

    return {
      ok:
        allStartMeldsLegal &&
        !rackOnlyShortcut &&
        stored.legal &&
        stored.exactTileMatch &&
        puzzle.proof &&
        puzzle.proof.independentSolverFoundSolution === true,
      allStartMeldsLegal,
      rackOnlyShortcut,
      hiddenSolutionLegal: stored.legal,
      exactTileMatch: stored.exactTileMatch,
      independentlySolved: !!puzzle.proof?.independentSolverFoundSolution
    };
  }

  function initialGroupByTile(puzzle) {
    const out = new Map();
    puzzle.groups.forEach((g, gi) => g.forEach(t => out.set(t.id, gi)));
    puzzle.rack.forEach(t => out.set(t.id, "rack"));
    return out;
  }

  function solutionGroupByTile(puzzle) {
    const out = new Map();
    puzzle.solution.forEach((ids, gi) => ids.forEach(id => out.set(id, gi)));
    return out;
  }

  function structuralMetrics(puzzle) {
    const initial = initialGroupByTile(puzzle);
    const solved = solutionGroupByTile(puzzle);

    let rackTilesPlaced = puzzle.rack.length;
    let tableTilesThatChangePartners = 0;
    let disruptedInitialMelds = 0;

    puzzle.groups.forEach(group => {
      const destinationGroups = new Set(group.map(t => solved.get(t.id)));
      if (destinationGroups.size > 1) disruptedInitialMelds += 1;
    });

    for (const tile of puzzle.groups.flat()) {
      const startGroup = puzzle.groups[initial.get(tile.id)];
      const finalGroupIndex = solved.get(tile.id);
      const finalIds = new Set(puzzle.solution[finalGroupIndex]);

      const stayedWithAllOriginalPartners = startGroup
        .filter(t => t.id !== tile.id)
        .every(t => finalIds.has(t.id));

      if (!stayedWithAllOriginalPartners) tableTilesThatChangePartners += 1;
    }

    const score =
      rackTilesPlaced * 2 +
      disruptedInitialMelds * 4 +
      Math.min(tableTilesThatChangePartners, 20);

    return {
      rackTilesPlaced,
      disruptedInitialMelds,
      tableTilesThatChangePartners,
      score
    };
  }

  function deriveHints(puzzle) {
    const initial = initialGroupByTile(puzzle);
    const solved = solutionGroupByTile(puzzle);

    const movedTableTiles = puzzle.groups
      .flat()
      .filter(tile => {
        const startGroup = puzzle.groups[initial.get(tile.id)];
        const finalIds = new Set(puzzle.solution[solved.get(tile.id)]);
        return !startGroup
          .filter(t => t.id !== tile.id)
          .every(t => finalIds.has(t.id));
      });

    const movedValues = [...new Set(movedTableTiles.map(t => t.value))].sort((a,b) => a-b);
    const rackValues = puzzle.rack.map(t => t.value);

    return [
      `The rack does not solve itself. Start by asking which existing melds must be disturbed to place ${rackValues.join(", ")}.`,
      movedValues.length
        ? `The important restructuring is concentrated around the ${movedValues.slice(0, 3).join(", ")} tiles. Try thinking in sets as well as runs.`
        : "Try changing the type of meld you are looking for — a run can often be rebuilt as a set.",
      "A strong route is to create new same-number sets from low tiles, then keep the remaining high ends of the original runs intact."
    ];
  }

  window.RummiEngine = {
    isValidSet,
    isValidRun,
    isValidMeld,
    validatePuzzleDefinition,
    structuralMetrics,
    deriveHints
  };
})();
