const initialPuzzle = window.RUMMI_PUZZLES[0];
let state;
let moves = 0;
let dragState = null;
let hintsUsed = 0;
let selectedTileId = null;
let activeVisualHint = null;
let timerStarted = false;
let timerStartMs = 0;
let timerInterval = null;
let elapsedSeconds = 0;

const groupsLayer = document.getElementById("groupsLayer");
const rackEl = document.getElementById("rack");
const rackCountEl = document.getElementById("rackCount");
const messageEl = document.getElementById("message");
const resultCardEl = document.getElementById("resultCard");
const moveCountEl = document.getElementById("moveCount");
const sharePreviewEl = document.getElementById("sharePreview");
const puzzleNumberEl = document.getElementById("puzzleNumber");
const resultPuzzleEl = document.getElementById("resultPuzzle");


function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimer() {
  if (!timerStarted) return;
  elapsedSeconds = Math.floor((Date.now() - timerStartMs) / 1000);
  document.getElementById("timer").textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  timerStartMs = Date.now();
  timerInterval = setInterval(updateTimer, 250);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (timerStarted) updateTimer();
}

function clonePuzzle() {
  return JSON.parse(JSON.stringify(initialPuzzle));
}

function resetGame() {
  state = clonePuzzle();
  moves = 0;
  dragState = null;
  hintsUsed = 0;
  activeVisualHint = null;
  selectedTileId = null;
  timerStarted = false;
  elapsedSeconds = 0;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = '00:00';
  clearMessage();
  resultCardEl.classList.add("hidden");
  const hintPanel = document.getElementById("hintPanel");
  const hintText = document.getElementById("hintText");
  const hintBtn = document.getElementById("hintBtn");
  if (hintPanel) hintPanel.classList.add("hidden");
  if (hintText) hintText.textContent = "";
  if (hintBtn) { hintBtn.disabled = false; hintBtn.innerHTML = 'Hint <span id="hintCount">0/3</span>'; }
  puzzleNumberEl.textContent = `#${state.number}`;
  const definitionCheck = RummiEngine.validatePuzzleDefinition(initialPuzzle);
  const verifiedBadge = document.getElementById("verifiedBadge");
  verifiedBadge.textContent = definitionCheck.ok ? "✓ verified" : "⚠ rejected";
  verifiedBadge.classList.toggle("bad", !definitionCheck.ok);
  const difficultyBadge = document.getElementById("difficultyBadge");
  difficultyBadge.textContent = initialPuzzle.difficulty.toUpperCase();
  difficultyBadge.className = `difficulty ${initialPuzzle.difficulty.toLowerCase()}`;
  render();
}


function applyVisualHintOverlays() {
  document.querySelectorAll(".hint-group-ring").forEach(el => el.remove());

  if (!activeVisualHint || activeVisualHint.type !== "groups") return;

  const groups = activeVisualHint.groups || [];

  groups.forEach((ids, index) => {
    const tiles = ids
      .map(id => document.querySelector(`[data-tile-id="${id}"]`))
      .filter(Boolean);

    if (!tiles.length) return;

    const tableRect = groupsLayer.getBoundingClientRect();
    const rects = tiles.map(el => el.getBoundingClientRect());

    const left = Math.min(...rects.map(r => r.left)) - tableRect.left - 6;
    const top = Math.min(...rects.map(r => r.top)) - tableRect.top - 6;
    const right = Math.max(...rects.map(r => r.right)) - tableRect.left + 6;
    const bottom = Math.max(...rects.map(r => r.bottom)) - tableRect.top + 6;

    const ring = document.createElement("div");
    ring.className = "hint-group-ring";
    ring.style.left = `${left}px`;
    ring.style.top = `${top}px`;
    ring.style.width = `${right - left}px`;
    ring.style.height = `${bottom - top}px`;
    ring.textContent = index === 0 ? "make a set" : "make a set";
    groupsLayer.appendChild(ring);
  });
}

