# fast-astar

A high-performance A* pathfinding algorithm library with WebAssembly support. Small, fast, and memory-efficient.

## Features

- 🚀 **Multiple Implementations**: Ultra A*, Master A*, and WebAssembly A* with automatic selection
- ⚡ **High Performance**: Optimized for speed with WebAssembly support
- 💾 **Memory Efficient**: Sparse data structures for ultra-large maps (up to 100,000×100,000)
- 🎬 **Animation Support**: Full search process visualization with step-by-step callbacks
- 🌐 **Universal**: Works in Node.js, browsers, and Web Workers
- 📦 **Zero Dependencies**: Pure JavaScript/WebAssembly implementation

## Installation

```bash
npm install fast-astar
```

## Quick Start

### Basic Usage

```javascript
import { Grid, Astar } from 'fast-astar';

// Create a grid
const grid = new Grid({
    col: 20,  // width
    row: 15,  // height
    render: function() {
        // Optional: called when grid points change (for animation)
    }
});

// Add obstacles
grid.setWalkAt(5, 5, false);  // Set obstacle at (5, 5)
grid.setWalkAt(6, 5, false);
grid.setWalkAt(7, 5, false);

// Create A* instance
const astar = new Astar(grid);

// Find path
const path = await astar.search(
    [0, 0],    // start point [x, y]
    [19, 14],  // end point [x, y]
    {
        rightAngle: false,      // Allow diagonal movement (default: false)
        optimalResult: true     // Ensure optimal path (default: true)
    }
);

console.log(path);  // [[0,0], [1,1], [2,2], ...]
```

### Advanced Usage

```javascript
import { Grid, Astar } from 'fast-astar';

// Create grid with memory-efficient mode for large maps
const grid = new Grid({
    col: 10000,
    row: 10000,
    useMemoryEfficientMode: true  // Enable for maps > 1000×1000
});

// Set obstacles in batch
const obstacles = [[5, 2], [5, 3], [5, 4], [10, 10]];
grid.setObstacles(obstacles);

// Create A* with specific algorithm preference
const astar = new Astar(grid, {
    prefer: 'wasm',  // 'ultra' | 'master' | 'wasm' | 'auto' (default)
    strategy: 'auto' // 'auto' | 'performance' | 'memory' | 'compatibility'
});

// Search with options
const path = await astar.search(
    [0, 0],
    [9999, 9999],
    {
        rightAngle: false,
        optimalResult: true
    }
);

// Get current implementation info
const info = astar.getCurrentImplementation();
console.log(info.name);  // e.g., "WebAssembly A*"
```

## API Reference

### Grid

#### Constructor

```javascript
new Grid(options)
```

**Options:**
- `col` (number): Grid width (columns)
- `row` (number): Grid height (rows)
- `render` (function, optional): Callback function triggered when grid points change
- `useMemoryEfficientMode` (boolean, optional): Enable memory-efficient mode for large maps (>1000×1000)

#### Methods

- `setWalkAt(x, y, walkable)`: Set whether a cell is walkable
- `isWalkableAt(x, y)`: Check if a cell is walkable
- `setObstacles(obstacles)`: Set multiple obstacles at once (array of [x, y] pairs)
- `clearObstacles()`: Remove all obstacles
- `get([x, y])`: Get node at position
- `set([x, y], key, value)`: Set node property (for animation)

### Astar

#### Constructor

```javascript
new Astar(grid, options)
```

**Options:**
- `prefer` (string): Preferred algorithm - `'ultra'` | `'master'` | `'wasm'` | `'auto'` (default)
- `strategy` (string): Selection strategy - `'auto'` | `'performance'` | `'memory'` | `'compatibility'`
- `avoid` (string): Algorithm to avoid
- `debug` (boolean): Enable debug logging

#### Methods

- `search(start, end, options)`: Find path from start to end
  - Returns: `Promise<Array<[x, y]> | null>`
  - Options:
    - `rightAngle` (boolean): Only allow 4-directional movement (default: false)
    - `optimalResult` (boolean): Ensure optimal path (default: true)
