// 🚀 A* 算法最终整合版本 - 智能自适应入口
// 自动选择最优算法实现，支持所有环境

import Grid from './Grid.js';
import Astar from './Astar.js';
import { isNode, isBrowser, getEnvironmentInfo, checkCompatibility, getPerformanceNow } from './utils.js';

// 便捷创建函数
function createAstar(gridOptions = {}, astarOptions = {}) {
    const grid = new Grid(gridOptions);
    return new Astar(grid, astarOptions);
}

// 快速路径查找
function quickPath(gridSize, obstacles = [], start = [0, 0], end = null) {
    // 输入验证
    if (typeof gridSize !== 'number' && !Array.isArray(gridSize)) {
        throw new Error('gridSize 必须是数字或数组 [width, height]');
    }
    
    if (gridSize <= 0 || (Array.isArray(gridSize) && (gridSize[0] <= 0 || gridSize[1] <= 0))) {
        throw new Error('网格大小必须大于0');
    }
    
    if (!Array.isArray(start) || start.length < 2) {
        throw new Error('起点必须是包含至少2个元素的数组 [x, y]');
    }
    
    const size = Array.isArray(gridSize) ? gridSize : [gridSize, gridSize];
    const grid = new Grid({ col: size[0], row: size[1] });
    
    // 设置障碍物
    if (obstacles.length > 0) {
        if (!Array.isArray(obstacles)) {
            throw new Error('障碍物必须是数组');
        }
        grid.setObstacles(obstacles);
    }
    
    // 默认终点为右下角
    const endPoint = end || [size[0] - 1, size[1] - 1];
    
    if (!Array.isArray(endPoint) || endPoint.length < 2) {
        throw new Error('终点必须是包含至少2个元素的数组 [x, y]');
    }
    
    const astar = new Astar(grid);
    return astar.search(start, endPoint);
}

// 批量路径查找
async function findMultiplePaths(gridOptions, pathRequests) {
    // 输入验证
    if (!gridOptions || (typeof gridOptions !== 'object' && typeof gridOptions !== 'number')) {
        throw new Error('gridOptions 必须是对象或数字');
    }
    
    if (!Array.isArray(pathRequests)) {
        throw new Error('pathRequests 必须是数组');
    }
    
    if (pathRequests.length === 0) {
        return [];
    }
    
    const grid = new Grid(gridOptions);
    const astar = new Astar(grid);
    
    const results = [];
    for (const request of pathRequests) {
        try {
            // 验证请求格式
            if (!request || !Array.isArray(request.start) || !Array.isArray(request.end)) {
                throw new Error('每个请求必须包含 start 和 end 数组');
            }
            
            const path = await astar.search(request.start, request.end, request.options || {});
            results.push({
                success: true,
                path,
                request
            });
        } catch (error) {
            results.push({
                success: false,
                error: error.message,
                request
            });
        }
    }
    
    return results;
}

// 性能基准测试
function benchmark(gridSize = 100, iterations = 100) {
    // 输入验证
    if (typeof gridSize !== 'number' || gridSize <= 0) {
        throw new Error('gridSize 必须是大于0的数字');
    }
    
    if (typeof iterations !== 'number' || iterations <= 0) {
        throw new Error('iterations 必须是大于0的数字');
    }
    
    if (iterations > 10000) {
        console.warn('⚠️  迭代次数过大，可能会影响性能');
    }
    
    const grid = new Grid({ col: gridSize, row: gridSize });
    const astar = new Astar(grid);
    
    // 预热
    for (let i = 0; i < 10; i++) {
        astar.search([0, 0], [gridSize - 1, gridSize - 1]);
    }
    
    // 测试
    const startTime = getPerformanceNow();
    
    for (let i = 0; i < iterations; i++) {
        astar.search([0, 0], [gridSize - 1, gridSize - 1]);
    }
    
    const endTime = getPerformanceNow();
    const totalTime = endTime - startTime;
    
    return {
        totalTime,
        avgTime: totalTime / iterations,
        throughput: iterations / (totalTime / 1000),
        gridSize,
        iterations
    };
}

    // 预设配置
    const presets = {
        // 游戏开发预设
        game: {
            strategy: 'performance',
            appType: 'game',
            performance: 'high',
            memory: 'moderate',
            prefer: 'wasm'
        },
        
        // Web应用预设
        web: {
            strategy: 'auto',
            appType: 'web',
            performance: 'medium',
            memory: 'moderate'
        },
        
        // 移动应用预设
        mobile: {
            strategy: 'memory',
            appType: 'mobile',
            performance: 'medium',
            memory: 'strict',
            avoid: 'wasm'
        },
        
        // 服务端预设
        server: {
            strategy: 'performance',
            appType: 'server',
            performance: 'extreme',
            memory: 'relaxed',
            prefer: 'wasm'
        },
        
        // 嵌入式预设
        embedded: {
            strategy: 'memory',
            appType: 'embedded',
            performance: 'low',
            memory: 'strict',
            avoid: 'wasm'
        }
    };

