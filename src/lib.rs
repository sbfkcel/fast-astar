use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// ============================================================================
// 启发式函数
// ============================================================================

#[inline(always)]
fn heuristic_octile(x1: i32, y1: i32, x2: i32, y2: i32) -> u32 {
    let dx = (x2 - x1).abs() as u32;
    let dy = (y2 - y1).abs() as u32;
    let (min_d, max_d) = if dx < dy { (dx, dy) } else { (dy, dx) };
    // Octile: min_d * (√2 - 1) + max_d ≈ min_d * 0.414 + max_d
    // 乘以 1000 得到整数代价：min_d * 414 + max_d * 1000
    min_d * 414 + max_d * 1000
}

#[inline(always)]
fn heuristic_chebyshev(x1: i32, y1: i32, x2: i32, y2: i32) -> u32 {
    let dx = (x2 - x1).abs() as u32;
    let dy = (y2 - y1).abs() as u32;
    if dx > dy { dx * 1000 } else { dy * 1000 }
}

// ============================================================================
// 简单最小堆
// ============================================================================

#[derive(Clone, Copy)]
struct HeapNode {
    idx: u32,
    f: u32,
}

struct MinHeap {
    data: Vec<HeapNode>,
}

impl MinHeap {
    fn with_capacity(cap: usize) -> Self {
        MinHeap {
            data: Vec::with_capacity(cap),
        }
    }

    #[inline(always)]
    fn clear(&mut self) {
        self.data.clear();
    }

    #[inline(always)]
    fn push(&mut self, node: HeapNode) {
        self.data.push(node);
        let mut pos = self.data.len() - 1;
        while pos > 0 {
            let parent_pos = (pos - 1) >> 1;  // 位运算优化
            if self.data[pos].f >= self.data[parent_pos].f {
                break;
            }
            self.data.swap(pos, parent_pos);
            pos = parent_pos;
        }
    }

    #[inline(always)]
    fn pop(&mut self) -> Option<HeapNode> {
        if self.data.is_empty() {
            return None;
        }
        let result = self.data[0];
        let len = self.data.len();
        if len > 1 {
            self.data[0] = self.data[len - 1];
            self.data.pop();
            
            let mut pos = 0;
            let len = self.data.len();
            loop {
                let left = (pos << 1) + 1;  // 位运算优化
                if left >= len {
                    break;
                }
                let right = left + 1;
                let smallest = if right < len && self.data[right].f < self.data[left].f {
                    right
                } else {
                    left
                };
                if self.data[pos].f <= self.data[smallest].f {
                    break;
                }
                self.data.swap(pos, smallest);
                pos = smallest;
            }
        } else {
            self.data.pop();
        }
        Some(result)
    }
}

// ============================================================================
// A* 网格 - 使用版本号实现 O(1) 状态重置
// ============================================================================

#[wasm_bindgen]
pub struct AstarGrid {
    width: i32,
    height: i32,
    grid_size: usize,

    obstacles: Vec<u8>,
    
    // 版本号系统：避免 O(N) 的状态重置
    search_version: u32,
    node_version: Vec<u32>,  // 每个节点的版本号
    g_score: Vec<u32>,
    came_from: Vec<u32>,

    heap: MinHeap,
}

#[wasm_bindgen]
impl AstarGrid {
    #[wasm_bindgen(constructor)]
    pub fn new(width: i32, height: i32) -> AstarGrid {
        let grid_size = (width * height) as usize;
        let byte_size = (grid_size + 7) / 8;
        
        // 根据网格大小调整堆的初始容量
        let heap_cap = (grid_size / 10).max(4096).min(1_000_000);

        AstarGrid {
            width,
            height,
            grid_size,
            obstacles: vec![0; byte_size],
            search_version: 0,
            node_version: vec![0; grid_size],
            g_score: vec![u32::MAX; grid_size],
            came_from: vec![u32::MAX; grid_size],
            heap: MinHeap::with_capacity(heap_cap),
        }
    }

    // O(1) 状态重置 - 只需增加版本号
    #[inline(always)]
    fn reset_for_search(&mut self) {
        self.search_version = self.search_version.wrapping_add(1);
        // 如果版本号溢出回到 0，需要完全重置
        if self.search_version == 0 {
            self.node_version.fill(0);
            self.search_version = 1;
        }
        self.heap.clear();
    }
    
    // 标记节点为已访问，并初始化其状态
    #[inline(always)]
    fn visit_node(&mut self, idx: usize, g: u32, parent: u32) {
        self.node_version[idx] = self.search_version;
        self.g_score[idx] = g;
        self.came_from[idx] = parent;
    }
    