- `getCurrentImplementation()`: Get current algorithm implementation info
- `getPerformanceStats()`: Get performance statistics
- `getMemoryUsage()`: Get memory usage information

## Algorithm Selection

The library automatically selects the optimal algorithm based on map size:

| Map Size | Algorithm | Performance |
|----------|-----------|-------------|
| ≤50×50 | Master A* | Best for small maps |
| 50×50 - 1000×1000 | WebAssembly A* | **17-25x faster** than JS |
| 1000×1000 - 10000×10000 | WebAssembly A* | **25x faster** than JS |
| ≥10000×10000 | WebAssembly A* (Sparse) | **18x faster** than JS |

### Manual Selection

```javascript
// Force specific algorithm
const astar = new Astar(grid, { prefer: 'wasm' });

// Performance priority
const astar = new Astar(grid, { strategy: 'performance' });

// Memory priority
const astar = new Astar(grid, { strategy: 'memory' });
```

## Animation Support

For visualization, provide a `render` callback in the Grid constructor:

```javascript
const grid = new Grid({
    col: 20,
    row: 15,
    render: function() {
        // This is called during pathfinding
        // Use grid.set([x, y], 'type', 'open'|'close'|'highlight'|'update')
        // to track the search process
    }
});

const astar = new Astar(grid);
const path = await astar.search([0, 0], [19, 14]);

// During search, the render callback will be triggered with:
// - 'open': Node added to open set
// - 'close': Node added to closed set
// - 'highlight': Current node being examined
// - 'update': Node cost updated
```

## Performance

Benchmark results (average of 3 runs):

| Map Size | WebAssembly A* | Ultra A* | Master A* |
|----------|----------------|----------|-----------|
| 100×100 | **0.12ms** | 1.9ms | 0.58ms |
| 500×500 | **2.3ms** | 37.9ms | 17.7ms |
| 1000×1000 | **9.6ms** | 167.7ms | 53.1ms |
| 5000×5000 | **1.0ms** | 25.7ms | 11.5ms |
| 10000×10000 | **2.3ms** | 58.6ms | 26.3ms |
| 50000×50000 | **20.6ms** | 369.4ms | - |
| 100000×100000 | **46.9ms** | 836.0ms | - |

## Memory Optimization

For large maps (>1000×1000), enable memory-efficient mode:

```javascript
const grid = new Grid({
    col: 10000,
    row: 10000,
    useMemoryEfficientMode: true  // Uses bitmap compression
});

// Memory usage comparison:
// - Standard mode: ~1.4GB for 10000×10000
// - Memory-efficient mode: ~12MB for 10000×10000
```

For ultra-large maps (>10 billion nodes), WebAssembly automatically uses sparse HashMap implementation:

```javascript
// 100000×100000 map automatically uses sparse implementation
const grid = new Grid({ col: 100000, row: 100000 });
const astar = new Astar(grid, { prefer: 'wasm' });
// Automatically uses WebAssembly A* (Sparse) - only stores visited nodes
```

## Building from Source

### Prerequisites

- Rust (for WebAssembly compilation)
- wasm-pack
- Node.js 16+

### Build Commands

```bash
# Development build (faster compilation, includes debug info)
npm run build:dev

# Release build (optimized, smaller size)
npm run build:rel
```

### Testing

```bash
# Run performance tests
npm test

# Full test suite (requires more memory)
npm run test:full

# WebAssembly-specific tests
npm run test:wasm
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11.3+)
- Node.js: ✅ Full support (v16+)

## License

MIT

## Related

- [A* Search Algorithm (Wikipedia)](https://en.wikipedia.org/wiki/A*_search_algorithm)
- [A* Pathfinding for Beginners](https://www.gamedev.net/articles/programming/artificial-intelligence/a-pathfinding-for-beginners-r2003/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### v0.1.0
- Initial release with WebAssembly support
- Multiple algorithm implementations (Ultra, Master, WASM)
- Automatic algorithm selection
- Memory-efficient mode for large maps
- Sparse implementation for ultra-large maps (100K×100K+)
- Animation support with step-by-step callbacks
