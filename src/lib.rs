use wasm_bindgen::prelude::*;

/// Octile heuristic (optimal): 14 * minD + 10 * (maxD - minD)
#[inline(always)]
fn heuristic_octile(x1: i32, y1: i32, x2: i32, y2: i32) -> u32 {
    let dx = (x2 - x1).abs() as u32;
    let dy = (y2 - y1).abs() as u32;
    let (min_d, max_d) = if dx < dy { (dx, dy) } else { (dy, dx) };
    if min_d == 0 {
        max_d * 1000
    } else {
        min_d * 414 + max_d * 1000 // 414 ≈ (14-10)*100, 1000 = 10*100
    }
}

/// Chebyshev heuristic (fast, non-optimal): maxD * 10
#[inline(always)]
fn heuristic_chebyshev(x1: i32, y1: i32, x2: i32, y2: i32) -> u32 {
    let dx = (x2 - x1).abs() as u32;
    let dy = (y2 - y1).abs() as u32;
    let max_d = if dx > dy { dx } else { dy };
    max_d * 1000 // 1000 = 10*100
}

/// Lightweight node: linear index + f (for heap, index_map by idx)
#[derive(Clone, Copy)]
struct Node {
    idx: usize,
    f: u32,
}

/// Min-heap with index_map for decrease-key (optimal A*)
struct MinHeap {
    data: Vec<Node>,
    /// idx -> position in data; usize::MAX if not in heap
    index_map: Vec<usize>,
}

impl MinHeap {
    #[inline(always)]
    fn new(grid_size: usize) -> Self {
        MinHeap {
            data: Vec::with_capacity(2048.min(grid_size)),
            index_map: vec![usize::MAX; grid_size],
        }
    }

    #[inline(always)]
    fn clear(&mut self) {
        for n in &self.data {
            self.index_map[n.idx] = usize::MAX;
        }
        self.data.clear();
    }

    #[inline(always)]
    fn push(&mut self, node: Node) {
        let i = self.data.len();
        self.data.push(node);
        self.index_map[node.idx] = i;
        self.sift_up(i);
    }

    #[inline(always)]
    fn pop(&mut self) -> Option<Node> {
        if self.data.is_empty() {
            return None;
        }
        let result = self.data[0];
        self.index_map[result.idx] = usize::MAX;
        let last = self.data.pop().unwrap();
        if !self.data.is_empty() {
            self.data[0] = last;
            self.index_map[last.idx] = 0;
            self.sift_down(0);
        }
        Some(result)
    }

    /// Decrease-key: update f for cell already in heap, then re-heapify (required for optimality)
    #[inline(always)]
    fn update(&mut self, idx: usize, new_f: u32) {
        let i = self.index_map[idx];
        if i == usize::MAX {
            return;
        }
        self.data[i].f = new_f;
        self.sift_up(i);
        self.sift_down(i);
    }

    #[inline(always)]
    fn sift_up(&mut self, mut idx: usize) {
        let node = self.data[idx];
        while idx > 0 {
            let parent_idx = (idx - 1) >> 1;
            let parent = self.data[parent_idx];
            if node.f >= parent.f {
                break;
            }
            self.data[idx] = parent;
            self.index_map[parent.idx] = idx;
            idx = parent_idx;
        }
        self.data[idx] = node;
        self.index_map[node.idx] = idx;
    }

    #[inline(always)]
    fn sift_down(&mut self, mut idx: usize) {
        let len = self.data.len();
        let node = self.data[idx];
        while (idx << 1) + 1 < len {
            let left = (idx << 1) + 1;
            let right = left + 1;
            let mut small = left;
            if right < len && self.data[right].f < self.data[left].f {
                small = right;
            }
            if node.f <= self.data[small].f {
                break;
            }
            self.data[idx] = self.data[small];
            self.index_map[self.data[small].idx] = idx;
            idx = small;
        }
        self.data[idx] = node;
        self.index_map[node.idx] = idx;
    }
}

#[wasm_bindgen]
pub struct AstarGrid {
    width: i32,
    height: i32,
    width_usize: usize,   // 缓存，避免重复转换
    obstacles: Vec<u8>,

    g_score: Vec<u32>,
    came_from: Vec<u32>,
    in_open_set: Vec<u8>,
    in_closed_set: Vec<u8>,

    search_version: u32,
    version_map: Vec<u32>,

    /// 复用堆，避免每次搜索重新分配
    heap: MinHeap,
}

