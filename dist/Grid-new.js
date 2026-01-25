// 🌐 通用网格类 - 内存优化版本
// 支持所有环境：Node.js、浏览器、WebWorker等

// 四叉树节点 - 用于超大地图的障碍物查询优化
class QuadTreeNode {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.children = null; // [NW, NE, SW, SE]
        this.hasObstacle = false; // 是否包含障碍物
        this.isLeaf = true;
    }

    // 检查点是否在区域内
    contains(px, py) {
        return px >= this.x && px < this.x + this.width &&
               py >= this.y && py < this.y + this.height;
    }

    // 分割节点
    subdivide() {
        const halfWidth = Math.floor(this.width / 2);
        const halfHeight = Math.floor(this.height / 2);
        
        this.children = [
            new QuadTreeNode(this.x, this.y, halfWidth, halfHeight), // NW
            new QuadTreeNode(this.x + halfWidth, this.y, this.width - halfWidth, halfHeight), // NE
            new QuadTreeNode(this.x, this.y + halfHeight, halfWidth, this.height - halfHeight), // SW
            new QuadTreeNode(this.x + halfWidth, this.y + halfHeight, 
                           this.width - halfWidth, this.height - halfHeight) // SE
        ];
        this.isLeaf = false;
    }

    // 检查区域是否包含障碍物
    hasObstacleInRegion(grid, isObstacleFunc) {
        if (this.isLeaf) {
            // 叶子节点：检查所有点
            for (let y = this.y; y < this.y + this.height; y++) {
                for (let x = this.x; x < this.x + this.width; x++) {
                    if (isObstacleFunc(x, y)) {
                        return true;
                    }
                }
            }
            return false;
        } else {
            // 非叶子节点：递归检查子节点
            return this.children.some(child => child.hasObstacleInRegion(grid, isObstacleFunc));
        }
    }

    // 构建四叉树
    build(grid, isObstacleFunc, minSize = 16) {
        // 如果区域太小，不再分割
        if (this.width <= minSize && this.height <= minSize) {
            this.hasObstacle = this.hasObstacleInRegion(grid, isObstacleFunc);
            return;
        }

        // 检查当前区域是否包含障碍物
        this.hasObstacle = this.hasObstacleInRegion(grid, isObstacleFunc);
        
        if (this.hasObstacle) {
            // 如果包含障碍物，继续分割
            this.subdivide();
            for (const child of this.children) {
                child.build(grid, isObstacleFunc, minSize);
            }
        }
    }

    // 查询点是否为障碍物（使用四叉树加速）
    queryObstacle(px, py, grid, isObstacleFunc) {
        if (!this.contains(px, py)) {
            return false;
        }

        if (this.isLeaf) {
            // 叶子节点：直接查询
            return isObstacleFunc(px, py);
        }

        // 非叶子节点：递归查询
        for (const child of this.children) {
            if (child.contains(px, py)) {
                return child.queryObstacle(px, py, grid, isObstacleFunc);
            }
        }

        return false;
    }

    // 查询区域是否包含障碍物
    queryRegion(x, y, width, height, grid, isObstacleFunc) {
        // 检查区域是否与当前节点重叠
        if (x + width <= this.x || x >= this.x + this.width ||
            y + height <= this.y || y >= this.y + this.height) {
            return false; // 不重叠
        }

        if (!this.hasObstacle) {
            return false; // 当前区域无障碍物
        }

        if (this.isLeaf) {
            // 叶子节点：检查区域内的所有点
            const endX = Math.min(x + width, this.x + this.width);
            const endY = Math.min(y + height, this.y + this.height);
            for (let py = Math.max(y, this.y); py < endY; py++) {
                for (let px = Math.max(x, this.x); px < endX; px++) {
                    if (isObstacleFunc(px, py)) {
                        return true;
                    }
                }
            }
            return false;
        }

        // 非叶子节点：递归查询子节点
        return this.children.some(child => 
            child.queryRegion(x, y, width, height, grid, isObstacleFunc)
        );
    }
}

