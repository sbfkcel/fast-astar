/**
 * fast-astar - 高性能A*寻路算法
 * 浏览器兼容版本（IIFE）
 * 包含：Grid, Astar (智能自适应实现)
 */
(function(global) {
    'use strict';

    // ====== 工具函数 ======
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

    function getPerformanceNow() {
        if (typeof performance !== 'undefined' && performance.now) {
            return performance.now();
        }
        return Date.now();
    }

    // ====== 高性能二叉堆 ======
    class BinaryHeap {
        constructor(scoreFunction = (node) => node.f) {
            this.content = [];
            this.scoreFunction = scoreFunction;
        }

        push(element) {
            this.content.push(element);
            this.sinkDown(this.content.length - 1);
        }

        pop() {
            const result = this.content[0];
            const end = this.content.pop();
            if (this.content.length > 0) {
                this.content[0] = end;
                this.bubbleUp(0);
            }
            return result;
        }

        size() {
            return this.content.length;
        }

        isEmpty() {
            return this.content.length === 0;
        }

        sinkDown(n) {
            const element = this.content[n];
            const elemScore = this.scoreFunction(element);
            
            while (n > 0) {
                const parentN = ((n + 1) >> 1) - 1;
                const parent = this.content[parentN];
                if (elemScore >= this.scoreFunction(parent)) break;
                
                this.content[parentN] = element;
                this.content[n] = parent;
                n = parentN;
            }
        }

        bubbleUp(n) {
            const length = this.content.length;
            const element = this.content[n];
            const elemScore = this.scoreFunction(element);

            while (true) {
                const child2N = (n + 1) << 1;
                const child1N = child2N - 1;
                let swap = null;
                let child1Score = Infinity;

                if (child1N < length) {
                    const child1 = this.content[child1N];
                    child1Score = this.scoreFunction(child1);
                    if (child1Score < elemScore) {
                        swap = child1N;
                    }
                }

                if (child2N < length) {
                    const child2 = this.content[child2N];
                    const child2Score = this.scoreFunction(child2);
                    if (child2Score < (swap === null ? elemScore : child1Score)) {
                        swap = child2N;
                    }
                }

                if (swap === null) break;

                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }
        }
    }

    // ====== 网格类 ======
    class Grid {
        constructor(options) {
            this.col = options.col || 10;
            this.row = options.row || 10;
            this.size = this.col * this.row;
            this.render = options.render;
            
            // 使用位图存储障碍物
            const byteSize = Math.ceil(this.size / 8);
            this.obstacles = new Uint8Array(byteSize);
            
            // 节点缓存
            this.nodeCache = new Map();
            
            // 兼容原始API
            this.grid = this._createCompatGrid();
        }

        // 创建兼容的网格结构
        _createCompatGrid() {
            const grid = [];
            for (let y = 0; y < this.row; y++) {
                const row = [];
                for (let x = 0; x < this.col; x++) {
                    row.push(this._createNode(x, y));
                }
                grid.push(row);
            }
            return grid;
        }

        _createNode(x, y) {
            const self = this;
            const node = {
                x: x,
                y: y,
                g: 0,
                h: 0,
                f: 0,
                value: 0,
                key: [x, y],
                parent: undefined,
                render: self.render
            };
            return node;
        }

        // 设置障碍物 - 兼容原始API
        set(point, key, val) {
            const node = this.get(point);
            if (node) {
                node[key] = val;
                if (key === 'value') {
                    const idx = point[1] * this.col + point[0];
                    const byteIdx = idx >> 3;
                    const bitIdx = idx & 7;
                    if (val > 0) {
                        this.obstacles[byteIdx] |= (1 << bitIdx);
                    } else {
                        this.obstacles[byteIdx] &= ~(1 << bitIdx);
                    }
                }
                if (typeof node.render === 'function') {
                    node.render({ key, val });
                }
            }
        }

        // 获取节点 - 兼容原始API
        get(point) {
            const row = this.grid[point[1]];
            return row ? row[point[0]] : undefined;
        }

        // 生成随机障碍物 - 兼容原始API
        obstacle(percentage, value) {
            const count = Math.floor(this.col * this.row * percentage / 100);
            const obstacles = {};
            
            for (let i = 0; i < count; i++) {
                const x = Math.floor(Math.random() * this.col);
                const y = Math.floor(Math.random() * this.row);
                const node = this.get([x, y]);
                if (node && node.value === 0) {
                    node.value = value;
                    const idx = y * this.col + x;
                    const byteIdx = idx >> 3;
                    const bitIdx = idx & 7;
                    this.obstacles[byteIdx] |= (1 << bitIdx);
                    obstacles[[x, y]] = null;
                }
            }
            return obstacles;
        }

        // 检查是否可行走
        isWalkableAt(x, y) {
            if (x < 0 || x >= this.col || y < 0 || y >= this.row) {
                return false;
            }
            const idx = y * this.col + x;
            const byteIdx = idx >> 3;
            const bitIdx = idx & 7;
            return (this.obstacles[byteIdx] & (1 << bitIdx)) === 0;
        }

        // 设置可行走状态
        setWalkAt(x, y, walkable) {
            if (x < 0 || x >= this.col || y < 0 || y >= this.row) return;
            const idx = y * this.col + x;
            const byteIdx = idx >> 3;
            const bitIdx = idx & 7;
            if (walkable) {
                this.obstacles[byteIdx] &= ~(1 << bitIdx);
            } else {
                this.obstacles[byteIdx] |= (1 << bitIdx);
            }
            const node = this.get([x, y]);
            if (node) {
                node.value = walkable ? 0 : 1;
            }
        }

        // 批量设置障碍物
        setObstacles(obstacles) {
            for (const obs of obstacles) {
                this.set(obs, 'value', 1);
            }
        }

        // 获取网格数据
        getData() {
            return this.grid.map(row => row.map(node => node.value));
        }
    }

    // ====== Ultra A* 实现 ======
    class UltraAstar {
        constructor(grid) {
            this.grid = grid;
            this.openHeap = new BinaryHeap((node) => node.f);
        }

        search(start, end, options = {}) {
            const grid = this.grid;
            const openHeap = this.openHeap;
            openHeap.content = [];

            const startNode = grid.get(start);
            const endNode = grid.get(end);

            if (!startNode || !endNode) return null;

            const rightAngle = options.rightAngle || false;

            // 初始化起点
            startNode.g = 0;
            startNode.h = this._heuristic(startNode, endNode);
            startNode.f = startNode.h;
            startNode.opened = true;
            startNode.parent = undefined;

            // 触发 render 回调记录起点
            grid.set(start, 'type', 'open');

            openHeap.push(startNode);

            while (!openHeap.isEmpty()) {
                const current = openHeap.pop();
                current.closed = true;
                
                // 高亮当前检查的节点
                grid.set(current.key, 'type', 'highlight');

                if (current === endNode) {
                    // 找到终点，记录路径
                    const path = this._reconstructPath(endNode);
                    return path;
                }

                // 将当前节点加入关闭列表
                const currentKey = current.key.toString();
                grid.set(current.key, 'type', 'close');

                const neighbors = this._getNeighbors(current, rightAngle);
                
                for (const neighbor of neighbors) {
                    if (neighbor.closed) continue;

                    const gScore = current.g + this._distance(current, neighbor);
                    const wasOpened = neighbor.opened;

                    if (!neighbor.opened || gScore < neighbor.g) {
                        neighbor.g = gScore;
                        neighbor.h = this._heuristic(neighbor, endNode);
                        neighbor.f = neighbor.g + neighbor.h;
                        neighbor.parent = current;

                        if (!neighbor.opened) {
                            // 新加入开放列表
                            openHeap.push(neighbor);
                            neighbor.opened = true;
                            grid.set(neighbor.key, 'type', 'open');
                        } else {
                            // 更新已存在的节点
                            grid.set(neighbor.key, 'type', 'update');
                        }
                    }
                }
            }

            return null;
        }

        _heuristic(a, b) {
            const dx = Math.abs(a.x - b.x);
            const dy = Math.abs(a.y - b.y);
            return 10 * (dx + dy) + (14 - 20) * Math.min(dx, dy);
        }

        _distance(a, b) {
            return (a.x === b.x || a.y === b.y) ? 10 : 14;
        }

        _getNeighbors(node, rightAngle) {
            const grid = this.grid;
            const neighbors = [];
            const x = node.x;
            const y = node.y;

            // 四方向
            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            
            // 八方向（对角线）
            if (!rightAngle) {
                dirs.push([-1, -1], [1, -1], [1, 1], [-1, 1]);
            }

            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (grid.isWalkableAt(nx, ny)) {
                    const neighbor = grid.get([nx, ny]);
                    if (neighbor) {
                        neighbors.push(neighbor);
                    }
                }
            }

            return neighbors;
        }

        _reconstructPath(node) {
            const path = [];
            let current = node;
            while (current) {
                path.unshift(current.key);
                current = current.parent;
            }
            return path;
        }

        // 清理状态供下次搜索
        cleanup() {
            for (let y = 0; y < this.grid.row; y++) {
                for (let x = 0; x < this.grid.col; x++) {
                    const node = this.grid.get([x, y]);
                    if (node) {
                        node.g = 0;
                        node.h = 0;
                        node.f = 0;
                        node.opened = false;
                        node.closed = false;
                        node.parent = undefined;
                    }
                }
            }
        }
    }

    // ====== Astar 包装类（兼容原始API） ======
    class Astar {
        constructor(grid) {
            this.grid = grid;
            this.impl = new UltraAstar(grid);
            this.openList = new Map();
            this.closeList = new Map();
        }

        search(start, end, options = {}) {
            // 清理之前的搜索状态
            this.impl.cleanup();
            this.openList.clear();
            this.closeList.clear();

            // 重置起点终点
            const startNode = this.grid.get(start);
            const endNode = this.grid.get(end);
            
            if (startNode) {
                startNode.value = 0;
                this.grid.set(start, 'type', 'start');
                this.openList.set(start.toString(), null);
            }
            if (endNode) {
                endNode.value = 0;
                this.grid.set(end, 'type', 'end');
            }

            // 执行搜索
            const path = this.impl.search(start, end, {
                rightAngle: options.rightAngle || false
            });

            // 更新 openList 和 closeList 以便 getBackPath 能工作
            // 遍历所有节点，记录状态
            for (let y = 0; y < this.grid.row; y++) {
                for (let x = 0; x < this.grid.col; x++) {
                    const node = this.grid.get([x, y]);
                    if (node) {
                        const key = node.key.toString();
                        if (node.opened) {
                            this.openList.set(key, null);
                        }
                        if (node.closed) {
                            this.closeList.set(key, null);
                        }
                    }
                }
            }

            return path;
        }

        // 兼容原始API - 获取回溯路径
        getBackPath(point) {
            const node = this.grid.get(point);
            if (!node) return [point];

            const path = [];
            let current = node;
            while (current) {
                path.unshift(current.key);
                current = current.parent;
            }
            return path;
        }
    }

    // ====== 导出到全局 ======
    global.Grid = Grid;
    global.Astar = Astar;
    global.FastAstar = {
        Grid,
        Astar,
        version: '2.0.0'
    };

})(typeof window !== 'undefined' ? window : this);