#[wasm_bindgen]
impl AstarGrid {
    #[wasm_bindgen(constructor)]
    pub fn new(width: i32, height: i32) -> AstarGrid {
        let grid_size = (width * height) as usize;
        let byte_size = (grid_size + 7) / 8;
        let width_usize = width as usize;

        AstarGrid {
            width,
            height,
            width_usize,
            obstacles: vec![0; byte_size],
            g_score: vec![u32::MAX; grid_size],
            came_from: vec![u32::MAX; grid_size],
            in_open_set: vec![0; grid_size],
            in_closed_set: vec![0; grid_size],
            search_version: 0,
            version_map: vec![0; grid_size],
            heap: MinHeap::new(grid_size),
        }
    }

    #[inline(always)]
    fn reset_for_search(&mut self) {
        self.search_version = self.search_version.wrapping_add(1);
        if self.search_version == 0 {
            self.search_version = 1;
            self.g_score.fill(u32::MAX);
            self.came_from.fill(u32::MAX);
            self.in_open_set.fill(0);
            self.in_closed_set.fill(0);
            self.version_map.fill(0);
        }
        self.heap.clear();
    }

    #[wasm_bindgen(js_name = setObstacle)]
    pub fn set_obstacle(&mut self, x: i32, y: i32, is_obstacle: bool) {
        if x < 0 || x >= self.width || y < 0 || y >= self.height {
            return;
        }
        let idx = (y * self.width + x) as usize;
        let byte_idx = idx >> 3;
        let bit_idx = idx & 7;
        let mask = 1u8 << bit_idx;
        if is_obstacle {
            self.obstacles[byte_idx] |= mask;
        } else {
            self.obstacles[byte_idx] &= !mask;
        }
    }

    #[wasm_bindgen(js_name = setObstaclesBatch)]
    pub fn set_obstacles_batch(&mut self, obstacles_data: &[u8]) {
        let expected = ((self.width * self.height) + 7) / 8;
        if obstacles_data.len() == expected as usize {
            self.obstacles.copy_from_slice(obstacles_data);
        }
    }

    #[wasm_bindgen(js_name = setObstaclesFromCoords)]
    pub fn set_obstacles_from_coords(&mut self, coords: &[i32]) {
        self.obstacles.fill(0);
        let w = self.width;
        let h = self.height;
        let mut i = 0;
        while i < coords.len() {
            let x = coords[i];
            let y = coords[i + 1];
            if x >= 0 && x < w && y >= 0 && y < h {
                let idx = (y * w + x) as usize;
                let byte_idx = idx >> 3;
                let bit_idx = idx & 7;
                self.obstacles[byte_idx] |= 1u8 << bit_idx;
            }
            i += 2;
        }
    }

    #[inline(always)]
    fn is_obstacle_at(&self, idx: usize) -> bool {
        let byte_idx = idx >> 3;
        let bit_idx = idx & 7;
        (self.obstacles[byte_idx] & (1u8 << bit_idx)) != 0
    }

    #[wasm_bindgen(js_name = isWalkable)]
    pub fn is_walkable(&self, x: i32, y: i32) -> bool {
        if x < 0 || x >= self.width || y < 0 || y >= self.height {
            return false;
        }
        let idx = (y * self.width + x) as usize;
        !self.is_obstacle_at(idx)
    }