class Grid {
    constructor(options = {}) {
        // 支持多种初始化方式
        if (typeof options === 'number') {
            // 兼容: new Grid(100)
            this.col = options;
            this.row = options;
        } else if (Array.isArray(options)) {
            // 数组: new Grid([100, 100])
            this.col = options[0] || 10;
            this.row = options[1] || 10;
        } else {
            // 对象: new Grid({col: 100, row: 100})
            this.col = options.col || options.width || 10;
            this.row = options.row || options.height || 10;
        }
        
        // 性能优化：预计算常用值
        this.size = this.col * this.row;
        this.maxX = this.col - 1;
        this.maxY = this.row - 1;
        
        // 根据网格大小选择存储策略
        if (this.size > 1000000) { // 大于100万节点使用内存高效模式
            this.useMemoryEfficientMode = true;
            this.initMemoryEfficientGrid();
        } else {
            this.useMemoryEfficientMode = false;
            this.grid = this.createGrid();
        }
        
        // 对于超大地图（大于1000万节点），启用四叉树优化
        this.useQuadTree = this.size > 10000000;
        this.quadTree = null;
        this.quadTreeBuilt = false;
    }
    
    // 内存高效模式：使用位图存储障碍物，按需创建节点对象
    initMemoryEfficientGrid() {
        // 使用位图存储障碍物信息，每个位代表一个节点
        this.obstacles = new Uint8Array(Math.ceil(this.size / 8));
        
        // 节点缓存：只为访问过的节点创建对象
        this.nodeCache = new Map();
        
        console.log(`🚀 使用内存高效模式: ${this.col}x${this.row} (${(this.size/1000000).toFixed(1)}M节点)`);
        console.log(`💾 障碍物位图: ${(this.obstacles.length/1024).toFixed(1)}KB vs 传统模式: ${(this.size * 150 / 1024 / 1024).toFixed(1)}MB`);
    }
    
    createGrid() {
        const grid = new Array(this.row);
        
        for (let y = 0; y < this.row; y++) {
            grid[y] = new Array(this.col);
            for (let x = 0; x < this.col; x++) {
                grid[y][x] = {
                    x: x,
                    y: y,
                    value: 0,  // 0: 可通行, 1: 障碍物
                    g: 0,      // 从起点到当前点的实际代价
                    h: 0,      // 从当前点到终点的启发式代价
                    f: 0,      // f = g + h
                    parent: null
                };
            }
        }
        
        return grid;
    }
    
    // 内存高效模式的障碍物操作
    setObstacleBit(x, y, isObstacle) {
        const index = y * this.col + x;
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        
        if (isObstacle) {
            this.obstacles[byteIndex] |= (1 << bitIndex);
        } else {
            this.obstacles[byteIndex] &= ~(1 << bitIndex);
        }
    }
    
    getObstacleBit(x, y) {
        const index = y * this.col + x;
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        return (this.obstacles[byteIndex] & (1 << bitIndex)) !== 0;
    }
    
    // 按需创建节点对象
    getOrCreateNode(x, y) {
        const key = `${x},${y}`;
        
        if (!this.nodeCache.has(key)) {
            this.nodeCache.set(key, {
                x: x,
                y: y,
                value: this.getObstacleBit(x, y) ? 1 : 0,
                g: 0,
                h: 0,
                f: 0,
                parent: null
            });
        }
        
        return this.nodeCache.get(key);
    }
    
    // 设置障碍物
    setWalkAt(x, y, walkable) {
        if (!this.isValidCoordinate(x, y)) return;
        
        if (this.useMemoryEfficientMode) {
            this.setObstacleBit(x, y, !walkable);
            
            // 如果节点已缓存，更新其值
            const key = `${x},${y}`;
            if (this.nodeCache.has(key)) {
                this.nodeCache.get(key).value = walkable ? 0 : 1;
            }
        } else {
            this.grid[y][x].value = walkable ? 0 : 1;
        }
        
        // 如果使用四叉树，标记需要重新构建
        if (this.useQuadTree && this.quadTreeBuilt) {
            this.quadTreeBuilt = false;
            this.quadTree = null;
        }
    }
    
    // 检查坐标是否有效
    isValidCoordinate(x, y) {
        return x >= 0 && x < this.col && y >= 0 && y < this.row;
    }
    
