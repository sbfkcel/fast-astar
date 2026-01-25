use wasm_bindgen::prelude::*;

#[inline(always)]
fn heuristic(x1: i32, y1: i32, x2: i32, y2: i32) -> u32 {
    let dx = (x2 - x1).abs() as u32;
    let dy = (y2 - y1).abs() as u32;
    let (min_d, max_d) = if dx < dy { (dx, dy) } else { (dy, dx) };
    if min_d == 0 {
        max_d * 1000
    } else {
        min_d * 414 + max_d * 1000
    }
}

// 超轻量级节点 - 仅存 pos + f，16 字节
#[derive(Clone, Copy)]
struct Node {
    pos: u32, // (y << 16) | x
    f: u32,
}

impl Node {
    #[inline(always)]
    fn new(x: i32, y: i32, f: u32) -> Self {
        Node {
            pos: ((y as u32) << 16) | (x as u32),
            f,
        }
    }

    #[inline(always)]
    fn x(&self) -> i32 {
        (self.pos & 0xFFFF) as i32
    }

    #[inline(always)]
    fn y(&self) -> i32 {
        (self.pos >> 16) as i32
    }
}

/// 最小堆，支持复用与按需扩容
struct MinHeap {
    data: Vec<Node>,
}

impl MinHeap {
    #[inline(always)]
    fn new() -> Self {
        MinHeap {
            data: Vec::with_capacity(2048),
        }
    }

    #[inline(always)]
    fn clear(&mut self) {
        self.data.clear();
    }

    #[inline(always)]
    fn push(&mut self, node: Node) {
        self.data.push(node);
        self.sift_up(self.data.len() - 1);
    }

    #[inline(always)]
    fn pop(&mut self) -> Option<Node> {
        if self.data.is_empty() {
            return None;
        }
        let result = self.data[0];
        let last = self.data.pop().unwrap();
        if !self.data.is_empty() {
            self.data[0] = last;
            self.sift_down(0);
        }
        Some(result)
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
            idx = parent_idx;
        }
        self.data[idx] = node;
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
            idx = small;
        }
        self.data[idx] = node;
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
            heap: MinHeap::new(),
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
    pub fn find_path(&mut self, start_x: i32, start_y: i32, end_x: i32, end_y: i32) -> Vec<i32> {
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
        let max_distance = ((dx + dy) as u32) * 3000;

        self.g_score[start_idx] = 0;
        let h0 = heuristic(start_x, start_y, end_x, end_y);
        self.version_map[start_idx] = self.search_version;
        self.in_open_set[start_idx] = 1;
        self.heap.push(Node::new(start_x, start_y, h0));

        const DIRECTIONS: [(i32, i32, u32); 8] = [
            (0, -1, 1000),
            (1, 0, 1000),
            (0, 1, 1000),
            (-1, 0, 1000),
            (1, -1, 1414),
            (1, 1, 1414),
            (-1, 1, 1414),
            (-1, -1, 1414),
        ];

        let sv = self.search_version;

        while let Some(current) = self.heap.pop() {
            let current_x = current.x();
            let current_y = current.y();
            let current_idx = current_y as usize * width_usize + current_x as usize;

            if self.version_map[current_idx] != sv || self.in_closed_set[current_idx] == 1 {
                continue;
            }

            self.in_closed_set[current_idx] = 1;
            self.in_open_set[current_idx] = 0;

            if current_idx == end_idx {
                return self.reconstruct_path(end_idx);
            }

            let current_g = self.g_score[current_idx];
            if current_g > max_distance {
                continue;
            }

            for &(dx, dy, cost) in &DIRECTIONS {
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
                    let h = heuristic(nx, ny, end_x, end_y);
                    let f = tentative_g.saturating_add(h);

                    if self.in_open_set[neighbor_idx] == 0 {
                        self.in_open_set[neighbor_idx] = 1;
                    }
                    self.heap.push(Node::new(nx, ny, f));
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
            let path = self.find_path(
                requests[i],
                requests[i + 1],
                requests[i + 2],
                requests[i + 3],
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