// 预设工厂函数
function createPresetAstar(grid, presetName, customOptions = {}) {
    const preset = presets[presetName];
    if (!preset) {
        throw new Error(`未知预设: ${presetName}. 可用预设: ${Object.keys(presets).join(', ')}`);
    }
    
    return new Astar(grid, { ...preset, ...customOptions });
}

// 智能创建函数 - 根据网格大小自动选择最佳配置
function createSmartAstar(gridOptions, customOptions = {}) {
    const grid = new Grid(gridOptions);
    const gridSize = grid.col * grid.row;
    
    let autoOptions = {};
    
    // 根据网格大小自动选择策略
    if (gridSize > 250000) {
        autoOptions = { strategy: 'performance', prefer: 'wasm' };
    } else if (gridSize > 50000) {
        autoOptions = { strategy: 'performance', prefer: 'master' };
    } else if (gridSize > 10000) {
        autoOptions = { strategy: 'auto' };
    } else {
        autoOptions = { strategy: 'compatibility' };
    }
    
    return new Astar(grid, { ...autoOptions, ...customOptions });
}

// 主要导出API
const AstarLib = {
    // 核心类
    Grid: Grid,
    Astar: Astar,
    
    // 工厂函数
    create: createAstar,
    createAstar,
    createSmartAstar,
    createPresetAstar,
    
    // 便捷函数
    quickPath,
    findMultiplePaths,
    
    // 工具函数
    benchmark,
    getEnvironmentInfo,
    checkCompatibility,
    
    // 预设配置
    presets,
    
    // 快速创建函数
    createGameAstar: (grid, options = {}) => createPresetAstar(grid, 'game', options),
    createWebAstar: (grid, options = {}) => createPresetAstar(grid, 'web', options),
    createMobileAstar: (grid, options = {}) => createPresetAstar(grid, 'mobile', options),
    createServerAstar: (grid, options = {}) => createPresetAstar(grid, 'server', options),
    createEmbeddedAstar: (grid, options = {}) => createPresetAstar(grid, 'embedded', options),
    
    // 版本信息
    version: '2.0.0',
    name: 'Smart A* Algorithm Library',
    
    // 环境标识
    isNode,
    isBrowser
};

// 自动兼容性检查
const compatibility = checkCompatibility();
if (!compatibility.compatible) {
    console.error('❌ 兼容性检查失败:', compatibility.issues);
    
    // 在浏览器环境中，如果只是缺少一些API，不要抛出错误
    if (isBrowser && compatibility.issues.length > 0) {
        console.warn('⚠️  浏览器环境兼容性问题，但将继续运行:', compatibility.issues);
    } else {
        throw new Error('环境不兼容: ' + compatibility.issues.join(', '));
    }
}

if (compatibility.warnings.length > 0 && typeof console !== 'undefined') {
    console.warn('⚠️  兼容性警告:', compatibility.warnings);
}

// 初始化日志
if (typeof console !== 'undefined' && console.log) {
    console.log('🚀 Smart A* Algorithm Library v2.0.0 已加载');
    console.log('📱 环境:', compatibility.environment.platform);
    console.log('💾 内存:', compatibility.environment.memory);
    console.log('🖥️  CPU核心:', compatibility.environment.cores);
}

// ES Module 导出
export default AstarLib;
export { Grid, Astar, createAstar, createSmartAstar, quickPath, benchmark, presets };