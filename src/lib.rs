use wasm_bindgen::prelude::*;

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
    fn new() -> Self {
        MinHeap {
            data: Vec::with_capacity(2048),
        }
    }

    fn clear(&mut self) {
        self.data.clear();
    }

    fn push(&mut self, node: HeapNode) {
        self.data.push(node);
        let mut pos = self.data.len() - 1;
        while pos > 0 {
            let parent_pos = (pos - 1) / 2;
            if self.data[pos].f >= self.data[parent_pos].f {
                break;
            }
            self.data.swap(pos, parent_pos);
            pos = parent_pos;
        }
    }

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
                let left = 2 * pos + 1;
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
// A* 网格
// ============================================================================

#[wasm_bindgen]
pub struct AstarGrid {
    width: i32,
    height: i32,
    grid_size: usize,

    obstacles: Vec<u8>,
    g_score: Vec<u32>,
    came_from: Vec<u32>,
    closed: Vec<bool>,

    heap: MinHeap,
}

#[wasm_bindgen]
impl AstarGrid {
    #[wasm_bindgen(constructor)]
    pub fn new(width: i32, height: i32) -> AstarGrid {
        let grid_size = (width * height) as usize;
        let byte_size = (grid_size + 7) / 8;

        AstarGrid {
            width,
            height,
            grid_size,
            obstacles: vec![0; byte_size],
            g_score: vec![u32::MAX; grid_size],
            came_from: vec![u32::MAX; grid_size],
            closed: vec![false; grid_size],
            heap: MinHeap::new(),
        }
    }

    fn reset_for_search(&mut self) {
        // 完全重置所有状态
        for i in 0..self.grid_size {
            self.g_score[i] = u32::MAX;
            self.came_from[i] = u32::MAX;
            self.closed[i] = false;
        }
        self.heap.clear();
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

        // 相邻格子
        let dx = (end_x - start_x).abs();
        let dy = (end_y - start_y).abs();
        if dx <= 1 && dy <= 1 {
            return vec![start_x, start_y, end_x, end_y];
        }

        self.reset_for_search();

        let width = self.width;
        let height = self.height;
        let width_usize = width as usize;

        // 初始化起点
        self.g_score[start_idx] = 0;

        let h0 = if optimal_result {
            heuristic_octile(start_x, start_y, end_x, end_y)
        } else {
            heuristic_chebyshev(start_x, start_y, end_x, end_y)
        };
        self.heap.push(HeapNode { idx: start_idx as u32, f: h0 });

        // 8方向
        const DIRECTIONS: [(i32, i32, bool); 8] = [
            (0, -1, false), (1, 0, false), (0, 1, false), (-1, 0, false),
            (1, -1, true), (1, 1, true), (-1, 1, true), (-1, -1, true),
        ];

        let (straight_cost, diag_cost): (u32, u32) = if optimal_result {
            (1000, 1414)
        } else {
            (1000, 1000)
        };

        while let Some(current) = self.heap.pop() {
            let current_idx = current.idx as usize;

            if self.closed[current_idx] {
                continue;
            }
            self.closed[current_idx] = true;

            if current_idx == end_idx {
                // 重建路径
                let mut path = Vec::with_capacity(256);
                let mut cur = end_idx;
                loop {
                    let x = (cur % width_usize) as i32;
                    let y = (cur / width_usize) as i32;
                    path.push(x);
                    path.push(y);
                    let parent = self.came_from[cur];
                    if parent == u32::MAX || parent as usize == cur {
                        break;
                    }
                    cur = parent as usize;
                }
                path.reverse();
                return path;
            }

            let current_x = (current_idx % width_usize) as i32;
            let current_y = (current_idx / width_usize) as i32;
            let current_g = self.g_score[current_idx];

            for &(ddx, ddy, is_diag) in &DIRECTIONS {
                let nx = current_x + ddx;
                let ny = current_y + ddy;

                if nx < 0 || nx >= width || ny < 0 || ny >= height {
                    continue;
                }

                let neighbor_idx = (ny * width + nx) as usize;

                if self.is_obstacle_idx(neighbor_idx) || self.closed[neighbor_idx] {
                    continue;
                }

                let move_cost = if is_diag { diag_cost } else { straight_cost };
                let tentative_g = current_g.saturating_add(move_cost);

                if tentative_g < self.g_score[neighbor_idx] {
                    self.g_score[neighbor_idx] = tentative_g;
                    self.came_from[neighbor_idx] = current_idx as u32;

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

#[wasm_bindgen(js_name = getVersion)]
pub fn get_version() -> String {
    "2.2.0".to_string()
}