    // 获取节点的 g 值（如果未访问则返回 MAX）
    #[inline(always)]
    fn get_g(&self, idx: usize) -> u32 {
        if self.node_version[idx] == self.search_version {
            self.g_score[idx]
        } else {
            u32::MAX
        }
    }

    #[wasm_bindgen(js_name = setObstacle)]
    pub fn set_obstacle(&mut self, x: i32, y: i32, is_obstacle: bool) {
        if x < 0 || x >= self.width || y < 0 || y >= self.height {
            return;
        }
        let idx = (y * self.width + x) as usize;
        let byte_idx = idx / 8;
        let bit_idx = idx % 8;
        if is_obstacle {
            self.obstacles[byte_idx] |= 1u8 << bit_idx;
        } else {
            self.obstacles[byte_idx] &= !(1u8 << bit_idx);
        }
    }

    #[wasm_bindgen(js_name = setObstaclesBatch)]
    pub fn set_obstacles_batch(&mut self, obstacles_data: &[u8]) {
        let expected = (self.grid_size + 7) / 8;
        if obstacles_data.len() == expected {
            self.obstacles.copy_from_slice(obstacles_data);
        }
    }

    #[wasm_bindgen(js_name = setObstaclesFromCoords)]
    pub fn set_obstacles_from_coords(&mut self, coords: &[i32]) {
        self.obstacles.fill(0);
        let w = self.width;
        let h = self.height;
        let mut i = 0;
        while i + 1 < coords.len() {
            let x = coords[i];
            let y = coords[i + 1];
            if x >= 0 && x < w && y >= 0 && y < h {
                let idx = (y * w + x) as usize;
                let byte_idx = idx / 8;
                let bit_idx = idx % 8;
                self.obstacles[byte_idx] |= 1u8 << bit_idx;
            }
            i += 2;
        }
    }

    #[inline(always)]
    fn is_obstacle_idx(&self, idx: usize) -> bool {
        let byte_idx = idx / 8;
        let bit_idx = idx % 8;
        (self.obstacles[byte_idx] & (1u8 << bit_idx)) != 0
    }

    #[wasm_bindgen(js_name = isWalkable)]
    pub fn is_walkable(&self, x: i32, y: i32) -> bool {
        if x < 0 || x >= self.width || y < 0 || y >= self.height {
            return false;
        }
        let idx = (y * self.width + x) as usize;
        !self.is_obstacle_idx(idx)
    }

    #[wasm_bindgen(js_name = clearObstacles)]
    pub fn clear_obstacles(&mut self) {
        self.obstacles.fill(0);
    }

    #[wasm_bindgen(js_name = getObstacleCount)]
    pub fn get_obstacle_count(&self) -> usize {
        self.obstacles.iter().map(|&b| b.count_ones() as usize).sum()
    }

    #[wasm_bindgen(js_name = getWidth)]
    pub fn get_width(&self) -> i32 {
        self.width
    }

    #[wasm_bindgen(js_name = getHeight)]
    pub fn get_height(&self) -> i32 {
        self.height
    }

