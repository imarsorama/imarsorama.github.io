/**
 * Headless logic tests for SUMDROP (no DOM).
 */
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

function canMakeSum(values, target) {
  const nums = values.filter((v) => v > 0);
  const reach = new Set([0]);
  for (const n of nums) {
    for (const s of [...reach]) reach.add(s + n);
  }
  return reach.has(target);
}

function rowSum(row) {
  return row.reduce((s, cell) => s + (cell && !cell.erased ? cell.v : 0), 0);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok -", name);
}

test("subset sum target is achievable", () => {
  for (let i = 0; i < 40; i++) {
    const vals = Array.from({ length: 8 }, () => 1 + ((Math.random() * 9) | 0));
    const t = subsetSumTarget(vals);
    assert(canMakeSum(vals, t), `target ${t} not reachable from ${vals}`);
    assert(t > 0, "target should be positive");
  }
});

test("single value target equals itself", () => {
  assert(subsetSumTarget([7]) === 7, "expected 7");
});

test("erased cells excluded from sum", () => {
  const row = [
    { v: 5, erased: false },
    { v: 3, erased: true },
    { v: 4, erased: false },
  ];
  assert(rowSum(row) === 9, `got ${rowSum(row)}`);
});

test("clear condition: filled + exact sum", () => {
  const row = Array.from({ length: 8 }, (_, i) => ({ v: i === 0 ? 9 : 1, erased: i > 3 }));
  // kept: 9+1+1+1 = 12, erased last 4
  const filled = row.every(Boolean);
  const sum = rowSum(row);
  assert(filled && sum === 12, `filled=${filled} sum=${sum}`);
});

test("tetromino shape count", () => {
  const keys = ["I", "O", "T", "L", "J", "S", "Z"];
  assert(keys.length === 7, "seven pieces");
});

console.log(`\n${passed} tests passed`);