    // 检查位置是否可通行（支持四叉树优化）
    isWalkableAt(x, y) {
        if (!this.isValidCoordinate(x, y)) {
            return false;
        }
        
        // 如果使用四叉树且已构建，使用四叉树查询
        if (this.useQuadTree && this.quadTree && this.quadTreeBuilt) {
            const isObstacleFunc = this.useMemoryEfficientMode 
                ? (px, py) => this.getObstacleBit(px, py)
                : (px, py) => this.grid[py] && this.grid[py][px] && this.grid[py][px].value >= 1;
            return !this.quadTree.queryObstacle(x, y, this, isObstacleFunc);
        }
        
        if (this.useMemoryEfficientMode) {
            return !this.getObstacleBit(x, y);
        } else {
            return this.grid[y][x].value === 0;
        }
    }
    
    // 构建四叉树（用于超大地图的障碍物查询优化）
    buildQuadTree() {
        if (!this.useQuadTree || this.quadTreeBuilt) {
            return;
        }
        
        console.log(`🌳 开始构建四叉树优化 (${this.col}x${this.row})...`);
        const startTime = Date.now();
        
        // 创建根节点
        this.quadTree = new QuadTreeNode(0, 0, this.col, this.row);
        
        // 定义障碍物检查函数
        const isObstacleFunc = this.useMemoryEfficientMode
            ? (x, y) => this.getObstacleBit(x, y)
            : (x, y) => this.grid[y] && this.grid[y][x] && this.grid[y][x].value >= 1;
        
        // 构建四叉树（最小节点大小为32x32）
        const minNodeSize = Math.max(16, Math.floor(Math.sqrt(this.size) / 100));
        this.quadTree.build(this, isObstacleFunc, minNodeSize);
        
        this.quadTreeBuilt = true;
        const buildTime = Date.now() - startTime;
        console.log(`✅ 四叉树构建完成 (${buildTime}ms)`);
    }
    
    // 批量检查区域是否可通行（使用四叉树优化）
    isRegionWalkable(x, y, width, height) {
        if (!this.isValidCoordinate(x, y) || 
            !this.isValidCoordinate(x + width - 1, y + height - 1)) {
            return false;
        }
        
        // 如果使用四叉树且已构建，使用四叉树查询
        if (this.useQuadTree && this.quadTree && this.quadTreeBuilt) {
            const isObstacleFunc = this.useMemoryEfficientMode
                ? (px, py) => this.getObstacleBit(px, py)
                : (px, py) => this.grid[py] && this.grid[py][px] && this.grid[py][px].value >= 1;
            
            // 如果区域包含障碍物，返回false
            return !this.quadTree.queryRegion(x, y, width, height, this, isObstacleFunc);
        }
        
        // 回退到逐个检查
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                if (!this.isWalkableAt(px, py)) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // 获取节点
    getNodeAt(x, y) {
        if (!this.isValidCoordinate(x, y)) {
            return null;
        }
        
        if (this.useMemoryEfficientMode) {
            return this.getOrCreateNode(x, y);
        } else {
            return this.grid[y][x];
        }
    }
    
    // 重置网格（清除路径查找数据）
    reset() {
        if (this.useMemoryEfficientMode) {
            // 清空节点缓存
            this.nodeCache.clear();
        } else {
            for (let y = 0; y < this.row; y++) {
                for (let x = 0; x < this.col; x++) {
                    const node = this.grid[y][x];
                    node.g = 0;
                    node.h = 0;
                    node.f = 0;
                    node.parent = null;
                }
            }
        }
    }
    
    // 批量设置障碍物
    setObstacles(obstacles) {
        for (const obstacle of obstacles) {
            if (Array.isArray(obstacle) && obstacle.length >= 2) {
                this.setWalkAt(obstacle[0], obstacle[1], false);
            } else if (obstacle.x !== undefined && obstacle.y !== undefined) {
                this.setWalkAt(obstacle.x, obstacle.y, false);
            }
        }
        
        // 如果使用四叉树，需要重新构建
        if (this.useQuadTree && this.quadTreeBuilt) {
            this.quadTreeBuilt = false;
            this.quadTree = null;
        }
    }
    
    // 从二维数组创建网格
    static fromArray(array) {
        const rows = array.length;
        const cols = array[0] ? array[0].length : 0;
        
        const grid = new Grid({ col: cols, row: rows });
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (array[y] && array[y][x] !== undefined) {
                    grid.setWalkAt(x, y, array[y][x] === 0);
                }
            }
        }
        