function render() {
  groupsLayer.innerHTML = "";

  state.groups.forEach((group, groupIndex) => {
    const groupEl = document.createElement("div");
    groupEl.className = "group";
    groupEl.dataset.zoneType = "group";
    groupEl.dataset.groupIndex = groupIndex;

    renderOrderedTiles(groupEl, group, groupIndex);
    attachZoneEvents(groupEl);
    groupsLayer.appendChild(groupEl);
  });

  rackEl.innerHTML = "";
  state.rack.forEach(tile => rackEl.appendChild(makeTile(tile)));
  attachZoneEvents(rackEl);

  rackCountEl.textContent = `${state.rack.length} tile${state.rack.length === 1 ? "" : "s"} left`;

  requestAnimationFrame(applyVisualHintOverlays);
}

function renderOrderedTiles(container, tiles, groupIndex) {
  container.appendChild(makeDropSlot(groupIndex, 0));

  tiles.forEach((tile, index) => {
    container.appendChild(makeTile(tile));

    if (index < tiles.length - 1) {
      container.appendChild(makeSplitSlot(groupIndex, index + 1));
    }

    container.appendChild(makeDropSlot(groupIndex, index + 1));
  });
}

function makeDropSlot(groupIndex, insertIndex) {
  const slot = document.createElement("div");
  slot.className = "tile-slot";
  slot.dataset.insertIndex = insertIndex;
  slot.dataset.groupIndex = groupIndex;

  slot.addEventListener("dragover", event => {
    event.preventDefault();
    slot.classList.add("active");
  });

  slot.addEventListener("dragleave", () => slot.classList.remove("active"));

  slot.addEventListener("drop", event => {
    event.preventDefault();
    event.stopPropagation();
    slot.classList.remove("active");

    if (!dragState) return;

    moveDraggedTile({
      type: "group",
      groupIndex: Number(groupIndex),
      insertIndex: Number(insertIndex)
    });
  });

  slot.addEventListener("click", event => {
    event.stopPropagation();
    if (!selectedTileId) return;
    startTimer();
    dragState = { tileId: selectedTileId };
    selectedTileId = null;
    moveDraggedTile({
      type: "group",
      groupIndex: Number(groupIndex),
      insertIndex: Number(insertIndex)
    });
  });

  return slot;
}

function makeSplitSlot(groupIndex, splitIndex) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "split-slot";
  button.title = "Split meld here";
  button.setAttribute("aria-label", `Split meld after tile ${splitIndex}`);

  const group = state.groups[groupIndex];
  const afterTile = group && group[splitIndex - 1];

  if (
    activeVisualHint &&
    activeVisualHint.type === "split" &&
    afterTile &&
    activeVisualHint.afterTileId === afterTile.id
  ) {
    button.classList.add("hint-split");
  }

  button.addEventListener("click", event => {
    event.stopPropagation();
    splitGroup(groupIndex, splitIndex);
  });

  return button;
}

function splitGroup(groupIndex, splitIndex) {
  startTimer();
  const group = state.groups[groupIndex];

  if (splitIndex <= 0 || splitIndex >= group.length) return;

  const left = group.slice(0, splitIndex);
  const right = group.slice(splitIndex);

  state.groups.splice(groupIndex, 1, left, right);
  moves += 1;
  clearMessage();
  render();
}

function makeTile(tile) {
  const el = document.createElement("div");

  if (tile.joker) {
    el.className = "tile joker";
    el.innerHTML = `
      <div class="joker-face">
        <span class="joker-star">★</span>
        <span class="joker-word">JOKER</span>
      </div>
    `;
  } else {
    el.className = `tile ${tile.color}`;
    el.textContent = tile.value;
  }

  el.draggable = true;
  el.dataset.tileId = tile.id;

  if (
    activeVisualHint &&
    Array.isArray(activeVisualHint.tileIds) &&
    activeVisualHint.tileIds.includes(tile.id)
  ) {
    el.classList.add("hint-highlight");
  }

  if (
    activeVisualHint &&
    activeVisualHint.type === "groups" &&
    Array.isArray(activeVisualHint.groups) &&
    activeVisualHint.groups.flat().includes(tile.id)
  ) {
    el.classList.add("hint-highlight");
  }

  if (selectedTileId === tile.id) {
    el.classList.add("selected");
  }

  el.addEventListener("click", event => {
    event.stopPropagation();
    startTimer();
    selectedTileId = selectedTileId === tile.id ? null : tile.id;
    render();
  });

  el.addEventListener("dragstart", () => {
    startTimer();
    dragState = { tileId: tile.id };
    selectedTileId = null;
    requestAnimationFrame(() => el.classList.add("dragging"));
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    document.querySelectorAll(".tile-slot.active").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".drag-over").forEach(z => z.classList.remove("drag-over"));
  });

  return el;
}

