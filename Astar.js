// 🚀 智能自适应A*算法 - 最终整合版本
// 自动选择最优实现：Ultra/Master/WebAssembly
// 支持所有环境：Node.js、浏览器、WebWorker等

import { isNode, isBrowser, getPerformanceNow } from './utils.js';

    // 高性能二叉堆实现
    class BinaryHeap {
        constructor(scoreFunction = (node) => node.f) {
            this.content = [];
            this.scoreFunction = scoreFunction;
            // element -> index (for decrease-key / update)
            this.indexMap = new Map();
        }

        push(element) {
            this.content.push(element);
            this.indexMap.set(element, this.content.length - 1);
            this.sinkDown(this.content.length - 1);
        }

        pop() {
            const result = this.content[0];
            const end = this.content.pop();
            this.indexMap.delete(result);
            if (this.content.length > 0) {
                this.content[0] = end;
                this.indexMap.set(end, 0);
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
                this.indexMap.set(element, parentN);
                this.indexMap.set(parent, n);
                n = parentN;
            }
        }

        bubbleUp(n) {
            const element = this.content[n];
            const elemScore = this.scoreFunction(element);

            while (true) {
                const child2N = (n + 1) << 1;
                const child1N = child2N - 1;
                let swap = null;

                if (child1N < this.content.length) {
                    const child1 = this.content[child1N];
                    if (this.scoreFunction(child1) < elemScore) {
                        swap = child1N;
                    }
                }

                if (child2N < this.content.length) {
                    const child2 = this.content[child2N];
                    const compareScore = swap === null ? elemScore : this.scoreFunction(this.content[swap]);
                    if (this.scoreFunction(child2) < compareScore) {
                        swap = child2N;
                    }
                }

                if (swap !== null) {
                    this.content[n] = this.content[swap];
                    this.content[swap] = element;
                    this.indexMap.set(this.content[n], n);
                    this.indexMap.set(element, swap);
                    n = swap;
                } else {
                    break;
                }
            }
        }

        // Re-heapify after element score changed
        update(element) {
            const pos = this.indexMap.get(element);
            if (pos === undefined) return;
            this.sinkDown(pos);
            this.bubbleUp(pos);
        }
    }

    // Ultra A*实现 - 高性能版本（兼容内存高效Grid）
    class UltraAstar {
        constructor(grid) {
            this.grid = grid;
            this.width = grid.col;
            this.height = grid.row;
            
            // 兼容新旧Grid接口
            this.gridData = grid.grid || null; // 传统模式
            this.useMemoryEfficientGrid = grid.useMemoryEfficientMode || false;
            
            this.openHeap = new BinaryHeap();
            this.openSet = new Set();
            this.closedSet = new Set();
        }
        
        // 兼容的节点获取方法
        getNode(x, y) {
            if (this.useMemoryEfficientGrid) {
                return this.grid.getNodeAt(x, y);
            } else {
                return this.gridData[y][x];
            }
        }
        
        // 兼容的障碍物检查方法
        isWalkable(x, y) {
            if (this.useMemoryEfficientGrid) {
                return this.grid.isWalkableAt(x, y);
            } else {
                return this.gridData[y][x].value < 1;
            }
        }
        
        search(start, end, options = {}) {
            // 输入验证
            if (!Array.isArray(start) || start.length < 2 || 
                !Array.isArray(end) || end.length < 2) {
                throw new Error('起点和终点必须是包含至少2个元素的数组 [x, y]');
            }
            
            const startX = Math.floor(start[0]);
            const startY = Math.floor(start[1]);
            const endX = Math.floor(end[0]);
            const endY = Math.floor(end[1]);
            
            // 边界检查
            if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height) {
                throw new Error(`起点坐标 [${startX}, ${startY}] 超出网格范围 [0-${this.width-1}, 0-${this.height-1}]`);
            }
            
            if (endX < 0 || endX >= this.width || endY < 0 || endY >= this.height) {
                throw new Error(`终点坐标 [${endX}, ${endY}] 超出网格范围 [0-${this.width-1}, 0-${this.height-1}]`);
            }
            
            const rightAngle = options.rightAngle || false;
            const optimalResult = options.optimalResult !== false; // default true, ensures optimal when true
            const hasRender = !!(this.grid && typeof this.grid.render === 'function');
            
            // 重置搜索状态
            this.openHeap = new BinaryHeap();
            this.openSet.clear();
            this.closedSet.clear();
            
            const startNode = this.getNode(startX, startY);
            const endNode = this.getNode(endX, endY);
            
            if (!startNode || !endNode) {
                return null;
            }
            
            // 检查起点和终点是否可通行
            if (!this.isWalkable(startX, startY)) {
                throw new Error(`起点 [${startX}, ${startY}] 是障碍物，无法通行`);
            }
            
            if (!this.isWalkable(endX, endY)) {
                throw new Error(`终点 [${endX}, ${endY}] 是障碍物，无法通行`);
            }
            
            // 如果起点和终点相同，直接返回
            if (startX === endX && startY === endY) {
                return [[startX, startY]];
            }
            
            startNode.g = 0;
            startNode.h = this.heuristicDistance(startX, startY, endX, endY, rightAngle, optimalResult);
            startNode.f = startNode.h;
            startNode.parent = null;
            
            // 仅用于演示：将分数同步回节点对象（只在提供 render 时启用）
            if (hasRender && this.gridData && this.gridData[startY] && this.gridData[startY][startX]) {
                const gridNode = this.gridData[startY][startX];
                gridNode.g = startNode.g;
                gridNode.h = startNode.h;
                gridNode.f = startNode.f;
                gridNode.parent = startNode.parent;
            }
            
            // 触发 render 回调：起点加入开放列表（在设置 g、h、f 之后）
            if (hasRender && this.grid.set) {
                this.grid.set([startX, startY], 'type', 'open');
            }
            
            this.openHeap.push(startNode);
            this.openSet.add([startX, startY].toString());
            
            while (!this.openHeap.isEmpty()) {
                const current = this.openHeap.pop();
                const currentKey = [current.x, current.y].toString();
                
                this.openSet.delete(currentKey);
                this.closedSet.add(currentKey);
                
                // 触发 render 回调：高亮当前检查的节点
                if (hasRender && this.grid.set) {
                    this.grid.set([current.x, current.y], 'type', 'highlight');
                }
                
                if (current.x === endX && current.y === endY) {
                    return this.reconstructPath(current);
                }
                
                // 触发 render 回调：当前节点加入关闭列表
                if (hasRender && this.grid.set) {
                    this.grid.set([current.x, current.y], 'type', 'close');
                }
                
                const neighbors = this.getNeighbors(current, rightAngle);
                
                for (const neighbor of neighbors) {
                    const neighborKey = [neighbor.x, neighbor.y].toString();
                    
                    if (this.closedSet.has(neighborKey)) continue;
                    
                    const moveCost = this.getMoveCost(current, neighbor, optimalResult);
                    const tentativeG = current.g + moveCost;
                    
                    if (!this.openSet.has(neighborKey)) {
                        neighbor.parent = [current.x, current.y];
                        neighbor.g = tentativeG;
                        neighbor.h = this.heuristicDistance(neighbor.x, neighbor.y, endX, endY, rightAngle, optimalResult);
                        neighbor.f = neighbor.g + neighbor.h;
                        
                        // 仅用于演示：将分数同步回节点对象（只在提供 render 时启用）
                        if (hasRender && this.gridData && this.gridData[neighbor.y] && this.gridData[neighbor.y][neighbor.x]) {
                            const gridNode = this.gridData[neighbor.y][neighbor.x];
                            gridNode.g = neighbor.g;
                            gridNode.h = neighbor.h;
                            gridNode.f = neighbor.f;
                            gridNode.parent = neighbor.parent;
                        }
                        
                        // 触发 render 回调：新节点加入开放列表（在设置 g、h、f 之后）
                        if (hasRender && this.grid.set) {
                            this.grid.set([neighbor.x, neighbor.y], 'type', 'open');
                        }
                        
                        this.openHeap.push(neighbor);
                        this.openSet.add(neighborKey);
                    } else if (tentativeG < neighbor.g) {
                        neighbor.parent = [current.x, current.y];
                        neighbor.g = tentativeG;
                        // h stays valid for same end; f must be updated
                        neighbor.f = neighbor.g + neighbor.h;
                        
                        // 仅用于演示：将分数同步回节点对象（只在提供 render 时启用）
                        if (hasRender && this.gridData && this.gridData[neighbor.y] && this.gridData[neighbor.y][neighbor.x]) {
                            const gridNode = this.gridData[neighbor.y][neighbor.x];
                            gridNode.g = neighbor.g;
                            gridNode.f = neighbor.f;
                            gridNode.parent = neighbor.parent;
                        }
                        
                        // 触发 render 回调：更新节点（在设置 g、f 之后）
                        if (hasRender && this.grid.set) {
                            this.grid.set([neighbor.x, neighbor.y], 'type', 'update');
                        }
                        // decrease-key: re-heapify (required for optimality)
                        this.openHeap.update(neighbor);
                    }
                }
            }
            
            return null;
        }
        
        getNeighbors(node, rightAngle) {
            const neighbors = [];
            const directions = rightAngle ? 
                [[0, -1], [1, 0], [0, 1], [-1, 0]] :
                [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
            
            for (const [dx, dy] of directions) {
                const x = node.x + dx;
                const y = node.y + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    if (this.isWalkable(x, y)) {
                        const neighbor = this.getNode(x, y);
                        if (neighbor) {
                            neighbors.push(neighbor);
                        }
                    }
                }
            }
            
            return neighbors;
        }
        
        getMoveCost(from, to, optimalResult) {
            if (!optimalResult) return 10;
            
            const dx = Math.abs(from.x - to.x);
            const dy = Math.abs(from.y - to.y);
            
            return (dx === 0 || dy === 0) ? 10 : 14;
        }
        
        heuristicDistance(x1, y1, x2, y2, rightAngle, optimalResult) {
            const dx = Math.abs(x1 - x2);
            const dy = Math.abs(y1 - y2);
            if (rightAngle) return (dx + dy) * 10; // Manhattan (4-dir)
            const maxD = Math.max(dx, dy);
            const minD = dx + dy - maxD;
            if (!optimalResult) return maxD * 10; // Chebyshev (diag cost==10 in this mode)
            return 14 * minD + 10 * (maxD - minD); // Octile (8-dir, 10/14)
        }
        
        reconstructPath(endNode) {
            const path = [];
            let current = [endNode.x, endNode.y];
            
            while (current) {
                path.push(current);
                const node = this.getNode(current[0], current[1]);
                current = node ? node.parent : null;
            }
            
            return path.reverse();
        }
        
        // 兼容性方法
        getBackPath(xy) {
            const node = this.getNode(xy[0], xy[1]);
            return node ? this.reconstructPath(node) : [];
        }
        
        h(start, end) {
            // best-effort: assume optimalResult=true when used as heuristic API
            return this.heuristicDistance(start[0], start[1], end[0], end[1], false, true);
        }
        
        // 内存使用统计
        getMemoryUsage() {
            const openSetSize = this.openSet.size * 20; // 估算Set条目大小
            const closedSetSize = this.closedSet.size * 20;
            const openHeapSize = this.openHeap.size ? (this.openHeap.size() * 4) : (this.openHeap.size() * 50); // TypedArray: 4字节/索引 vs 普通数组: 50字节/节点
            
            return {
                openSet: openSetSize,
                closedSet: closedSetSize,
                openHeap: openHeapSize,
                total: openSetSize + closedSetSize + openHeapSize,
                mode: this.useMemoryEfficientGrid ? 'Compatible with Memory Efficient Grid' : 'Standard Grid'
            };
        }
    }

    // Memory-Efficient A*实现 - 专为大地图优化
    class MemoryEfficientAstar {
        constructor(grid) {
            this.grid = grid;
            this.width = grid.col;
            this.height = grid.row;
            
            // 如果Grid已经是内存高效模式，直接使用
            if (grid.useMemoryEfficientMode) {
                this.useGridObstacles = true;
            } else {
                // 否则创建自己的位图
                this.useGridObstacles = false;
                this.obstacles = new Uint8Array(Math.ceil(this.width * this.height / 8));
                this.initObstacles();
            }
            
            // 动态分配的数据结构，只存储访问过的节点
            this.closedSet = new Set(); // 使用数字索引而不是字符串
            this.gScore = new Map(); // 只存储计算过的g值
            this.fScore = new Map(); // 存储f值用于堆排序
            this.parent = new Map(); // 只存储有父节点的节点
        }
        
        initObstacles() {
            // 将Grid的障碍物信息压缩到位图中
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.grid.grid[y][x].value >= 1) {
                        this.setObstacle(x, y, true);
                    }
                }
            }
        }
        
        setObstacle(x, y, isObstacle) {
            if (this.useGridObstacles) {
                this.grid.setObstacleBit(x, y, isObstacle);
            } else {
                const index = y * this.width + x;
                const byteIndex = Math.floor(index / 8);
                const bitIndex = index % 8;
                
                if (isObstacle) {
                    this.obstacles[byteIndex] |= (1 << bitIndex);
                } else {
                    this.obstacles[byteIndex] &= ~(1 << bitIndex);
                }
            }
        }
        
        isObstacle(x, y) {
            if (this.useGridObstacles) {
                return this.grid.getObstacleBit(x, y);
            } else {
                const index = y * this.width + x;
                const byteIndex = Math.floor(index / 8);
                const bitIndex = index % 8;
                return (this.obstacles[byteIndex] & (1 << bitIndex)) !== 0;
            }
        }
        
        nodeIndex(x, y) {
            return y * this.width + x;
        }
        
        indexToCoords(index) {
            return [index % this.width, Math.floor(index / this.width)];
        }
        
        search(start, end, options = {}) {
            const rightAngle = options.rightAngle || false;
            const optimalResult = true; // always optimal paths
            
            // 清理之前的搜索状态
            this.closedSet.clear();
            this.gScore.clear();
            this.fScore.clear();
            this.parent.clear();
            
            const startIndex = this.nodeIndex(start[0], start[1]);
            const endIndex = this.nodeIndex(end[0], end[1]);
            
            // 创建二叉堆，使用fScore作为评分函数
            const openHeap = new IndexBinaryHeap((index) => this.fScore.get(index) || Infinity);
            
            // 初始化起点
            this.gScore.set(startIndex, 0);
            const h = this.heuristicDistance(start[0], start[1], end[0], end[1], rightAngle, optimalResult);
            this.fScore.set(startIndex, h); // f = g + h = 0 + h
            openHeap.push(startIndex);
            
            const directions = rightAngle ? 
                [[-1, 0], [1, 0], [0, -1], [0, 1]] :
                [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
            
            while (!openHeap.isEmpty()) {
                // 从堆中取出f值最小的节点
                const currentIndex = openHeap.pop();
                this.closedSet.add(currentIndex);
                
                // 检查是否到达终点
                if (currentIndex === endIndex) {
                    return this.reconstructPath(endIndex, start);
                }
                
                const [currentX, currentY] = this.indexToCoords(currentIndex);
                const currentG = this.gScore.get(currentIndex);
                
                // 检查邻居
                for (const [dx, dy] of directions) {
                    const neighborX = currentX + dx;
                    const neighborY = currentY + dy;
                    
                    // 边界检查
                    if (neighborX < 0 || neighborX >= this.width || 
                        neighborY < 0 || neighborY >= this.height) continue;
                    
                    const neighborIndex = this.nodeIndex(neighborX, neighborY);
                    
                    // 跳过障碍物和已关闭的节点
                    if (this.isObstacle(neighborX, neighborY) || 
                        this.closedSet.has(neighborIndex)) continue;
                    
                    // 计算移动成本
                    const moveCost = optimalResult && (dx !== 0 && dy !== 0) ? 14 : 10;
                    const tentativeG = currentG + moveCost;
                    
                    // 如果找到更好的路径
                    const existingG = this.gScore.get(neighborIndex);
                    if (existingG === undefined || tentativeG < existingG) {
                        this.parent.set(neighborIndex, currentIndex);
                        this.gScore.set(neighborIndex, tentativeG);
                        
                        const h = this.heuristicDistance(neighborX, neighborY, end[0], end[1], rightAngle, optimalResult);
                        const f = tentativeG + h;
                        this.fScore.set(neighborIndex, f);
                        
                        // 如果节点已在堆中则更新，否则 push
                        if (openHeap.indexMap && openHeap.indexMap.has(neighborIndex)) {
                            openHeap.update(neighborIndex);
                        } else {
                            openHeap.push(neighborIndex);
                        }
                    }
                }
            }
            
            return null; // 无路径
        }
        
        reconstructPath(endIndex, start) {
            const path = [];
            let currentIndex = endIndex;
            
            while (currentIndex !== undefined) {
                const [x, y] = this.indexToCoords(currentIndex);
                path.push([x, y]);
                currentIndex = this.parent.get(currentIndex);
            }
            
            return path.reverse();
        }
        
        heuristicDistance(x1, y1, x2, y2, rightAngle, optimalResult) {
            const dx = Math.abs(x1 - x2);
            const dy = Math.abs(y1 - y2);
            if (rightAngle) return (dx + dy) * 10;
            const maxD = Math.max(dx, dy);
            const minD = dx + dy - maxD;
            if (!optimalResult) return maxD * 10;
            return 14 * minD + 10 * (maxD - minD);
        }
        
        // 兼容性方法
        getBackPath(xy) {
            const index = this.nodeIndex(xy[0], xy[1]);
            return this.reconstructPath(index, [0, 0]);
        }
        
        h(start, end) {
            return this.heuristicDistance(start[0], start[1], end[0], end[1], false, true);
        }
        
        // 内存使用统计
        getMemoryUsage() {
            const obstacleBytes = this.useGridObstacles ? 0 : this.obstacles.length;
            const closedSetBytes = this.closedSet.size * 8;
            const gScoreBytes = this.gScore.size * 16;
            const fScoreBytes = this.fScore.size * 16;
            const parentBytes = this.parent.size * 16;
            
            return {
                obstacles: obstacleBytes,
                closedSet: closedSetBytes,
                gScore: gScoreBytes,
                fScore: fScoreBytes,
                parent: parentBytes,
                total: obstacleBytes + closedSetBytes + gScoreBytes + fScoreBytes + parentBytes
            };
        }
    }
    // 索引二叉堆 - 使用 TypedArray 优化，减少内存分配
    class IndexBinaryHeap {
        constructor(scoreFunction, initialCapacity = 1024) {
            this.scoreFunction = scoreFunction;
            // 使用 Int32Array 存储索引，减少内存占用和提高性能
            this.capacity = initialCapacity;
            this.content = new Int32Array(this.capacity);
            this._size = 0; // 使用 _size 避免与方法名冲突
            // 索引映射：快速查找元素在堆中的位置
            this.indexMap = new Map();
        }

        // 动态扩容
        _ensureCapacity() {
            if (this._size >= this.capacity) {
                const newCapacity = this.capacity * 2;
                const newContent = new Int32Array(newCapacity);
                newContent.set(this.content);
                this.content = newContent;
                this.capacity = newCapacity;
            }
        }

        push(index) {
            this._ensureCapacity();
            this.content[this._size] = index;
            this.indexMap.set(index, this._size);
            this.sinkDown(this._size);
            this._size++;
        }

        pop() {
            if (this._size === 0) return null;
            
            const result = this.content[0];
            this.indexMap.delete(result);
            
            if (this._size === 1) {
                this._size = 0;
                return result;
            }
            
            const end = this.content[this._size - 1];
            this.content[0] = end;
            this.indexMap.set(end, 0);
            this._size--;
            
            if (this._size > 0) {
                this.bubbleUp(0);
            }
            
            return result;
        }

        size() {
            return this._size;
        }

        isEmpty() {
            return this._size === 0;
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
                this.indexMap.set(element, parentN);
                this.indexMap.set(parent, n);
                n = parentN;
            }
        }

        bubbleUp(n) {
            const element = this.content[n];
            const elemScore = this.scoreFunction(element);

            while (true) {
                const child2N = (n + 1) << 1;
                const child1N = child2N - 1;
                let swap = null;

                if (child1N < this._size) {
                    const child1 = this.content[child1N];
                    if (this.scoreFunction(child1) < elemScore) {
                        swap = child1N;
                    }
                }

                if (child2N < this._size) {
                    const child2 = this.content[child2N];
                    const compareScore = swap === null ? elemScore : this.scoreFunction(this.content[swap]);
                    if (this.scoreFunction(child2) < compareScore) {
                        swap = child2N;
                    }
                }

                if (swap !== null) {
                    const swapElement = this.content[swap];
                    this.content[n] = swapElement;
                    this.content[swap] = element;
                    this.indexMap.set(swapElement, n);
                    this.indexMap.set(element, swap);
                    n = swap;
                } else {
                    break;
                }
            }
        }

        // 更新堆中元素的位置（当f值改变时）- O(log n) 时间复杂度
        update(index) {
            const pos = this.indexMap.get(index);
            if (pos !== undefined && pos < this._size) {
                // 先尝试向上调整（如果值变小）
                this.sinkDown(pos);
                // 再尝试向下调整（如果值变大）
                this.bubbleUp(pos);
            }
        }

        // 清空堆
        clear() {
            this._size = 0;
            this.indexMap.clear();
        }
    }

    // Master A*实现 - 内存优化版本（使用二叉堆优化）
    class MasterAstar {
        constructor(grid) {
            this.grid = grid;
            this.gridData = grid.grid;
            this.width = grid.col;
            this.height = grid.row;
            this.gridSize = this.width * this.height;
            
            // 根据网格大小动态调整内存分配策略
            if (this.gridSize > 10000000) { // 大于1000万节点时使用内存高效模式
                this.useMemoryEfficientMode = true;
                this.memoryEfficientImpl = new MemoryEfficientAstar(grid);
            } else {
                this.useMemoryEfficientMode = false;
                // 预分配内存池（仅对中小型网格）
                this.closedList = new Uint8Array(this.gridSize);
                this.gScore = new Float32Array(this.gridSize);
                this.fScore = new Float32Array(this.gridSize);
                this.parent = new Int32Array(this.gridSize);
                this.inOpenList = new Uint8Array(this.gridSize); // 标记节点是否在开放列表中
            }
        }
        
        search(start, end, options = {}) {
            // 对于超大网格，委托给内存高效实现
            if (this.useMemoryEfficientMode) {
                return this.memoryEfficientImpl.search(start, end, options);
            }
            
            // 原有的Master A*实现（适用于中小型网格）- 使用二叉堆优化
            const rightAngle = options.rightAngle || false;
            const optimalResult = options.optimalResult !== false; // default true, ensures optimal when true
            const hasRender = !!(this.grid && typeof this.grid.render === 'function');
            
            // 重置状态
            this.closedList.fill(0);
            this.inOpenList.fill(0);
            this.gScore.fill(Infinity);
            this.fScore.fill(Infinity);
            this.parent.fill(-1);
            
            // 创建二叉堆，使用fScore作为评分函数
            const openHeap = new IndexBinaryHeap((index) => this.fScore[index]);
            
            const startIndex = start[1] * this.width + start[0];
            const endIndex = end[1] * this.width + end[0];
            
            this.gScore[startIndex] = 0;
            this.fScore[startIndex] = this.heuristicDistance(start[0], start[1], end[0], end[1], rightAngle, optimalResult);
            
            // 触发 render 回调：起点加入开放列表
            if (hasRender && this.grid.set) {
                // 将 TypedArray 中的 g/h/f 同步回节点对象（用于演示显示）
                const startNodeObj = this.gridData && this.gridData[start[1]] ? this.gridData[start[1]][start[0]] : null;
                if (startNodeObj) {
                    const g = this.gScore[startIndex];
                    const f = this.fScore[startIndex];
                    startNodeObj.g = g;
                    startNodeObj.f = f;
                    startNodeObj.h = f - g;
                    startNodeObj.parent = null;
                }
                this.grid.set(start, 'type', 'open');
            }
            
            openHeap.push(startIndex);
            this.inOpenList[startIndex] = 1;
            
            const directions = rightAngle ? 
                [[-1, 0], [1, 0], [0, -1], [0, 1]] :
                [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
            
            while (!openHeap.isEmpty()) {
                // 从堆中取出f值最小的节点
                const currentIndex = openHeap.pop();
                this.inOpenList[currentIndex] = 0;
                this.closedList[currentIndex] = 1;
                
                const currentX = currentIndex % this.width;
                const currentY = Math.floor(currentIndex / this.width);
                
                // 触发 render 回调：高亮当前检查的节点
                if (hasRender && this.grid.set) {
                    // 同步当前节点的 g/h/f（用于演示显示）
                    const curNodeObj = this.gridData && this.gridData[currentY] ? this.gridData[currentY][currentX] : null;
                    if (curNodeObj) {
                        const g = this.gScore[currentIndex];
                        const f = this.fScore[currentIndex];
                        curNodeObj.g = g;
                        curNodeObj.f = f;
                        curNodeObj.h = f - g;
                        const p = this.parent[currentIndex];
                        if (p === -1) {
                            curNodeObj.parent = null;
                        } else {
                            curNodeObj.parent = [p % this.width, Math.floor(p / this.width)];
                        }
                    }
                    this.grid.set([currentX, currentY], 'type', 'highlight');
                }
                
                if (currentIndex === endIndex) {
                    return this.reconstructPathFromIndex(currentIndex, start, end);
                }
                
                // 触发 render 回调：当前节点加入关闭列表
                if (hasRender && this.grid.set) {
                    // 关闭节点前也同步一遍（用于演示显示）
                    const curNodeObj = this.gridData && this.gridData[currentY] ? this.gridData[currentY][currentX] : null;
                    if (curNodeObj) {
                        const g = this.gScore[currentIndex];
                        const f = this.fScore[currentIndex];
                        curNodeObj.g = g;
                        curNodeObj.f = f;
                        curNodeObj.h = f - g;
                        const p = this.parent[currentIndex];
                        if (p === -1) {
                            curNodeObj.parent = null;
                        } else {
                            curNodeObj.parent = [p % this.width, Math.floor(p / this.width)];
                        }
                    }
                    this.grid.set([currentX, currentY], 'type', 'close');
                }
                
                // 检查邻居
                for (const [dx, dy] of directions) {
                    const neighborX = currentX + dx;
                    const neighborY = currentY + dy;
                    
                    if (neighborX < 0 || neighborX >= this.width || 
                        neighborY < 0 || neighborY >= this.height) continue;
                    
                    const neighborIndex = neighborY * this.width + neighborX;
                    
                    // 使用Grid的isWalkableAt方法检查障碍物
                    if (this.closedList[neighborIndex] || 
                        !this.grid.isWalkableAt(neighborX, neighborY)) continue;
                    
                    const moveCost = optimalResult && (dx !== 0 && dy !== 0) ? 14 : 10;
                    const tentativeG = this.gScore[currentIndex] + moveCost;
                    
                    if (tentativeG < this.gScore[neighborIndex]) {
                        this.parent[neighborIndex] = currentIndex;
                        this.gScore[neighborIndex] = tentativeG;
                        this.fScore[neighborIndex] = tentativeG + 
                            this.heuristicDistance(neighborX, neighborY, end[0], end[1], rightAngle, optimalResult);
                        
                        // 添加到开放列表（如果不存在）
                        if (!this.inOpenList[neighborIndex]) {
                            // 触发 render 回调：新节点加入开放列表
                            if (hasRender && this.grid.set) {
                                // 同步邻居节点的 g/h/f + parent（用于演示显示）
                                const nObj = this.gridData && this.gridData[neighborY] ? this.gridData[neighborY][neighborX] : null;
                                if (nObj) {
                                    const g = this.gScore[neighborIndex];
                                    const f = this.fScore[neighborIndex];
                                    nObj.g = g;
                                    nObj.f = f;
                                    nObj.h = f - g;
                                    nObj.parent = [currentX, currentY];
                                }
                                this.grid.set([neighborX, neighborY], 'type', 'open');
                            }
                            openHeap.push(neighborIndex);
                            this.inOpenList[neighborIndex] = 1;
                        } else {
                            // 触发 render 回调：更新节点
                            if (hasRender && this.grid.set) {
                                // 同步邻居节点的 g/h/f + parent（用于演示显示）
                                const nObj = this.gridData && this.gridData[neighborY] ? this.gridData[neighborY][neighborX] : null;
                                if (nObj) {
                                    const g = this.gScore[neighborIndex];
                                    const f = this.fScore[neighborIndex];
                                    nObj.g = g;
                                    nObj.f = f;
                                    nObj.h = f - g;
                                    nObj.parent = [currentX, currentY];
                                }
                                this.grid.set([neighborX, neighborY], 'type', 'update');
                            }
                            // 如果已在开放列表中，更新堆位置
                            openHeap.update(neighborIndex);
                        }
                    }
                }
            }
            
            return null;
        }
        
        reconstructPathFromIndex(endIndex, start, end) {
            if (this.useMemoryEfficientMode) {
                return this.memoryEfficientImpl.reconstructPath(endIndex, start);
            }
            
            const path = [];
            let currentIndex = endIndex;
            
            while (currentIndex !== -1) {
                const x = currentIndex % this.width;
                const y = Math.floor(currentIndex / this.width);
                path.push([x, y]);
                currentIndex = this.parent[currentIndex];
            }
            
            return path.reverse();
        }
        
        heuristicDistance(x1, y1, x2, y2, rightAngle, optimalResult) {
            const dx = Math.abs(x1 - x2);
            const dy = Math.abs(y1 - y2);
            if (rightAngle) return (dx + dy) * 10;
            const maxD = Math.max(dx, dy);
            const minD = dx + dy - maxD;
            if (!optimalResult) return maxD * 10;
            return 14 * minD + 10 * (maxD - minD);
        }
        
        // 兼容性方法
        getBackPath(xy) {
            if (this.useMemoryEfficientMode) {
                return this.memoryEfficientImpl.getBackPath(xy);
            }
            
            const index = xy[1] * this.width + xy[0];
            return this.reconstructPathFromIndex(index, [0, 0], xy);
        }
        
        h(start, end) {
            return this.heuristicDistance(start[0], start[1], end[0], end[1], false, true);
        }
        
        // 获取内存使用情况
        getMemoryUsage() {
            if (this.useMemoryEfficientMode) {
                return this.memoryEfficientImpl.getMemoryUsage();
            }
            
            return {
                closedList: this.closedList.length,
                inOpenList: this.inOpenList.length,
                gScore: this.gScore.length * 4,
                fScore: this.fScore.length * 4,
                parent: this.parent.length * 4,
                total: (this.gScore.length + this.fScore.length + this.parent.length) * 4 + 
                       this.closedList.length + this.inOpenList.length
            };
        }
    }

    // WebAssembly A*实现（兼容内存高效Grid）+ 预热优化
    class WasmAstar {
        constructor(grid) {
            this.grid = grid;
            this.wasmModule = null;
            this.wasmGrid = null;
            this.initialized = false;
            this.fallback = new UltraAstar(grid);
            
            // 兼容新旧Grid接口
            this.useMemoryEfficientGrid = grid.useMemoryEfficientMode || false;
            
            // 🚀 WebAssembly 优化配置
            this.initStartTime = getPerformanceNow();
            this.syncStrategy = 'auto'; // auto, batch, coords, individual
            this.enablePrewarm = true;  // 预热搜索
            
            // 异步初始化WebAssembly
            this.initPromise = this.initWasm();
        }
        
        async initWasm() {
            try {
                if (typeof WebAssembly === 'undefined') {
                    return false;
                }
                
                // 动态导入Rust生成的WebAssembly模块
                let wasmModule;
                
                if (isNode) {
                    // Node.js环境 - 简化的WebAssembly加载
                    try {
                        // 直接导入根目录的 wasm.js
                        wasmModule = await import('./wasm.js');
                        
                        // 检查是否需要初始化
                        if (wasmModule.default && typeof wasmModule.default === 'function') {
                            // 在Node.js中，需要手动加载wasm文件
                            const { readFileSync } = await import('fs');
                            const { fileURLToPath } = await import('url');
                            const { dirname, join } = await import('path');

                            const __filename = fileURLToPath(import.meta.url);
                            const __dirname = dirname(__filename);
                            const wasmPath = join(__dirname, 'astar.wasm');

                            const wasmBytes = readFileSync(wasmPath);
                            // 使用同步初始化API
                            wasmModule.initSync({ module: wasmBytes });
                        }
                    } catch (e) {
                        return false;
                    }
                } else if (isBrowser) {
                    // 浏览器环境 - 使用动态import
                    try {
                        wasmModule = await import('./wasm.js');
                        
                        // 检查是否需要初始化 - 使用新的ES模块初始化方式
                        if (wasmModule.default && typeof wasmModule.default === 'function') {
                            // 浏览器中使用默认初始化
                            await wasmModule.default();
                        }
                    } catch (e) {
                        // 静默失败，不显示警告
                        return false;
                    }
                }
                
                if (wasmModule && wasmModule.AstarGrid) {
                    // 创建WASM网格实例
                    this.wasmGrid = new wasmModule.AstarGrid(this.grid.col, this.grid.row);
                    
                    // 超智能障碍物同步 - 针对超大地图优化
                    const totalCells = this.grid.col * this.grid.row;
                    const isLargeGrid = totalCells > 10000000; // 大于1000万节点
                    const isVeryLargeGrid = totalCells > 100000000; // 大于1亿节点
                    
                    let shouldSyncObstacles = true;
                    let obstacleCount = 0;
                    let obstacleDensity = 0;
                    
                    // 快速障碍物密度评估
                    if (isLargeGrid) {
                        if (this.useMemoryEfficientGrid) {
                            // 内存高效模式：采样统计
                            const sampleSize = isVeryLargeGrid ? 1000 : 10000; // 超大地图用更少采样
                            const step = Math.max(1, Math.floor(Math.sqrt(totalCells / sampleSize)));
                            
                            for (let y = 0; y < this.grid.row; y += step) {
                                for (let x = 0; x < this.grid.col; x += step) {
                                    if (!this.grid.isWalkableAt(x, y)) {
                                        obstacleCount++;
                                    }
                                }
                            }
                            // 估算总障碍物数量
                            obstacleCount *= (step * step);
                        } else {
                            // 传统模式：使用Grid统计（如果可用）
                            const stats = this.grid.getStats ? this.grid.getStats() : null;
                            if (stats) {
                                obstacleCount = stats.obstacles;
                            } else {
                                // 快速采样
                                const sampleSize = Math.min(10000, totalCells / 100);
                                for (let i = 0; i < sampleSize; i++) {
                                    const x = Math.floor(Math.random() * this.grid.col);
                                    const y = Math.floor(Math.random() * this.grid.row);
                                    if (this.grid.grid[y][x].value >= 1) {
                                        obstacleCount++;
                                    }
                                }
                                obstacleCount = (obstacleCount / sampleSize) * totalCells;
                            }
                        }
                        
                        obstacleDensity = obstacleCount / totalCells;
                        
                        // 超大地图且障碍物密度极低时跳过同步
                        if (isVeryLargeGrid && obstacleDensity < 0.0001) {
                            shouldSyncObstacles = false;
                            console.warn(`⚠️  超大地图 (${this.grid.col}x${this.grid.row}) 障碍物密度极低 (${(obstacleDensity*100).toFixed(4)}%)，跳过障碍物同步以提升性能`);
                        }
                        // 大地图且障碍物密度很低时也跳过
                        else if (isLargeGrid && obstacleDensity < 0.001) {
                            shouldSyncObstacles = false;
                            console.warn(`⚠️  大地图 (${this.grid.col}x${this.grid.row}) 障碍物密度很低 (${(obstacleDensity*100).toFixed(3)}%)，跳过障碍物同步以提升性能`);
                        }
                    }
                    
                    // 🚀 同步障碍物数据 - 使用最优化的批量方法
                    if (shouldSyncObstacles) {
                        console.log(`🔄 WebAssembly 开始同步障碍物...`);
                        
                        // 🎯 优化策略1：优先使用批量坐标方法（最高效）
                        if (this.wasmGrid.setObstaclesFromCoords) {
                            const obstacleCoords = [];
                            const maxObstacles = isVeryLargeGrid ? 1000000 : 10000000; // 限制最大障碍物数量
                            
                            if (this.useMemoryEfficientGrid) {
                                // 内存高效模式：批量收集障碍物坐标
                                let count = 0;
                                for (let y = 0; y < this.grid.row && count < maxObstacles; y++) {
                                    for (let x = 0; x < this.grid.col && count < maxObstacles; x++) {
                                        if (!this.grid.isWalkableAt(x, y)) {
                                            obstacleCoords.push(x, y);
                                            count++;
                                        }
                                    }
                                }
                            } else {
                                // 传统模式：批量收集障碍物坐标
                                let count = 0;
                                for (let y = 0; y < this.grid.row && count < maxObstacles; y++) {
                                    for (let x = 0; x < this.grid.col && count < maxObstacles; x++) {
                                        if (this.grid.grid[y][x].value >= 1) {
                                            obstacleCoords.push(x, y);
                                            count++;
                                        }
                                    }
                                }
                            }
                            
                            // 🎯 单次批量设置 - 大幅减少跨边界调用
                            if (obstacleCoords.length > 0) {
                                this.wasmGrid.setObstaclesFromCoords(new Int32Array(obstacleCoords));
                                console.log(`✅ WebAssembly 批量同步 ${obstacleCoords.length/2} 个障碍物`);
                            } else {
                                console.log(`✅ WebAssembly 无障碍物需要同步`);
                            }
                        }
                        // 🚀 优化策略2：使用位图批量传输（如果可用）
                        else if (this.wasmGrid.setObstaclesBatch && this.useMemoryEfficientGrid && this.grid.getObstacleBitmap) {
                            const bitmap = this.grid.getObstacleBitmap();
                            this.wasmGrid.setObstaclesBatch(bitmap);
                            console.log(`✅ WebAssembly 位图同步 ${bitmap.length} 字节`);
                        }
                        // 🚀 优化策略3：创建位图并批量传输
                        else if (this.wasmGrid.setObstaclesBatch) {
                            const totalCells = this.grid.col * this.grid.row;
                            const bitmapSize = Math.ceil(totalCells / 8);
                            const bitmap = new Uint8Array(bitmapSize);
                            
                            // 构建位图
                            if (this.useMemoryEfficientGrid) {
                                for (let y = 0; y < this.grid.row; y++) {
                                    for (let x = 0; x < this.grid.col; x++) {
                                        if (!this.grid.isWalkableAt(x, y)) {
                                            const index = y * this.grid.col + x;
                                            const byteIndex = Math.floor(index / 8);
                                            const bitIndex = index % 8;
                                            bitmap[byteIndex] |= (1 << bitIndex);
                                        }
                                    }
                                }
                            } else {
                                for (let y = 0; y < this.grid.row; y++) {
                                    for (let x = 0; x < this.grid.col; x++) {
                                        if (this.grid.grid[y][x].value >= 1) {
                                            const index = y * this.grid.col + x;
                                            const byteIndex = Math.floor(index / 8);
                                            const bitIndex = index % 8;
                                            bitmap[byteIndex] |= (1 << bitIndex);
                                        }
                                    }
                                }
                            }
                            
                            this.wasmGrid.setObstaclesBatch(bitmap);
                            console.log(`✅ WebAssembly 自建位图同步 ${bitmap.length} 字节`);
                        }
                        // 🐌 回退策略：逐个设置（仅对小地图）
                        else if (!isLargeGrid) {
                            console.warn(`⚠️  WebAssembly 使用低效的逐个同步模式`);
                            let obstacleCount = 0;
                            if (this.useMemoryEfficientGrid) {
                                for (let y = 0; y < this.grid.row; y++) {
                                    for (let x = 0; x < this.grid.col; x++) {
                                        const isObstacle = !this.grid.isWalkableAt(x, y);
                                        if (isObstacle) {
                                            this.wasmGrid.setObstacle(x, y, isObstacle);
                                            obstacleCount++;
                                        }
                                    }
                                }
                            } else {
                                for (let y = 0; y < this.grid.row; y++) {
                                    for (let x = 0; x < this.grid.col; x++) {
                                        const isObstacle = this.grid.grid[y][x].value >= 1;
                                        if (isObstacle) {
                                            this.wasmGrid.setObstacle(x, y, isObstacle);
                                            obstacleCount++;
                                        }
                                    }
                                }
                            }
                            console.log(`✅ WebAssembly 逐个同步 ${obstacleCount} 个障碍物`);
                        }
                    } else {
                        console.log(`⚡ WebAssembly 跳过障碍物同步以提升性能`);
                    }
                    
                    this.wasmModule = wasmModule;
                    this.initialized = true;
                    
                    // 🚀 WebAssembly 预热 - 执行小规模搜索以优化JIT
                    if (this.enablePrewarm && this.wasmGrid) {
                        try {
                            // 预热搜索：小范围路径查找
                            const prewarmSize = Math.min(10, Math.floor(this.grid.col / 10), Math.floor(this.grid.row / 10));
                            if (prewarmSize >= 2) {
                                this.wasmGrid.findPath(0, 0, prewarmSize, prewarmSize);
                                console.log(`🔥 WebAssembly 预热完成 (${prewarmSize}x${prewarmSize})`);
                            }
                        } catch (prewarmError) {
                            // 预热失败不影响正常使用
                        }
                    }
                    
                    const initTime = getPerformanceNow() - this.initStartTime;
                    console.log(`✅ WebAssembly 初始化成功 (${initTime.toFixed(1)}ms)`);
                    
                    return true;
                } else {
                    return false;
                }
                
            } catch (error) {
                // 🔍 详细的错误分析和处理
                const initTime = getPerformanceNow() - this.initStartTime;
                
                if (error.message && error.message.includes('fetch')) {
                    console.warn(`⚠️  WebAssembly 网络加载失败 (${initTime.toFixed(1)}ms): ${error.message}`);
                } else if (error.message && error.message.includes('ENOENT')) {
                    console.warn(`⚠️  WebAssembly 文件未找到 (${initTime.toFixed(1)}ms): 请检查 wasm 文件路径`);
                } else if (error.message && error.message.includes('WebAssembly')) {
                    console.warn(`⚠️  WebAssembly 不支持 (${initTime.toFixed(1)}ms): 环境不兼容`);
                } else {
                    // 静默处理其他错误，避免干扰用户
                }
                
                return false;
            }
        }
        
        async search(start, end, options = {}) {
            // 等待初始化完成
            await this.initPromise;
            
            if (this.initialized && this.wasmGrid) {
                try {
                    // 🚀 使用Rust WebAssembly实现
                    const optimalResult = options.optimalResult !== false; // default true
                    const searchStart = getPerformanceNow();
                    const pathData = this.wasmGrid.findPath(start[0], start[1], end[0], end[1], optimalResult);
                    const searchTime = getPerformanceNow() - searchStart;
                    
                    if (pathData && pathData.length > 0) {
                        // 将Int32Array转换为路径数组
                        const path = [];
                        for (let i = 0; i < pathData.length; i += 2) {
                            path.push([pathData[i], pathData[i + 1]]);
                        }
                        
                        // 性能监控
                        if (searchTime > 100) { // 超过100ms记录
                            console.log(`🐌 WebAssembly 搜索较慢: ${searchTime.toFixed(1)}ms (${path.length} 步)`);
                        }
                        
                        return path;
                    }
                    
                    return null;
                    
                } catch (error) {
                    // WebAssembly 搜索失败，降级到 fallback
                    console.warn(`⚠️  WebAssembly 搜索失败，降级到 Ultra A*: ${error.message}`);
                    return this.fallback.search(start, end, options);
                }
            } else {
                // 使用fallback实现
                return this.fallback.search(start, end, options);
            }
        }
        
        // 兼容性方法
        getBackPath(xy) {
            if (this.initialized) {
                // WebAssembly版本暂不支持此方法，使用fallback
                return this.fallback.getBackPath(xy);
            }
            return this.fallback.getBackPath(xy);
        }
        
        h(start, end) {
            return this.fallback.h(start, end);
        }
        
        // 内存使用统计
        getMemoryUsage() {
            if (this.initialized && this.wasmGrid) {
                return {
                    wasmGrid: 1024, // 估算WASM内存使用
                    fallback: 0,
                    total: 1024,
                    mode: 'WebAssembly with ' + (this.useMemoryEfficientGrid ? 'Memory Efficient Grid' : 'Standard Grid')
                };
            } else {
                const fallbackMemory = this.fallback.getMemoryUsage ? this.fallback.getMemoryUsage() : { total: 0 };
                return {
                    wasmGrid: 0,
                    fallback: fallbackMemory.total,
                    total: fallbackMemory.total,
                    mode: 'Fallback to Ultra A*'
                };
            }
        }
        
        // 获取当前实现状态
        getCurrentImplementationStatus() {
            if (this.initialized && this.wasmGrid) {
                return {
                    name: 'WebAssembly A*',
                    usingWasm: true,
                    fallbackUsed: false
                };
            } else {
                return {
                    name: 'Ultra A* (WebAssembly Fallback)',
                    usingWasm: false,
                    fallbackUsed: true,
                    initStatus: this.initialized,
                    wasmGridStatus: !!this.wasmGrid
                };
            }
        }
        
        destroy() {
            if (this.initialized && this.wasmGrid) {
                this.wasmGrid.free();
                this.wasmGrid = null;
                this.initialized = false;
            }
        }
    }

    // 环境分析器
    class EnvironmentAnalyzer {
        static analyze() {
            return {
                platform: this.detectPlatform(),
                memory: this.estimateMemory(),
                cores: this.getCPUCores(),
                jsEngine: this.detectJSEngine(),
                webAssemblySupport: typeof WebAssembly !== 'undefined',
                performanceAPI: typeof performance !== 'undefined',
                isNode,
                isBrowser
            };
        }
        
        static detectPlatform() {
            if (isNode) {
                return `Node.js ${process.platform}`;
            } else if (isBrowser) {
                return `Browser ${navigator.platform || 'Unknown'}`;
            } else {
                return 'Unknown';
            }
        }
        
        static estimateMemory() {
            if (isBrowser && performance.memory) {
                return Math.floor(performance.memory.jsHeapSizeLimit / 1024 / 1024);
            }
            
            if (isNode && process.memoryUsage) {
                const usage = process.memoryUsage();
                return Math.floor((usage.heapTotal + usage.external) / 1024 / 1024);
            }
            
            return 2048; // 默认2GB
        }
        
        static getCPUCores() {
            if (isBrowser && navigator.hardwareConcurrency) {
                return navigator.hardwareConcurrency;
            }
            
            if (isNode) {
                try {
                    // 在 ES Module 中，需要使用动态导入，但这里我们使用同步方式
                    // 为了避免 async/await 问题，我们返回默认值
                    return 4; // 默认值，实际值需要异步获取
                } catch (e) {
                    // 忽略错误
                }
            }
            
            return 4; // 默认4核
        }
        
        static detectJSEngine() {
            if (isNode && process.versions && process.versions.v8) {
                return `V8 ${process.versions.v8}`;
            }
            
            if (isBrowser && navigator.userAgent) {
                const userAgent = navigator.userAgent;
                if (userAgent.includes('Chrome')) return 'V8 (Chrome)';
                if (userAgent.includes('Firefox')) return 'SpiderMonkey (Firefox)';
                if (userAgent.includes('Safari')) return 'JavaScriptCore (Safari)';
                if (userAgent.includes('Edge')) return 'Chakra (Edge)';
            }
            
            return 'Unknown';
        }
    }

    // 智能A*算法 - 主类（移除 WebAssembly 支持，专注 JavaScript 性能）
    class SmartAstar {
        constructor(grid, options = {}) {
            this.grid = grid;
            this.gridSize = grid.col * grid.row;
            this.options = this.normalizeOptions(options);
            
            // 环境分析
            this.environment = EnvironmentAnalyzer.analyze();
            
            // 性能历史
            this.performanceHistory = new Map();
            
            // 对于超大地图，自动构建四叉树
            if (this.grid.useQuadTree && !this.grid.quadTreeBuilt) {
                // 延迟构建，避免阻塞初始化
                if (this.options.buildQuadTree !== false) {
                    setTimeout(() => {
                        this.grid.buildQuadTree();
                    }, 0);
                }
            }
            
            // 选择最优实现
            this.selectOptimalImplementation();
            
            if (this.options.debug) {
                console.log(`🚀 Smart A* 初始化完成，选择: ${this.currentName}`);
                console.log(`📱 环境: ${this.environment.platform}`);
                console.log(`💾 内存: ${this.environment.memory}MB`);
                if (this.grid.useQuadTree) {
                    console.log(`🌳 四叉树优化: ${this.grid.quadTreeBuilt ? '已构建' : '构建中...'}`);
                }
            }
        }
        
        normalizeOptions(options) {
            return {
                strategy: options.strategy || 'auto',
                appType: options.appType || 'web',
                performance: options.performance || 'medium',
                memory: options.memory || 'moderate',
                debug: options.debug || false,
                prefer: options.prefer || null,
                avoid: options.avoid || null,
                ...options
            };
        }
        
        selectOptimalImplementation() {
            const strategy = this.options.strategy;
            let selectedImpl = null;
            let selectedName = null;
            
            if (strategy === 'auto') {
                // 基于实际性能测试数据优化的智能选择算法（针对WebAssembly大地图性能问题优化）
                const gridSize = this.gridSize;
                
                if (gridSize <= 2500) {
                    // 微型地图 (≤50x50) - Master A* 表现最佳
                    selectedImpl = MasterAstar;
                    selectedName = 'Master A*';
                } else if (gridSize <= 10000) {
                    // 小地图 (50x50-100x100) - Master A* 最优
                    selectedImpl = MasterAstar;
                    selectedName = 'Master A*';
                 } else if (gridSize <= 250000) {
                     // 中等地图 (100x100-500x500) - WebAssembly A* 最优 (优化后)
                     if (this.environment.webAssemblySupport && this.options.avoid !== 'wasm') {
                         selectedImpl = WasmAstar;
                         selectedName = 'WebAssembly A*';
                     } else {
                         selectedImpl = UltraAstar;
                         selectedName = 'Ultra A*';
                     }
                 } else if (gridSize <= 1000000) {
                     // 大地图 (500x500-1000x1000) - Ultra A* 更稳定
                     selectedImpl = UltraAstar;
                     selectedName = 'Ultra A* (Memory Optimized)';
                } else if (gridSize <= 9000000) {
                    // 超大地图 (1000x1000-3000x3000) - WebAssembly和Ultra性能接近，但Ultra更稳定
                    selectedImpl = UltraAstar;
                    selectedName = 'Ultra A*';
                } else {
                    // 极限地图 (≥3000x3000) - Ultra A* 专用，WebAssembly在大地图上性能下降严重
                    selectedImpl = UltraAstar;
                    selectedName = 'Ultra A*';
                    
                    if (this.options.debug && gridSize > 100000000) {
                        console.warn(`⚠️  超极限地图 (${Math.sqrt(gridSize).toFixed(0)}x${Math.sqrt(gridSize).toFixed(0)}) 建议使用内存高效模式`);
                    }
                }
            } else if (strategy === 'performance') {
                // 性能优先
                if (this.environment.webAssemblySupport && this.options.avoid !== 'wasm') {
                    selectedImpl = WasmAstar;
                    selectedName = 'WebAssembly A*';
                } else {
                    selectedImpl = MasterAstar;
                    selectedName = 'Master A*';
                }
            } else if (strategy === 'memory') {
                // 内存优先
                selectedImpl = MasterAstar;
                selectedName = 'Master A*';
            } else if (strategy === 'compatibility') {
                // 兼容性优先
                selectedImpl = UltraAstar;
                selectedName = 'Ultra A*';
            } else {
                // 默认选择
                selectedImpl = UltraAstar;
                selectedName = 'Ultra A*';
            }
            
            // 应用用户偏好
            if (this.options.prefer) {
                const preferMap = {
                    'wasm': { impl: WasmAstar, name: 'WebAssembly A*' },
                    'master': { impl: MasterAstar, name: 'Master A*' },
                    'ultra': { impl: UltraAstar, name: 'Ultra A*' }
                };
                
                if (preferMap[this.options.prefer]) {
                    selectedImpl = preferMap[this.options.prefer].impl;
                    selectedName = preferMap[this.options.prefer].name;
                }
            }
            
            this.currentImplementation = new selectedImpl(this.grid);
            this.currentName = selectedName;
        }
        
        async search(start, end, options = {}) {
            // 输入验证（在调用实现之前）
            if (!Array.isArray(start) || start.length < 2 || 
                !Array.isArray(end) || end.length < 2) {
                throw new Error('起点和终点必须是包含至少2个元素的数组 [x, y]');
            }
            
            const startX = Math.floor(start[0]);
            const startY = Math.floor(start[1]);
            const endX = Math.floor(end[0]);
            const endY = Math.floor(end[1]);
            
            // 边界检查
            if (startX < 0 || startX >= this.grid.col || startY < 0 || startY >= this.grid.row) {
                throw new Error(`起点坐标 [${startX}, ${startY}] 超出网格范围 [0-${this.grid.col-1}, 0-${this.grid.row-1}]`);
            }
            
            if (endX < 0 || endX >= this.grid.col || endY < 0 || endY >= this.grid.row) {
                throw new Error(`终点坐标 [${endX}, ${endY}] 超出网格范围 [0-${this.grid.col-1}, 0-${this.grid.row-1}]`);
            }
            
            const searchStart = this.getPerformanceNow();
            
            try {
                let result;
                
                if (this.currentImplementation.search.constructor.name === 'AsyncFunction') {
                    result = await this.currentImplementation.search(start, end, options);
                } else {
                    result = this.currentImplementation.search(start, end, options);
                }
                
                const searchEnd = this.getPerformanceNow();
                const searchTime = searchEnd - searchStart;
                
                // 记录性能
                this.recordPerformance(searchTime, result ? result.length : 0);
                
                return result;
                
            } catch (error) {
                if (this.options.debug) {
                    console.error(`❌ ${this.currentName} 搜索失败:`, error.message);
                }
                throw error;
            }
        }
        
        getPerformanceNow() {
            return getPerformanceNow();
        }
        
        recordPerformance(searchTime, pathLength) {
            if (!this.performanceHistory.has(this.currentName)) {
                this.performanceHistory.set(this.currentName, []);
            }
            
            const history = this.performanceHistory.get(this.currentName);
            history.push({
                time: searchTime,
                pathLength,
                timestamp: Date.now(),
                gridSize: this.gridSize
            });
            
            // 保持最近50次记录
            if (history.length > 50) {
                history.shift();
            }
        }
        
        // 获取当前实现信息
        getCurrentImplementation() {
            return {
                name: this.currentName,
                gridSize: this.gridSize,
                environment: this.environment
            };
        }
        
        // 获取性能统计
        getPerformanceStats() {
            const stats = {};
            
            for (const [implName, history] of this.performanceHistory) {
                if (history.length > 0) {
                    const times = history.map(record => record.time);
                    stats[implName] = {
                        count: history.length,
                        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
                        minTime: Math.min(...times),
                        maxTime: Math.max(...times)
                    };
                }
            }
            
            return stats;
        }
        
        // 兼容性方法
        getBackPath(xy) {
            return this.currentImplementation ? 
                   this.currentImplementation.getBackPath(xy) : [];
        }
        
        h(start, end) {
            return this.currentImplementation ? 
                   this.currentImplementation.h(start, end) : 0;
        }
        
        destroy() {
            if (this.currentImplementation && this.currentImplementation.destroy) {
                this.currentImplementation.destroy();
            }
        }
    }

    // 导出SmartAstar作为默认的Astar类
    export default SmartAstar;