        return grid;
    }
    
    // 转换为二维数组
    toArray() {
        const array = new Array(this.row);
        
        for (let y = 0; y < this.row; y++) {
            array[y] = new Array(this.col);
            for (let x = 0; x < this.col; x++) {
                if (this.useMemoryEfficientMode) {
                    array[y][x] = this.getObstacleBit(x, y) ? 1 : 0;
                } else {
                    array[y][x] = this.grid[y][x].value;
                }
            }
        }
        
        return array;
    }
    
    // 获取网格统计信息
    getStats() {
        let walkable = 0;
        let obstacles = 0;
        
        if (this.useMemoryEfficientMode) {
            // 遍历位图统计
            for (let i = 0; i < this.size; i++) {
                const byteIndex = Math.floor(i / 8);
                const bitIndex = i % 8;
                if (this.obstacles[byteIndex] & (1 << bitIndex)) {
                    obstacles++;
                } else {
                    walkable++;
                }
            }
        } else {
            for (let y = 0; y < this.row; y++) {
                for (let x = 0; x < this.col; x++) {
                    if (this.grid[y][x].value === 0) {
                        walkable++;
                    } else {
                        obstacles++;
                    }
                }
            }
        }
        
        return {
            total: this.size,
            walkable,
            obstacles,
            walkablePercent: (walkable / this.size * 100).toFixed(2),
            obstaclePercent: (obstacles / this.size * 100).toFixed(2),
            memoryMode: this.useMemoryEfficientMode ? 'Memory Efficient' : 'Standard',
            cachedNodes: this.useMemoryEfficientMode ? this.nodeCache.size : this.size
        };
    }
    
    // 随机生成障碍物
    generateRandomObstacles(density = 0.3) {
        const obstacleCount = Math.floor(this.size * density);
        
        for (let i = 0; i < obstacleCount; i++) {
            const x = Math.floor(Math.random() * this.col);
            const y = Math.floor(Math.random() * this.row);
            this.setWalkAt(x, y, false);
        }
    }
    
    // 获取内存使用情况
    getMemoryUsage() {
        if (this.useMemoryEfficientMode) {
            const obstacleBytes = this.obstacles.length;
            const cacheBytes = this.nodeCache.size * 100; // 估算每个节点对象100字节
            
            return {
                obstacles: obstacleBytes,
                nodeCache: cacheBytes,
                total: obstacleBytes + cacheBytes,
                mode: 'Memory Efficient',
                savings: Math.max(0, this.size * 150 - (obstacleBytes + cacheBytes))
            };
        } else {
            const gridBytes = this.size * 150; // 估算每个节点对象150字节
            
            return {
                grid: gridBytes,
                total: gridBytes,
                mode: 'Standard'
            };
        }
    }
    
    // 生成迷宫（简化版本，避免在大地图上耗时过长）
    generateMaze() {
        // 对于大地图，使用简化的迷宫生成算法
        if (this.useMemoryEfficientMode && this.size > 10000000) {
            console.log('⚠️  大地图跳过迷宫生成以节省时间');
            return;
        }
        
        // 首先填充所有位置为障碍物
        for (let y = 0; y < this.row; y++) {
            for (let x = 0; x < this.col; x++) {
                this.setWalkAt(x, y, false);
            }
        }
        
        // 简化的迷宫生成：创建通道
        for (let y = 1; y < this.row - 1; y += 2) {
            for (let x = 1; x < this.col - 1; x += 2) {
                this.setWalkAt(x, y, true);
                
                // 随机创建连接
                if (Math.random() > 0.5 && x + 1 < this.col - 1) {
                    this.setWalkAt(x + 1, y, true);
                }
                if (Math.random() > 0.5 && y + 1 < this.row - 1) {
                    this.setWalkAt(x, y + 1, true);
                }
            }
        }
    }
}

export default Grid;