function attachZoneEvents(zone) {
  zone.addEventListener("dragover", event => {
    event.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

  zone.addEventListener("drop", event => {
    event.preventDefault();
    zone.classList.remove("drag-over");

    if (!dragState) return;

    if (zone.dataset.zoneType === "rack") {
      moveDraggedTile({ type: "rack" });
    } else {
      const groupIndex = Number(zone.dataset.groupIndex);
      moveDraggedTile({
        type: "group",
        groupIndex,
        insertIndex: state.groups[groupIndex].length
      });
    }
  });

  zone.addEventListener("click", event => {
    if (event.target.closest(".tile") || event.target.closest(".tile-slot") || event.target.closest(".split-slot")) return;
    if (!selectedTileId) return;
    startTimer();
    dragState = { tileId: selectedTileId };
    selectedTileId = null;

    if (zone.dataset.zoneType === "rack") {
      moveDraggedTile({ type: "rack" });
    } else {
      const groupIndex = Number(zone.dataset.groupIndex);
      moveDraggedTile({
        type: "group",
        groupIndex,
        insertIndex: state.groups[groupIndex].length
      });
    }
  });
}

function findTileLocation(tileId) {
  const rackIndex = state.rack.findIndex(t => t.id === tileId);
  if (rackIndex >= 0) {
    return { type: "rack", tileIndex: rackIndex, groupIndex: null };
  }

  for (let groupIndex = 0; groupIndex < state.groups.length; groupIndex++) {
    const tileIndex = state.groups[groupIndex].findIndex(t => t.id === tileId);
    if (tileIndex >= 0) {
      return { type: "group", tileIndex, groupIndex };
    }
  }

  return null;
}

function removeFromLocation(location) {
  if (location.type === "rack") {
    return state.rack.splice(location.tileIndex, 1)[0];
  }
  return state.groups[location.groupIndex].splice(location.tileIndex, 1)[0];
}


function isSameColourRunCandidate(group, incomingTile) {
  if (!incomingTile || incomingTile.joker) return false;

  const realTiles = group.filter(tile => !tile.joker);
  if (!realTiles.length) return false;

  return realTiles.every(tile => tile.color === incomingTile.color);
}

function getOrderedRunInsertIndex(group, incomingTile) {
  if (!isSameColourRunCandidate(group, incomingTile)) return null;

  // Keep jokers where the player placed them. For normal numbered tiles,
  // insert immediately before the first real tile with a larger value.
  for (let i = 0; i < group.length; i++) {
    const tile = group[i];

    if (tile.joker) continue;
    if (incomingTile.value < tile.value) return i;
  }

  return group.length;
}

function moveDraggedTile(destination) {
  const source = findTileLocation(dragState.tileId);
  if (!source) return;

  let insertIndex = destination.insertIndex;
  const tile = source.type === "rack"
    ? state.rack[source.tileIndex]
    : state.groups[source.groupIndex][source.tileIndex];

  if (
    source.type === "group" &&
    destination.type === "group" &&
    source.groupIndex === destination.groupIndex &&
    source.tileIndex < insertIndex
  ) {
    insertIndex -= 1;
  }

  const movedTile = removeFromLocation(source);

  if (destination.type === "rack") {
    state.rack.push(movedTile);
  } else {
    const destinationGroup = state.groups[destination.groupIndex];

    // Quality-of-life behavior:
    // if the destination is clearly a same-colour run, normal numbered
    // tiles automatically slot into numerical order.
    const autoIndex = getOrderedRunInsertIndex(destinationGroup, movedTile);

    if (autoIndex !== null) {
      destinationGroup.splice(autoIndex, 0, movedTile);
    } else {
      destinationGroup.splice(insertIndex, 0, movedTile);
    }
  }

  moves += 1;
  dragState = null;
  clearMessage();
  render();
}

function validateTable() {
  const nonEmptyGroups = state.groups.filter(group => group.length > 0);

  if (nonEmptyGroups.length === 0) {
    return { valid: false, reason: "The table cannot be empty." };
  }

  for (const group of nonEmptyGroups) {
    if (!RummiEngine.isValidMeld(group)) {
      return { valid: false, reason: "At least one meld on the table is invalid." };
    }
  }

  return { valid: true };
}

function checkSolution() {
  startTimer();
  const validation = validateTable();

  if (!validation.valid) {
    showMessage(validation.reason, "error");
    return;
  }

  if (state.rack.length > 0) {
    showMessage(`The table is valid, but you still have ${state.rack.length} tile${state.rack.length === 1 ? "" : "s"} left.`, "error");
    return;
  }

  stopTimer();
  showMessage("Solved!", "success");
  const resultSummary = document.getElementById("resultSummary");
  if (resultSummary) {
    resultSummary.innerHTML = `You solved #${state.number} in <strong>${formatTime(elapsedSeconds)}</strong> with <strong>${hintsUsed}</strong> hint${hintsUsed === 1 ? "" : "s"}.`;
  }
  if (moveCountEl) moveCountEl.textContent = `${moves} moves • ${formatTime(elapsedSeconds)}`;
  if (resultPuzzleEl) resultPuzzleEl.textContent = `#${state.number}`;
  sharePreviewEl.textContent = buildShareText();
  resultCardEl.classList.remove("hidden");
}

function buildShareText() {
  let line = "🟩🟩🟩";
  if (moves > 8) line = "🟩🟩🟨";
  if (moves > 12) line = "🟩🟨🟨";

  return `RummiDaily #${state.number} ✅\n${initialPuzzle.difficulty} ${line}\n⏱ ${formatTime(elapsedSeconds)}\n💡 ${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}`;
}

async function shareResult() {
  const text = buildShareText();

  try {
    if (navigator.share) {
      await navigator.share({ text });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showMessage("Result copied to clipboard.", "success");
    } else {
      sharePreviewEl.textContent = text;
    }
  } catch (error) {}
}

function tidyTable() {
  state.groups = state.groups.filter(group => group.length > 0);
  render();
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.textContent = "";
  messageEl.className = "message";
}


function showNextHint() {
  startTimer();

  const hints = initialPuzzle.visualHints || [];

  if (hintsUsed >= hints.length) {
    showMessage("You’ve used all available hints.", "error");
    return;
  }

  activeVisualHint = hints[hintsUsed];
  hintsUsed += 1;

  const panel = document.getElementById("hintPanel");
  const text = document.getElementById("hintText");
  const count = document.getElementById("hintCount");

  if (text) {
    text.textContent = activeVisualHint.label || "Look at the highlighted area.";
  }
  if (panel) panel.classList.remove("hidden");
  if (count) count.textContent = `${hintsUsed}/${hints.length}`;

  if (hintsUsed >= hints.length) {
    const button = document.getElementById("hintBtn");
    button.disabled = true;
    button.textContent = "No hints left";
  }

  render();
}

document.getElementById("checkBtn").addEventListener("click", checkSolution);
document.getElementById("hintBtn").addEventListener("click", showNextHint);
document.getElementById("resetBtn").addEventListener("click", resetGame);
document.getElementById("shareBtn").addEventListener("click", shareResult);

document.getElementById("addGroupBtn").addEventListener("click", () => {
  state.groups.push([]);
  render();
});

document.getElementById("tidyBtn").addEventListener("click", tidyTable);

resetGame();

const buildCheck = RummiEngine.validatePuzzleDefinition(initialPuzzle);
const metrics = RummiEngine.structuralMetrics(initialPuzzle);
console.info("RummiDaily puzzle proof:", {
  check: buildCheck,
  proof: initialPuzzle.proof,
  metrics
});