    #[wasm_bindgen(js_name = findPath)]
    pub fn find_path(&mut self, start_x: i32, start_y: i32, end_x: i32, end_y: i32, optimal_result: bool) -> Vec<i32> {
        if !self.is_walkable(start_x, start_y) || !self.is_walkable(end_x, end_y) {
            return Vec::new();
        }
        if start_x == end_x && start_y == end_y {
            return vec![start_x, start_y];
        }
        let dx = (end_x - start_x).abs();
        let dy = (end_y - start_y).abs();
        if dx <= 1 && dy <= 1 {
            return vec![start_x, start_y, end_x, end_y];
        }

        self.reset_for_search();

        let width = self.width;
        let width_usize = self.width_usize;
        let start_idx = (start_y * width + start_x) as usize;
        let end_idx = (end_y * width + end_x) as usize;

        self.g_score[start_idx] = 0;
        let h0 = if optimal_result {
            heuristic_octile(start_x, start_y, end_x, end_y)
        } else {
            heuristic_chebyshev(start_x, start_y, end_x, end_y)
        };
        self.version_map[start_idx] = self.search_version;
        self.in_open_set[start_idx] = 1;
        self.heap.push(Node { idx: start_idx, f: h0 });

        // Move costs: optimal_result=true uses 10/14, false uses 10/10
        let (straight_cost, diag_cost) = if optimal_result {
            (1000, 1414) // 10*100, 14*100 (≈14.14*100)
        } else {
            (1000, 1000) // 10*100, 10*100 (uniform cost)
        };
        
        const DIRECTIONS: [(i32, i32); 8] = [
            (0, -1),
            (1, 0),
            (0, 1),
            (-1, 0),
            (1, -1),
            (1, 1),
            (-1, 1),
            (-1, -1),
        ];

        let sv = self.search_version;

        while let Some(current) = self.heap.pop() {
            let current_idx = current.idx;
            let current_x = (current_idx % width_usize) as i32;
            let current_y = (current_idx / width_usize) as i32;

            if self.version_map[current_idx] != sv || self.in_closed_set[current_idx] == 1 {
                continue;
            }

            self.in_closed_set[current_idx] = 1;
            self.in_open_set[current_idx] = 0;

            if current_idx == end_idx {
                return self.reconstruct_path(end_idx);
            }

            let current_g = self.g_score[current_idx];

            for &(dx, dy) in &DIRECTIONS {
                let nx = current_x + dx;
                let ny = current_y + dy;
                if nx < 0 || nx >= width || ny < 0 || ny >= self.height {
                    continue;
                }
                let neighbor_idx = ny as usize * width_usize + nx as usize;
                let byte_idx = neighbor_idx >> 3;
                let bit_idx = neighbor_idx & 7;
                if (self.obstacles[byte_idx] & (1u8 << bit_idx)) != 0 {
                    continue;
                }
                if self.in_closed_set[neighbor_idx] == 1 {
                    continue;
                }

                // Calculate move cost: diagonal if both dx and dy are non-zero
                let cost = if dx != 0 && dy != 0 {
                    diag_cost
                } else {
                    straight_cost
                };
                
                let tentative_g = current_g.saturating_add(cost);
                let existing_g = if self.version_map[neighbor_idx] == sv {
                    self.g_score[neighbor_idx]
                } else {
                    u32::MAX
                };

                if tentative_g < existing_g {
                    self.came_from[neighbor_idx] = current_idx as u32;
                    self.g_score[neighbor_idx] = tentative_g;
                    self.version_map[neighbor_idx] = sv;
                    let h = if optimal_result {
                        heuristic_octile(nx, ny, end_x, end_y)
                    } else {
                        heuristic_chebyshev(nx, ny, end_x, end_y)
                    };
                    let f = tentative_g.saturating_add(h);

                    if self.in_open_set[neighbor_idx] == 1 {
                        self.heap.update(neighbor_idx, f);
                    } else {
                        self.in_open_set[neighbor_idx] = 1;
                        self.heap.push(Node { idx: neighbor_idx, f });
                    }
                }
            }
        }

        Vec::new()
    }

    #[wasm_bindgen(js_name = getWidth)]
    pub fn get_width(&self) -> i32 {
        self.width
    }

    #[wasm_bindgen(js_name = getHeight)]
    pub fn get_height(&self) -> i32 {
        self.height
    }

    #[wasm_bindgen(js_name = clearObstacles)]
    pub fn clear_obstacles(&mut self) {
        self.obstacles.fill(0);
    }

    #[wasm_bindgen(js_name = getObstacleCount)]
    pub fn get_obstacle_count(&self) -> usize {
        self.obstacles.iter().map(|&b| b.count_ones() as usize).sum()
    }

    #[wasm_bindgen(js_name = batchFindPaths)]
    pub fn batch_find_paths(&mut self, requests: &[i32]) -> Vec<i32> {
        let mut results = Vec::with_capacity(requests.len() / 2);
        let mut i = 0;
        while i < requests.len() {
            // batchFindPaths defaults to optimal_result=true for consistency
            let path = self.find_path(
                requests[i],
                requests[i + 1],
                requests[i + 2],
                requests[i + 3],
                true, // optimal_result = true
            );
            results.push((path.len() / 2) as i32);
            results.extend(path);
            i += 4;
        }
        results
    }

    fn reconstruct_path(&self, end_idx: usize) -> Vec<i32> {
        let width_usize = self.width_usize;
        let sv = self.search_version;

        let mut path = Vec::with_capacity(512);
        let mut cur = end_idx;
        loop {
            let x = (cur % width_usize) as i32;
            let y = (cur / width_usize) as i32;
            path.push(x);
            path.push(y);
            let parent = if self.version_map[cur] == sv {
                self.came_from[cur]
            } else {
                u32::MAX
            };
            if parent == u32::MAX || parent as usize == cur {
                break;
            }
            cur = parent as usize;
        }
        path.reverse();
        path
    }
}

#[wasm_bindgen(js_name = getVersion)]
pub fn get_version() -> String {
    "2.1.0-optimized".to_string()
}
