// 🧪 A* 算法性能对比（100～100亿，每种 size 一表）

import Grid from '../Grid.js';
import Astar from '../Astar.js';
import { getPerformanceNow } from '../utils.js';

const BASE_OBSTACLE_DENSITY = 0.2;
const TEST_ROUNDS = 3;

// 100～10万。默认测试到10万
// 注意：100000×100000 = 100亿节点，需要大量内存
const DEFAULT_SIZES = [100, 500, 1000, 5000, 10000, 50000, 100000];
const TEST_SIZES = typeof process !== 'undefined' && process.env.TEST_SIZES
    ? process.env.TEST_SIZES.split(',').map(Number).filter(Boolean)
    : DEFAULT_SIZES;

function seededRandom(seed) {
    let v = seed;
    return () => { v = (v * 9301 + 49297) % 233280; return v / 233280; };
}

// 根据地图大小动态调整障碍物密度和数量
function getObstacleDensity(size) {
    const totalCells = size * size;
    if (totalCells > 1_000_000_000) {
        // 超过 10 亿节点：极低密度，最多 100 万障碍物
        return Math.min(BASE_OBSTACLE_DENSITY, 1_000_000 / totalCells);
    } else if (totalCells > 100_000_000) {
        // 超过 1 亿节点：低密度，最多 500 万障碍物
        return Math.min(BASE_OBSTACLE_DENSITY, 5_000_000 / totalCells);
    } else if (totalCells > 10_000_000) {
        // 超过 1000 万节点：中等密度，最多 200 万障碍物
        return Math.min(BASE_OBSTACLE_DENSITY, 2_000_000 / totalCells);
    }
    return BASE_OBSTACLE_DENSITY;
}

function generateFixedObstacles(size, density) {
    const random = seededRandom(size * 1000 + Math.floor(density * 100));
    const actualDensity = typeof density === 'number' ? density : getObstacleDensity(size);
    const n = Math.floor(size * size * actualDensity);
    
    // 限制最大障碍物数量以避免内存问题
    const maxObstacles = 10_000_000; // 最多 1000 万个障碍物
    const actualCount = Math.min(n, maxObstacles);
    
    const out = [];
    for (let i = 0; i < actualCount; i++) {
        out.push([Math.floor(random() * size), Math.floor(random() * size)]);
    }
    return out;
}

function formatTime(ms) {
    if (ms < 0.1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes) {
    if (!bytes || bytes < 0) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function runOne(grid, implName, start, end) {
    let astar;
    if (implName === 'Ultra A*') astar = new Astar(grid, { prefer: 'ultra' });
    else if (implName === 'Master A*') astar = new Astar(grid, { prefer: 'master' });
    else if (implName === 'WebAssembly A*') astar = new Astar(grid, { prefer: 'wasm' });
    else if (implName === 'MemoryEfficient A*') astar = new Astar(grid, { prefer: 'ultra' });
    else astar = new Astar(grid);

    if (implName === 'WebAssembly A*' && astar.currentImplementation?.initPromise) {
        await astar.currentImplementation.initPromise;
    }

    for (let i = 0; i < 2; i++) { try { await astar.search(start, end); } catch (_) {} }

    const times = [];
    const mems = [];
    for (let r = 0; r < TEST_ROUNDS; r++) {
        try {
            const t0 = getPerformanceNow();
            const path = await astar.search(start, end);
            const t1 = getPerformanceNow();
            if (path?.length) {
                times.push(t1 - t0);
                try {
                    if (astar.currentImplementation?.getMemoryUsage) {
                        const m = astar.currentImplementation.getMemoryUsage();
                        mems.push(m?.total ?? 0);
                    }
                } catch (_) {}
            }
        } catch (_) {}
    }

    if (!times.length) return null;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const avgMem = mems.length ? mems.reduce((a, b) => a + b, 0) / mems.length : 0;
    const actual = astar.currentName ?? '-';
    return { implName, actual, avgTime, avgMemory: avgMem, success: times.length };
}

function getImplementations(size) {
    const list = ['智能选择', 'Ultra A*', 'Master A*', 'WebAssembly A*'];
    if (size >= 10000) list.push('MemoryEfficient A*');
    return list;
}

function printTable(size, rows) {
    const sorted = [...rows].sort((a, b) => a.avgTime - b.avgTime);
    const table = sorted.map((row, i) => ({
        排名: i + 1,
        算法: row.implName,
        实际选择: row.implName === '智能选择' ? (row.actual || '-') : '-',
        用时: formatTime(row.avgTime),
        内存: formatMemory(row.avgMemory),
    }));
    console.log(`\n▼ ${size}×${size}`);
    console.table(table);
}

async function runSize(size, obstacles, start, end) {
    const impls = getImplementations(size);
    const rows = [];

    for (const implName of impls) {
        let g;
        try {
            g = new Grid({ col: size, row: size });
            g.setObstacles(obstacles);
            g.setWalkAt(start[0], start[1], true);
            g.setWalkAt(end[0], end[1], true);
            if (g.useQuadTree) {
                g.buildQuadTree();
                await new Promise(r => setTimeout(r, 30));
            }
        } catch (e) {
            continue;
        }

        try {
            process.stdout.write(`   ${size}×${size} ${implName}... `);
            const r = await runOne(g, implName, start, end);
            g = null;
            if (global.gc) global.gc();
            if (r) {
                rows.push({ size, ...r });
                process.stdout.write(`✅ ${formatTime(r.avgTime)}\n`);
            } else {
                process.stdout.write('❌\n');
            }
        } catch (e) {
            g = null;
            process.stdout.write(`❌ ${e?.message || e}\n`);
        }
    }

    if (rows.length) printTable(size, rows);
    return rows;
}

async function main() {
    console.log('🧪 A* 性能对比（100～100万，每种 size 一表）');
    console.log(`   地图尺寸: ${TEST_SIZES.join(', ')}\n`);

    const obstaclesBySize = new Map();
    for (const size of TEST_SIZES) {
        try {
            const density = getObstacleDensity(size);
            const obstacles = generateFixedObstacles(size, density);
            obstaclesBySize.set(size, obstacles);
            if (size >= 50000) {
                console.log(`📊 ${size}×${size}: 生成 ${obstacles.length.toLocaleString()} 个障碍物 (密度: ${(density * 100).toFixed(4)}%)`);
            }
        } catch (e) {
            console.warn(`⚠️ ${size}×${size} 生成障碍物失败: ${e.message}`);
        }
    }

    for (const size of TEST_SIZES) {
        const obstacles = obstaclesBySize.get(size);
        if (!obstacles) continue;

        try {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📊 ${size}×${size}`);
            console.log('='.repeat(60));

            let grid;
            try {
                grid = new Grid({ col: size, row: size });
                grid.setObstacles(obstacles);
            } catch (e) {
                console.warn(`⚠️ ${size}×${size} 创建网格失败，跳过`);
                continue;
            }

            const start = [0, 0];
            const end = [size - 1, size - 1];
            grid.setWalkAt(start[0], start[1], true);
            grid.setWalkAt(end[0], end[1], true);
            grid = null;
            if (global.gc) global.gc();

            await runSize(size, obstacles, start, end);
        } catch (e) {
            console.warn(`⚠️ ${size}×${size} 测试异常: ${e?.message || e}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成');
}

main().catch(e => {
    console.error('❌ 测试失败:', e);
    process.exit(1);
});