    #[wasm_bindgen(js_name = findPath)]
    pub fn find_path(
        &mut self,
        start_x: i32,
        start_y: i32,
        end_x: i32,
        end_y: i32,
        optimal_result: bool,
    ) -> Vec<i32> {
        // 边界检查
        if start_x < 0 || start_x >= self.width || start_y < 0 || start_y >= self.height {
            return Vec::new();
        }
        if end_x < 0 || end_x >= self.width || end_y < 0 || end_y >= self.height {
            return Vec::new();
        }

        let start_idx = (start_y * self.width + start_x) as usize;
        let end_idx = (end_y * self.width + end_x) as usize;

        // 障碍物检查
        if self.is_obstacle_idx(start_idx) || self.is_obstacle_idx(end_idx) {
            return Vec::new();
        }

        // 起点即终点
        if start_idx == end_idx {
            return vec![start_x, start_y];
        }

        // 相邻格子 - 快速路径
        let dx = (end_x - start_x).abs();
        let dy = (end_y - start_y).abs();
        if dx <= 1 && dy <= 1 {
            return vec![start_x, start_y, end_x, end_y];
        }

        // O(1) 状态重置
        self.reset_for_search();

        let width = self.width;
        let height = self.height;
        let width_usize = width as usize;
        let version = self.search_version;

        // 初始化起点
        self.visit_node(start_idx, 0, u32::MAX);

        let h0 = if optimal_result {
            heuristic_octile(start_x, start_y, end_x, end_y)
        } else {
            heuristic_chebyshev(start_x, start_y, end_x, end_y)
        };
        self.heap.push(HeapNode { idx: start_idx as u32, f: h0 });

        // 8方向（预计算）
        const DIRECTIONS: [(i32, i32, bool); 8] = [
            (0, -1, false), (1, 0, false), (0, 1, false), (-1, 0, false),
            (1, -1, true), (1, 1, true), (-1, 1, true), (-1, -1, true),
        ];

        let (straight_cost, diag_cost): (u32, u32) = if optimal_result {
            (1000, 1414)
        } else {
            (1000, 1000)
        };

        // 使用闭集版本号（奇数版本表示已关闭）
        // 避免额外的数组：使用 node_version 的高位作为 closed 标记
        // node_version == search_version: 已访问但未关闭
        // node_version == search_version + 1: 已关闭
        let closed_version = version.wrapping_add(1);

        while let Some(current) = self.heap.pop() {
            let current_idx = current.idx as usize;

            // 跳过已关闭的节点（堆中可能有重复）
            if self.node_version[current_idx] == closed_version {
                continue;
            }
            // 标记为已关闭
            self.node_version[current_idx] = closed_version;

            // 到达终点
            if current_idx == end_idx {
                // 重建路径
                let mut coords: Vec<(i32, i32)> = Vec::with_capacity(256);
                let mut cur = end_idx;
                loop {
                    let x = (cur % width_usize) as i32;
                    let y = (cur / width_usize) as i32;
                    coords.push((x, y));
                    let parent = self.came_from[cur];
                    if parent == u32::MAX || parent as usize == cur {
                        break;
                    }
                    cur = parent as usize;
                }
                coords.reverse();
                
                // 展开为 [x0, y0, x1, y1, ...]
                let mut path = Vec::with_capacity(coords.len() * 2);
                for (x, y) in coords {
                    path.push(x);
                    path.push(y);
                }
                return path;
            }

            let current_x = (current_idx % width_usize) as i32;
            let current_y = (current_idx / width_usize) as i32;
            let current_g = self.g_score[current_idx];

            for &(ddx, ddy, is_diag) in &DIRECTIONS {
                let nx = current_x + ddx;
                let ny = current_y + ddy;

                // 边界检查
                if nx < 0 || nx >= width || ny < 0 || ny >= height {
                    continue;
                }

                let neighbor_idx = (ny * width + nx) as usize;

                // 跳过障碍物和已关闭的节点
                if self.is_obstacle_idx(neighbor_idx) {
                    continue;
                }
                if self.node_version[neighbor_idx] == closed_version {
                    continue;
                }

                let move_cost = if is_diag { diag_cost } else { straight_cost };
                let tentative_g = current_g.saturating_add(move_cost);

                // 检查是否是更好的路径
                let neighbor_g = self.get_g(neighbor_idx);
                if tentative_g < neighbor_g {
                    // 更新节点状态
                    self.g_score[neighbor_idx] = tentative_g;
                    self.came_from[neighbor_idx] = current_idx as u32;
                    self.node_version[neighbor_idx] = version;  // 标记为已访问

                    let h = if optimal_result {
                        heuristic_octile(nx, ny, end_x, end_y)
                    } else {
                        heuristic_chebyshev(nx, ny, end_x, end_y)
                    };
                    let f = tentative_g.saturating_add(h);

                    self.heap.push(HeapNode { idx: neighbor_idx as u32, f });
                }
            }
        }

        Vec::new()
    }

    #[wasm_bindgen(js_name = batchFindPaths)]
    pub fn batch_find_paths(&mut self, requests: &[i32]) -> Vec<i32> {
        let mut results = Vec::with_capacity(requests.len() / 2);
        let mut i = 0;
        while i + 3 < requests.len() {
            let path = self.find_path(
                requests[i],
                requests[i + 1],
                requests[i + 2],
                requests[i + 3],
                true,
            );
            results.push((path.len() / 2) as i32);
            results.extend(path);
            i += 4;
        }
        results
    }

}

// ============================================================================
// 稀疏 A* 网格 - 用于超大地图 (50000×50000 以上)
// 使用 HashMap 替代固定数组，只存储访问过的节点
// ============================================================================

#[derive(Clone, Copy)]
struct SparseNode {
    g: u32,
    parent: u64,
    closed: bool,
}

#[wasm_bindgen]
pub struct AstarGridSparse {
    width: i64,
    height: i64,
    obstacles: HashMap<u64, bool>,  // 稀疏障碍物存储
    nodes: HashMap<u64, SparseNode>,
    heap: Vec<(u64, u32)>,  // (idx, f)
}

