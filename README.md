## fast-astar (astar-wasm)

An optimized A* pathfinding library for **Node.js** and the **browser**, with optional **WebAssembly (Rust)** acceleration and a smart “auto” selector.

This repo is ESM (`"type": "module"`).

## Features

- **Smart auto-selection** (`strategy: "auto"`) to pick the best implementation for your grid size/device
- Multiple implementations:
  - **Ultra A\*** (fast JS, heap-based)
  - **Master A\*** (JS + TypedArray, good for medium/large grids)
  - **WebAssembly A\*** (Rust/WASM, optional)
- **Large map support**:
  - memory-efficient obstacle storage (bitmap)
  - optional QuadTree acceleration for huge maps
- Optional **render callback** (`Grid({ render })`) for visualization/debug (open/close/highlight/update)

## Install / Use

### Node.js (ESM)

```js
import AstarLib, { Grid, Astar } from "./index.js";

const grid = new Grid({ col: 20, row: 12 });
grid.setWalkAt(5, 5, false); // obstacle

const astar = new Astar(grid, { strategy: "auto" }); // or prefer: "master"/"ultra"/"wasm"
const path = await astar.search([0, 0], [19, 11], { rightAngle: false, optimalResult: true });

console.log(path); // [[x,y], ...] or null
console.log(astar.getCurrentImplementation()); // { name, gridSize, environment }
```

### Browser

Use `demo.html` (already wired for ESM) or import directly:

```html
<script type="module">
  import AstarLib, { Grid, Astar } from "./index.js";
  const grid = new Grid({ col: 20, row: 12 });
  const astar = new Astar(grid, { strategy: "auto" });
  const path = await astar.search([0,0], [19,11]);
  console.log(path);
</script>
```

> Tip: open with a local server (ES modules do not work reliably via `file://`).

## API

### `new Grid(options)`

Common options:

- `col`, `row`: grid width/height
- `render` (optional): callback for visualization/debug.
  - Called as `render.call(node, { key, val })`
  - `node` includes `x`, `y`, `type`, and (when available) `g/h/f`

Useful methods:

- `grid.setWalkAt(x, y, walkable)`
- `grid.isWalkableAt(x, y)`
- `grid.set([x,y], "value", 1)` / `grid.get([x,y])` (compat helpers)
- `grid.setObstacles([[x,y], ...])`
- `grid.buildQuadTree()` (for huge grids, when enabled)

### `new Astar(grid, options)`

Key options:

- `strategy`: `"auto" | "performance" | "memory" | "compatibility"`
- `prefer`: `"ultra" | "master" | "wasm"` (force an implementation)
- `debug`: boolean (more logs)

Methods:

- `await astar.search(start, end, searchOptions?)`
- `astar.getCurrentImplementation()` → `{ name, gridSize, environment }`
- `astar.getBackPath([x,y])` (visualization helper)

Search options:

- `rightAngle`: `true` to disable diagonals (4-dir only). `false` to allow diagonals (8-dir)
- `optimalResult`: `true` for optimal path. `false` favors speed and **may return a non-optimal path** depending on the scenario.

## Algorithms (how to select)

- **Auto (Smart)**: `new Astar(grid, { strategy: "auto" })`
- **Force Ultra**: `new Astar(grid, { prefer: "ultra" })`
- **Force Master**: `new Astar(grid, { prefer: "master" })`
- **Force WASM**: `new Astar(grid, { prefer: "wasm" })`

## WebAssembly build

This repo includes `astar.wasm` for convenience.

Rebuild WASM:

```bash
npm run build:dev
npm run build:rel
```

Outputs:

- `wasm.js` (loader/glue)
- `astar.wasm` (standardized filename)
- `wasm.d.ts` (TS types, if generated)

## Benchmarks / Tests

Run benchmarks:

```bash
npm test
```

Larger sizes (may need more memory):

```bash
TEST_SIZES=100,500,1000,5000,10000,50000 node --max-old-space-size=8192 tests/test.js
```

## Demo

- Open `demo.html` in a local server.
- It prints:
  - average search time
  - selected implementation name (when using Smart/auto)
  - the returned path coordinates (truncated when too long)

## Notes

- The **render callback is optional** and intended for visualization/debug only.
  Avoid using it in production/performance benchmarks.

