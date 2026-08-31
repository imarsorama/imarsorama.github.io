/**
 * SUMDROP — Tetris gravity + Number Sums clearing
 */
(() => {
  const COLS = 8;
  const ROWS = 14;
  const VISIBLE = 12;
  const HIDDEN = ROWS - VISIBLE;

  const SHAPES = {
    I: [[[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]]],
    O: [[[0, 0], [0, 1], [1, 0], [1, 1]]],
    T: [
      [[0, 0], [0, 1], [0, 2], [1, 1]],
      [[0, 1], [1, 0], [1, 1], [2, 1]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
    ],
    L: [
      [[0, 0], [1, 0], [2, 0], [2, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 0]],
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [0, 2]],
    ],
    J: [
      [[0, 1], [1, 1], [2, 1], [2, 0]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [0, 1], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [0, 2], [1, 2]],
    ],
    S: [
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],
    Z: [
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],
  };

  const PIECE_KEYS = Object.keys(SHAPES);
  const DIGIT_WEIGHTS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9];

  const state = {
    board: [],
    rowTargets: [],
    colTargets: [],
    piece: null,
    next: null,
    score: 0,
    lines: 0,
    erases: 5,
    mode: "play", // play | erase | over | pause | title
    level: 1,
    dropMs: 900,
    lastDrop: 0,
    anim: null,
    bag: [],
  };

  const els = {};
  let raf = 0;
  let cellSize = 36;
  let touchStart = null;

  function $(id) {
    return document.getElementById(id);
  }

  function randDigit() {
    return DIGIT_WEIGHTS[(Math.random() * DIGIT_WEIGHTS.length) | 0];
  }

  function refillBag() {
    const bag = PIECE_KEYS.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    state.bag.push(...bag);
  }

  function makePiece(type) {
    const rotations = SHAPES[type];
    const cells = rotations[0].map(([r, c]) => ({ r, c, v: randDigit() }));
    return {
      type,
      rot: 0,
      r: HIDDEN - 1,
      c: ((COLS / 2) | 0) - 1,
      cells,
      rotations,
    };
  }

  function nextPiece() {
    if (state.bag.length < 3) refillBag();
    return makePiece(state.bag.shift());
  }

  function emptyBoard() {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => null)
    );
  }

  function subsetSumTarget(values, preferMid = true) {
    const nums = values.filter((v) => v > 0);
    if (!nums.length) return 0;
    const total = nums.reduce((a, b) => a + b, 0);
    if (nums.length === 1) return nums[0];

    const reach = new Set([0]);
    for (const n of nums) {
      const add = [];
      for (const s of reach) add.push(s + n);
      for (const s of add) reach.add(s);
    }
    const options = [...reach].filter((s) => s > 0 && s < total);
    if (!options.length) return total;

    if (preferMid) {
      const mid = total * 0.45;
      options.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      const top = options.slice(0, Math.min(6, options.length));
      return top[(Math.random() * top.length) | 0];
    }
    return options[(Math.random() * options.length) | 0];
  }

  function generateIdleTargets() {
    state.rowTargets = Array.from({ length: ROWS }, () => 12 + ((Math.random() * 14) | 0));
    state.colTargets = Array.from({ length: COLS }, () => 16 + ((Math.random() * 18) | 0));
  }

  function retargetFilledLines() {
    for (let r = HIDDEN; r < ROWS; r++) {
      if (!rowFilled(r)) continue;
      const vals = state.board[r].map((cell) => (cell && !cell.erased ? cell.v : 0));
      const all = state.board[r].map((cell) => (cell ? cell.v : 0));
      const total = all.reduce((a, b) => a + b, 0);
      if (state.rowTargets[r] > total || state.rowTargets[r] < 1) {
        state.rowTargets[r] = subsetSumTarget(all);
      }
    }
    for (let c = 0; c < COLS; c++) {
      if (!colFilled(c)) continue;
      const all = [];
      for (let r = HIDDEN; r < ROWS; r++) {
        const cell = state.board[r][c];
        all.push(cell ? cell.v : 0);
      }
      const total = all.reduce((a, b) => a + b, 0);
      if (state.colTargets[c] > total || state.colTargets[c] < 1) {
        state.colTargets[c] = subsetSumTarget(all);
      }
    }
  }

  function rowFilled(r) {
    return state.board[r].every((cell) => cell);
  }

  function colFilled(c) {
    for (let r = HIDDEN; r < ROWS; r++) {
      if (!state.board[r][c]) return false;
    }
    return true;
  }

  function rowSum(r) {
    return state.board[r].reduce((s, cell) => s + (cell && !cell.erased ? cell.v : 0), 0);
  }

  function colSum(c) {
    let s = 0;
    for (let r = HIDDEN; r < ROWS; r++) {
      const cell = state.board[r][c];
      if (cell && !cell.erased) s += cell.v;
    }
    return s;
  }

  function pieceCells(piece, rot = piece.rot, r = piece.r, c = piece.c) {
    const shape = piece.rotations[rot % piece.rotations.length];
    return shape.map(([dr, dc], i) => ({
      r: r + dr,
      c: c + dc,
      v: piece.cells[i].v,
    }));
  }

  function fits(piece, rot, r, c) {
    return pieceCells(piece, rot, r, c).every(
      (p) => p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS && !state.board[p.r][p.c]
    );
  }

  function lockPiece() {
    const cells = pieceCells(state.piece);
    for (const p of cells) {
      if (p.r < HIDDEN) {
        gameOver();
        return;
      }
      state.board[p.r][p.c] = { v: p.v, erased: false };
    }
    state.erases = Math.min(12, state.erases + 1);
    state.piece = null;
    retargetFilledLines();
    const cleared = resolveClears();
    if (!cleared) spawn();
  }

  function applyGravity() {
    for (let c = 0; c < COLS; c++) {
      const stack = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (state.board[r][c]) stack.push(state.board[r][c]);
        state.board[r][c] = null;
      }
      let r = ROWS - 1;
      for (const cell of stack) {
        state.board[r][c] = cell;
        r--;
      }
    }
  }

  function resolveClears() {
    const rows = [];
    const cols = [];
    for (let r = HIDDEN; r < ROWS; r++) {
      if (rowFilled(r) && rowSum(r) === state.rowTargets[r]) rows.push(r);
    }
    for (let c = 0; c < COLS; c++) {
      if (colFilled(c) && colSum(c) === state.colTargets[c]) cols.push(c);
    }
    if (!rows.length && !cols.length) return false;

    state.anim = { rows, cols, t0: performance.now() };
    const cross = rows.length && cols.length;
    const base = rows.length * 120 + cols.length * 160;
    const bonus = cross ? 400 : 0;
    const chain = 1 + (rows.length + cols.length - 1) * 0.35;
    state.score += Math.round((base + bonus) * chain) * state.level;
    state.lines += rows.length + cols.length;
    state.erases = Math.min(12, state.erases + rows.length + cols.length);
    state.level = 1 + ((state.lines / 8) | 0);
    state.dropMs = Math.max(220, 900 - (state.level - 1) * 70);

    setTimeout(() => {
      for (const r of rows) {
        for (let c = 0; c < COLS; c++) state.board[r][c] = null;
        state.rowTargets[r] = 12 + ((Math.random() * 14) | 0);
      }
      for (const c of cols) {
        for (let r = 0; r < ROWS; r++) state.board[r][c] = null;
        state.colTargets[c] = 16 + ((Math.random() * 18) | 0);
      }
      applyGravity();
      state.anim = null;
      retargetFilledLines();
      if (!resolveClears()) spawn();
      draw();
    }, 320);
    draw();
    return true;
  }

  function spawn() {
    state.piece = state.next || nextPiece();
    state.next = nextPiece();
    state.piece.r = HIDDEN - 1;
    state.piece.c = ((COLS / 2) | 0) - 1;
    if (!fits(state.piece, 0, state.piece.r, state.piece.c)) {
      gameOver();
      return;
    }
    state.lastDrop = performance.now();
    draw();
  }

  function gameOver() {
    state.mode = "over";
    state.piece = null;
    els.overlay.classList.remove("hidden");
    els.overlayTitle.textContent = "Stack overflow";
    els.overlayBody.textContent = `Score ${state.score} · ${state.lines} clears`;
    els.btnResume.classList.add("hidden");
    els.btnStart.textContent = "Play again";
    draw();
  }

  function seedDemoBoard() {
    // Bottom row almost ready: values sum to 20; erase the 5 → target 15 clears.
    const bottom = ROWS - 1;
    const vals = [2, 3, 1, 4, 5, 1, 2, 2]; // total 20; without 5 → 15
    for (let c = 0; c < COLS; c++) {
      state.board[bottom][c] = { v: vals[c], erased: false };
    }
    state.rowTargets[bottom] = 15;
    // Partial stack above for atmosphere
    const pattern = [
      [null, 3, null, null, 2, null, null, 1],
      [4, null, null, 6, null, null, 2, null],
    ];
    for (let i = 0; i < pattern.length; i++) {
      const r = bottom - 1 - i;
      for (let c = 0; c < COLS; c++) {
        if (pattern[i][c] != null) state.board[r][c] = { v: pattern[i][c], erased: false };
      }
    }
    for (let c = 0; c < COLS; c++) {
      const colVals = [];
      for (let r = HIDDEN; r < ROWS; r++) {
        if (state.board[r][c]) colVals.push(state.board[r][c].v);
      }
      state.colTargets[c] = colVals.length
        ? subsetSumTarget(colVals.length >= 2 ? colVals : [...colVals, 3, 4])
        : 16 + ((Math.random() * 10) | 0);
    }
  }

  function startGame(opts = {}) {
    state.board = emptyBoard();
    state.score = 0;
    state.lines = 0;
    state.erases = 5;
    state.level = 1;
    state.dropMs = 900;
    state.bag = [];
    state.anim = null;
    state.mode = "play";
    syncModeButtons("play");
    generateIdleTargets();
    const demo =
      opts.demo ||
      new URLSearchParams(location.search).has("demo");
    if (demo) seedDemoBoard();
    state.next = nextPiece();
    els.overlay.classList.add("hidden");
    spawn();
    updateHud();
    draw();
  }

  function tryMove(dr, dc) {
    if (state.mode !== "play" || !state.piece) return false;
    const nr = state.piece.r + dr;
    const nc = state.piece.c + dc;
    if (fits(state.piece, state.piece.rot, nr, nc)) {
      state.piece.r = nr;
      state.piece.c = nc;
      draw();
      return true;
    }
    return false;
  }

  function tryRotate() {
    if (state.mode !== "play" || !state.piece) return;
    const next = (state.piece.rot + 1) % state.piece.rotations.length;
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (fits(state.piece, next, state.piece.r, state.piece.c + k)) {
        state.piece.rot = next;
        state.piece.c += k;
        draw();
        return;
      }
    }
  }

  function hardDrop() {
    if (state.mode !== "play" || !state.piece) return;
    while (tryMove(1, 0)) {}
    lockPiece();
  }

  function softDrop() {
    if (!tryMove(1, 0)) lockPiece();
  }

  function toggleEraseAt(r, c) {
    if (state.mode !== "erase") return;
    if (r < HIDDEN || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = state.board[r][c];
    if (!cell) return;
    if (!cell.erased) {
      if (state.erases <= 0) {
        flashEraseEmpty();
        return;
      }
      cell.erased = true;
      state.erases--;
    } else {
      cell.erased = false;
      state.erases = Math.min(12, state.erases + 1);
    }
    updateHud();
    retargetFilledLines();
    if (!resolveClears()) draw();
  }

  function flashEraseEmpty() {
    els.eraseCount.classList.add("shake");
    setTimeout(() => els.eraseCount.classList.remove("shake"), 350);
  }

  function setMode(mode) {
    if (state.mode === "over" || state.mode === "title" || state.mode === "pause") return;
    state.mode = mode;
    syncModeButtons(mode);
  }

  function syncModeButtons(mode) {
    els.btnPlayMode.classList.toggle("active", mode === "play");
    els.btnEraseMode.classList.toggle("active", mode === "erase");
    document.body.dataset.mode = mode;
  }

  function boardFromEvent(e) {
    const rect = els.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const originX = sumLabelW();
    const originY = sumLabelH();
    const c = Math.floor((x - originX) / cellSize);
    const vr = Math.floor((y - originY) / cellSize);
    const r = vr + HIDDEN;
    return { r, c };
  }

  function sumLabelW() {
    return Math.max(34, cellSize * 0.95);
  }
  function sumLabelH() {
    return Math.max(28, cellSize * 0.75);
  }

  function layout() {
    const wrap = els.stage.getBoundingClientRect();
    const availW = Math.min(wrap.width - 8, 420);
    const availH = Math.min(window.innerHeight * 0.58, 560);
    const byW = (availW - sumLabelW()) / COLS;
    const byH = (availH - sumLabelH()) / VISIBLE;
    cellSize = Math.max(22, Math.min(40, Math.floor(Math.min(byW, byH))));
    const w = sumLabelW() + COLS * cellSize + 2;
    const h = sumLabelH() + VISIBLE * cellSize + 2;
    els.canvas.width = w * devicePixelRatio;
    els.canvas.height = h * devicePixelRatio;
    els.canvas.style.width = `${w}px`;
    els.canvas.style.height = `${h}px`;
    const ctx = els.canvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function drawRounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    const ctx = els.canvas.getContext("2d");
    const ox = sumLabelW();
    const oy = sumLabelH();
    const W = els.canvas.width / devicePixelRatio;
    const H = els.canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    // atmosphere panel
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b2a2e");
    g.addColorStop(1, "#07181c");
    ctx.fillStyle = g;
    drawRounded(ctx, ox - 1, oy - 1, COLS * cellSize + 2, VISIBLE * cellSize + 2, 10);
    ctx.fill();

    // grid
    for (let vr = 0; vr < VISIBLE; vr++) {
      for (let c = 0; c < COLS; c++) {
        const x = ox + c * cellSize;
        const y = oy + vr * cellSize;
        ctx.strokeStyle = "rgba(120, 190, 180, 0.08)";
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }

    // locked cells
    for (let vr = 0; vr < VISIBLE; vr++) {
      const r = vr + HIDDEN;
      for (let c = 0; c < COLS; c++) {
        const cell = state.board[r][c];
        if (!cell) continue;
        drawCell(ctx, ox + c * cellSize, oy + vr * cellSize, cell.v, cell.erased, false);
      }
    }

    // active piece
    if (state.piece && state.mode !== "over") {
      // ghost
      let gr = state.piece.r;
      while (fits(state.piece, state.piece.rot, gr + 1, state.piece.c)) gr++;
      for (const p of pieceCells(state.piece, state.piece.rot, gr, state.piece.c)) {
        if (p.r < HIDDEN) continue;
        const x = ox + p.c * cellSize;
        const y = oy + (p.r - HIDDEN) * cellSize;
        ctx.strokeStyle = "rgba(255, 196, 90, 0.35)";
        ctx.lineWidth = 1.5;
        drawRounded(ctx, x + 4, y + 4, cellSize - 8, cellSize - 8, 6);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      for (const p of pieceCells(state.piece)) {
        if (p.r < HIDDEN) continue;
        drawCell(ctx, ox + p.c * cellSize, oy + (p.r - HIDDEN) * cellSize, p.v, false, true);
      }
    }

    // clear flash
    if (state.anim) {
      const pulse = 0.35 + 0.35 * Math.sin((performance.now() - state.anim.t0) / 40);
      ctx.fillStyle = `rgba(255, 210, 110, ${pulse})`;
      for (const r of state.anim.rows) {
        if (r < HIDDEN) continue;
        ctx.fillRect(ox, oy + (r - HIDDEN) * cellSize, COLS * cellSize, cellSize);
      }
      for (const c of state.anim.cols) {
        ctx.fillRect(ox + c * cellSize, oy, cellSize, VISIBLE * cellSize);
      }
    }

    // column headers
    for (let c = 0; c < COLS; c++) {
      const sum = colSum(c);
      const target = state.colTargets[c];
      const filled = colFilled(c);
      drawSumBadge(ctx, ox + c * cellSize + cellSize / 2, oy / 2, sum, target, filled, true);
    }

    // row headers
    for (let vr = 0; vr < VISIBLE; vr++) {
      const r = vr + HIDDEN;
      const sum = rowSum(r);
      const target = state.rowTargets[r];
      const filled = rowFilled(r);
      drawSumBadge(ctx, ox / 2, oy + vr * cellSize + cellSize / 2, sum, target, filled, false);
    }

    drawNext();
    updateHud();
  }

  function drawCell(ctx, x, y, v, erased, active) {
    const pad = 2;
    const hue = 160 + v * 8;
    if (erased) {
      ctx.fillStyle = "rgba(20, 40, 44, 0.55)";
      drawRounded(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 120, 100, 0.55)";
      ctx.setLineDash([3, 3]);
      drawRounded(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 170, 150, 0.45)";
      ctx.font = `600 ${Math.floor(cellSize * 0.42)}px "DM Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(v), x + cellSize / 2, y + cellSize / 2 + 1);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 110, 90, 0.85)";
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + cellSize - 8, y + cellSize - 8);
      ctx.stroke();
      return;
    }
    const grad = ctx.createLinearGradient(x, y, x, y + cellSize);
    if (active) {
      grad.addColorStop(0, `hsl(${hue} 70% 48%)`);
      grad.addColorStop(1, `hsl(${hue} 65% 34%)`);
    } else {
      grad.addColorStop(0, `hsl(${hue} 42% 38%)`);
      grad.addColorStop(1, `hsl(${hue} 48% 26%)`);
    }
    ctx.fillStyle = grad;
    drawRounded(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    drawRounded(ctx, x + pad + 2, y + pad + 2, cellSize - pad * 2 - 4, (cellSize - pad * 2) * 0.35, 5);
    ctx.fill();
    ctx.fillStyle = "#f3fff8";
    ctx.font = `700 ${Math.floor(cellSize * 0.48)}px "DM Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(v), x + cellSize / 2, y + cellSize / 2 + 1);
  }

  function drawSumBadge(ctx, x, y, sum, target, filled, vertical) {
    const match = filled && sum === target;
    const over = filled && sum > target;
    const w = vertical ? cellSize - 4 : sumLabelW() - 6;
    const h = vertical ? sumLabelH() - 8 : cellSize - 8;
    ctx.fillStyle = match
      ? "rgba(255, 196, 90, 0.95)"
      : over
        ? "rgba(255, 110, 90, 0.22)"
        : "rgba(120, 200, 190, 0.14)";
    drawRounded(ctx, x - w / 2, y - h / 2, w, h, 6);
    ctx.fill();
    ctx.fillStyle = match ? "#1a1205" : over ? "#ffb4a8" : "#c9ebe3";
    ctx.font = `700 ${Math.max(10, Math.floor(cellSize * 0.32))}px "DM Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(target), x, y + (vertical ? 3 : 4));
    ctx.fillStyle = match ? "rgba(26,18,5,0.7)" : "rgba(200,240,230,0.55)";
    ctx.font = `500 ${Math.max(8, Math.floor(cellSize * 0.22))}px "DM Sans", sans-serif`;
    ctx.fillText(String(sum), x, y - h / 2 + Math.max(8, h * 0.28));
  }

  function drawNext() {
    const box = els.nextCanvas;
    const ctx = box.getContext("2d");
    const s = 22;
    box.width = 120 * devicePixelRatio;
    box.height = 72 * devicePixelRatio;
    box.style.width = "120px";
    box.style.height = "72px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, 120, 72);
    if (!state.next) return;
    const cells = pieceCells({ ...state.next, r: 0, c: 0, rot: 0 }, 0, 0, 0);
    let minR = Infinity,
      maxR = -Infinity,
      minC = Infinity,
      maxC = -Infinity;
    for (const p of cells) {
      minR = Math.min(minR, p.r);
      maxR = Math.max(maxR, p.r);
      minC = Math.min(minC, p.c);
      maxC = Math.max(maxC, p.c);
    }
    const bw = (maxC - minC + 1) * s;
    const bh = (maxR - minR + 1) * s;
    const ox = (120 - bw) / 2 - minC * s;
    const oy = (72 - bh) / 2 - minR * s;
    for (const p of cells) {
      const x = ox + p.c * s;
      const y = oy + p.r * s;
      const hue = 160 + p.v * 8;
      ctx.fillStyle = `hsl(${hue} 55% 40%)`;
      drawRounded(ctx, x + 1, y + 1, s - 2, s - 2, 5);
      ctx.fill();
      ctx.fillStyle = "#f3fff8";
      ctx.font = `700 12px "DM Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(p.v), x + s / 2, y + s / 2 + 1);
    }
  }

  function updateHud() {
    els.score.textContent = String(state.score);
    els.lines.textContent = String(state.lines);
    els.level.textContent = String(state.level);
    els.eraseCount.textContent = String(state.erases);
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (state.mode === "play" && state.piece && !state.anim) {
      if (t - state.lastDrop >= state.dropMs) {
        state.lastDrop = t;
        softDrop();
      }
    }
    if (state.anim) draw();
  }

  function onKey(e) {
    if (e.code === "KeyP") {
      if (state.mode === "play") {
        state.mode = "pause";
        els.overlay.classList.remove("hidden");
        els.overlayTitle.textContent = "Paused";
        els.overlayBody.textContent = "Sums wait for no one — unless you pause.";
        els.btnResume.classList.remove("hidden");
        els.btnStart.textContent = "Restart";
      } else if (state.mode === "pause") {
        state.mode = "play";
        els.overlay.classList.add("hidden");
        state.lastDrop = performance.now();
      }
      return;
    }
    if (state.mode === "erase") {
      if (e.code === "KeyE" || e.code === "Tab") {
        e.preventDefault();
        setMode("play");
      }
      return;
    }
    if (state.mode !== "play") return;
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        e.preventDefault();
        tryMove(0, -1);
        break;
      case "ArrowRight":
      case "KeyD":
        e.preventDefault();
        tryMove(0, 1);
        break;
      case "ArrowDown":
      case "KeyS":
        e.preventDefault();
        softDrop();
        state.lastDrop = performance.now();
        break;
      case "ArrowUp":
      case "KeyW":
      case "KeyX":
        e.preventDefault();
        tryRotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
      case "KeyE":
      case "Tab":
        e.preventDefault();
        setMode("erase");
        break;
    }
  }

  function bind() {
    els.canvas = $("board");
    els.nextCanvas = $("next");
    els.stage = $("stage");
    els.score = $("score");
    els.lines = $("lines");
    els.level = $("level");
    els.eraseCount = $("erase-count");
    els.overlay = $("overlay");
    els.overlayTitle = $("overlay-title");
    els.overlayBody = $("overlay-body");
    els.btnStart = $("btn-start");
    els.btnResume = $("btn-resume");
    els.btnPlayMode = $("btn-play");
    els.btnEraseMode = $("btn-erase");
    els.btnLeft = $("btn-left");
    els.btnRight = $("btn-right");
    els.btnRotate = $("btn-rotate");
    els.btnDown = $("btn-down");
    els.btnDrop = $("btn-drop");

    els.btnStart.addEventListener("click", startGame);
    els.btnResume.addEventListener("click", () => {
      state.mode = "play";
      els.overlay.classList.add("hidden");
      state.lastDrop = performance.now();
    });
    els.btnPlayMode.addEventListener("click", () => setMode("play"));
    els.btnEraseMode.addEventListener("click", () => {
      if (state.mode === "title" || state.mode === "over") return;
      setMode("erase");
    });

    const hold = (fn) => {
      let id = 0;
      const start = (e) => {
        e.preventDefault();
        fn();
        id = setInterval(fn, 90);
      };
      const end = () => clearInterval(id);
      return { start, end };
    };
    const left = hold(() => tryMove(0, -1));
    const right = hold(() => tryMove(0, 1));
    const down = hold(() => {
      softDrop();
      state.lastDrop = performance.now();
    });
    els.btnLeft.addEventListener("pointerdown", left.start);
    els.btnLeft.addEventListener("pointerup", left.end);
    els.btnLeft.addEventListener("pointerleave", left.end);
    els.btnRight.addEventListener("pointerdown", right.start);
    els.btnRight.addEventListener("pointerup", right.end);
    els.btnRight.addEventListener("pointerleave", right.end);
    els.btnDown.addEventListener("pointerdown", down.start);
    els.btnDown.addEventListener("pointerup", down.end);
    els.btnDown.addEventListener("pointerleave", down.end);
    els.btnRotate.addEventListener("click", tryRotate);
    els.btnDrop.addEventListener("click", hardDrop);

    els.canvas.addEventListener("click", (e) => {
      if (state.mode !== "erase") return;
      const { r, c } = boardFromEvent(e);
      toggleEraseAt(r, c);
    });

    els.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (state.mode === "erase") return;
        if (state.mode !== "play") return;
        const t = e.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY, t: Date.now() };
      },
      { passive: true }
    );
    els.canvas.addEventListener(
      "touchend",
      (e) => {
        if (!touchStart || state.mode !== "play") return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        const dt = Date.now() - touchStart.t;
        touchStart = null;
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 250) {
          tryRotate();
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 24) tryMove(0, 1);
          else if (dx < -24) tryMove(0, -1);
        } else {
          if (dy > 40) hardDrop();
          else if (dy > 18) softDrop();
        }
      },
      { passive: true }
    );

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", () => {
      layout();
      draw();
    });
  }

  // Expose for tests
  window.Sumdrop = {
    COLS,
    ROWS,
    HIDDEN,
    subsetSumTarget,
    getState: () => state,
    startGame,
    seedDemoBoard,
    rowSum,
    colSum,
    rowFilled,
    colFilled,
    setMode,
    toggleEraseAt,
  };

  function init() {
    bind();
    state.mode = "title";
    state.board = emptyBoard();
    generateIdleTargets();
    layout();
    draw();
    els.overlay.classList.remove("hidden");
    els.overlayTitle.textContent = "SUMDROP";
    els.overlayBody.textContent =
      "Stack number blocks. Erase digits so each full row and column hits its target sum — then it clears.";
    els.btnResume.classList.add("hidden");
    els.btnStart.textContent = "Drop in";
    syncModeButtons("play");
    state.mode = "title";
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