#[wasm_bindgen]
impl AstarGridSparse {
    #[wasm_bindgen(constructor)]
    pub fn new(width: i64, height: i64) -> AstarGridSparse {
        let estimated_nodes = ((width + height) as usize * 4).min(10_000_000);
        AstarGridSparse {
            width,
            height,
            obstacles: HashMap::with_capacity(estimated_nodes / 10),
            nodes: HashMap::with_capacity(estimated_nodes),
            heap: Vec::with_capacity(estimated_nodes),
        }
    }

    #[wasm_bindgen(js_name = setObstacle)]
    pub fn set_obstacle(&mut self, x: i64, y: i64, is_obstacle: bool) {
        if x < 0 || x >= self.width || y < 0 || y >= self.height {
            return;
        }
        let idx = (y as u64) * (self.width as u64) + (x as u64);
        if is_obstacle {
            self.obstacles.insert(idx, true);
        } else {
            self.obstacles.remove(&idx);
        }
    }

    #[wasm_bindgen(js_name = setObstaclesFromCoords)]
    pub fn set_obstacles_from_coords(&mut self, coords: &[i32]) {
        self.obstacles.clear();
        let w = self.width;
        let h = self.height;
        let mut i = 0;
        while i + 1 < coords.len() {
            let x = coords[i] as i64;
            let y = coords[i + 1] as i64;
            if x >= 0 && x < w && y >= 0 && y < h {
                let idx = (y as u64) * (w as u64) + (x as u64);
                self.obstacles.insert(idx, true);
            }
            i += 2;
        }
    }

    #[wasm_bindgen(js_name = clearObstacles)]
    pub fn clear_obstacles(&mut self) {
        self.obstacles.clear();
    }

    #[wasm_bindgen(js_name = getObstacleCount)]
    pub fn get_obstacle_count(&self) -> usize {
        self.obstacles.len()
    }

    #[wasm_bindgen(js_name = getWidth)]
    pub fn get_width(&self) -> i64 {
        self.width
    }

    #[wasm_bindgen(js_name = getHeight)]
    pub fn get_height(&self) -> i64 {
        self.height
    }

    #[inline(always)]
    fn is_obstacle(&self, idx: u64) -> bool {
        self.obstacles.contains_key(&idx)
    }

    fn heap_push(&mut self, idx: u64, f: u32) {
        self.heap.push((idx, f));
        let mut pos = self.heap.len() - 1;
        while pos > 0 {
            let parent_pos = (pos - 1) >> 1;
            if self.heap[pos].1 >= self.heap[parent_pos].1 {
                break;
            }
            self.heap.swap(pos, parent_pos);
            pos = parent_pos;
        }
    }

    fn heap_pop(&mut self) -> Option<(u64, u32)> {
        if self.heap.is_empty() {
            return None;
        }
        let result = self.heap[0];
        let len = self.heap.len();
        if len > 1 {
            self.heap[0] = self.heap[len - 1];
            self.heap.pop();
            let mut pos = 0;
            let len = self.heap.len();
            loop {
                let left = (pos << 1) + 1;
                if left >= len {
                    break;
                }
                let right = left + 1;
                let smallest = if right < len && self.heap[right].1 < self.heap[left].1 {
                    right
                } else {
                    left
                };
                if self.heap[pos].1 <= self.heap[smallest].1 {
                    break;
                }
                self.heap.swap(pos, smallest);
                pos = smallest;
            }
        } else {
            self.heap.pop();
        }
        Some(result)
    }

    #[wasm_bindgen(js_name = findPath)]
    pub fn find_path(
        &mut self,
        start_x: i64,
        start_y: i64,
        end_x: i64,
        end_y: i64,
        optimal_result: bool,
    ) -> Vec<i32> {
        // 边界检查
        if start_x < 0 || start_x >= self.width || start_y < 0 || start_y >= self.height {
            return Vec::new();
        }
        if end_x < 0 || end_x >= self.width || end_y < 0 || end_y >= self.height {
            return Vec::new();
        }

        let width = self.width as u64;
        let start_idx = (start_y as u64) * width + (start_x as u64);
        let end_idx = (end_y as u64) * width + (end_x as u64);

        // 障碍物检查
        if self.is_obstacle(start_idx) || self.is_obstacle(end_idx) {
            return Vec::new();
        }

        // 起点即终点
        if start_idx == end_idx {
            return vec![start_x as i32, start_y as i32];
        }

        // 相邻格子
        let dx = (end_x - start_x).abs();
        let dy = (end_y - start_y).abs();
        if dx <= 1 && dy <= 1 {
            return vec![start_x as i32, start_y as i32, end_x as i32, end_y as i32];
        }

        // 清除之前的搜索状态
        self.nodes.clear();
        self.heap.clear();

        // 初始化起点
        self.nodes.insert(start_idx, SparseNode {
            g: 0,
            parent: u64::MAX,
            closed: false,
        });

        let h0 = if optimal_result {
            heuristic_octile(start_x as i32, start_y as i32, end_x as i32, end_y as i32)
        } else {
            heuristic_chebyshev(start_x as i32, start_y as i32, end_x as i32, end_y as i32)
        };
        self.heap_push(start_idx, h0);

        const DIRECTIONS: [(i64, i64, bool); 8] = [
            (0, -1, false), (1, 0, false), (0, 1, false), (-1, 0, false),
            (1, -1, true), (1, 1, true), (-1, 1, true), (-1, -1, true),
        ];

        let (straight_cost, diag_cost): (u32, u32) = if optimal_result {
            (1000, 1414)
        } else {
            (1000, 1000)
        };

        let w = self.width;
        let h = self.height;

        while let Some((current_idx, _)) = self.heap_pop() {
            // 检查是否已关闭
            if let Some(node) = self.nodes.get(&current_idx) {
                if node.closed {
                    continue;
                }
            } else {
                continue;
            }

            // 标记为已关闭
            if let Some(node) = self.nodes.get_mut(&current_idx) {
                node.closed = true;
            }

            // 到达终点
            if current_idx == end_idx {
                // 重建路径
                let mut coords: Vec<(i32, i32)> = Vec::with_capacity(512);
                let mut cur = end_idx;
                loop {
                    let x = (cur % width) as i32;
                    let y = (cur / width) as i32;
                    coords.push((x, y));
                    if let Some(node) = self.nodes.get(&cur) {
                        let parent = node.parent;
                        if parent == u64::MAX || parent == cur {
                            break;
                        }
                        cur = parent;
                    } else {
                        break;
                    }
                }
                coords.reverse();
                
                let mut path = Vec::with_capacity(coords.len() * 2);
                for (x, y) in coords {
                    path.push(x);
                    path.push(y);
                }
                return path;
            }

            let current_x = (current_idx % width) as i64;
            let current_y = (current_idx / width) as i64;
            let current_g = self.nodes.get(&current_idx).map(|n| n.g).unwrap_or(u32::MAX);

            for &(ddx, ddy, is_diag) in &DIRECTIONS {
                let nx = current_x + ddx;
                let ny = current_y + ddy;

                if nx < 0 || nx >= w || ny < 0 || ny >= h {
                    continue;
                }

                let neighbor_idx = (ny as u64) * width + (nx as u64);

                if self.is_obstacle(neighbor_idx) {
                    continue;
                }

                // 检查是否已关闭
                if let Some(node) = self.nodes.get(&neighbor_idx) {
                    if node.closed {
                        continue;
                    }
                }

                let move_cost = if is_diag { diag_cost } else { straight_cost };
                let tentative_g = current_g.saturating_add(move_cost);

                let neighbor_g = self.nodes.get(&neighbor_idx).map(|n| n.g).unwrap_or(u32::MAX);

                if tentative_g < neighbor_g {
                    self.nodes.insert(neighbor_idx, SparseNode {
                        g: tentative_g,
                        parent: current_idx,
                        closed: false,
                    });

                    let hh = if optimal_result {
                        heuristic_octile(nx as i32, ny as i32, end_x as i32, end_y as i32)
                    } else {
                        heuristic_chebyshev(nx as i32, ny as i32, end_x as i32, end_y as i32)
                    };
                    let f = tentative_g.saturating_add(hh);
                    self.heap_push(neighbor_idx, f);
                }
            }
        }

        Vec::new()
    }
}

#[wasm_bindgen(js_name = getVersion)]
pub fn get_version() -> String {
    "2.3.0".to_string()
}

// 根据地图大小返回推荐使用的实现类型
// 返回: 0 = AstarGrid (固定数组), 1 = AstarGridSparse (HashMap)
#[wasm_bindgen(js_name = recommendedImpl)]
pub fn recommended_impl(width: i64, height: i64) -> i32 {
    let grid_size = (width as u64) * (height as u64);
    // 超过 10 亿节点使用稀疏实现
    if grid_size > 1_000_000_000 {
        1
    } else {
        0
    }
}
