// WebAssembly A* 算法实现 (C语言)
#include <stdlib.h>
#include <math.h>

// 节点结构
typedef struct {
    int x, y;
    int g, h, f;
    int parent;
    int walkable;
} Node;

// 堆结构
typedef struct {
    int* data;
    int size;
    int capacity;
} Heap;

// 全局变量
static Node* grid = NULL;
static int* openSet = NULL;
static int* closedSet = NULL;
static Heap* openHeap = NULL;
static int gridWidth = 0;
static int gridHeight = 0;
static int gridSize = 0;

// 导出函数声明
int initGrid(int width, int height);
void setObstacle(int x, int y, int isObstacle);
int search(int startX, int startY, int endX, int endY, int* pathBuffer, int maxPathLength);
void cleanup();

// 堆操作
void heapPush(Heap* heap, int nodeIndex) {
    if (heap->size >= heap->capacity) return;
    
    heap->data[heap->size] = nodeIndex;
    int current = heap->size;
    heap->size++;
    
    // 上浮
    while (current > 0) {
        int parent = (current - 1) / 2;
        if (grid[heap->data[current]].f >= grid[heap->data[parent]].f) break;
        
        int temp = heap->data[current];
        heap->data[current] = heap->data[parent];
        heap->data[parent] = temp;
        current = parent;
    }
}

int heapPop(Heap* heap) {
    if (heap->size <= 0) return -1;
    
    int result = heap->data[0];
    heap->data[0] = heap->data[--heap->size];
    
    // 下沉
    int current = 0;
    while (1) {
        int leftChild = 2 * current + 1;
        int rightChild = 2 * current + 2;
        int smallest = current;
        
        if (leftChild < heap->size && 
            grid[heap->data[leftChild]].f < grid[heap->data[smallest]].f) {
            smallest = leftChild;
        }
        
        if (rightChild < heap->size && 
            grid[heap->data[rightChild]].f < grid[heap->data[smallest]].f) {
            smallest = rightChild;
        }
        
        if (smallest == current) break;
        
        int temp = heap->data[current];
        heap->data[current] = heap->data[smallest];
        heap->data[smallest] = temp;
        current = smallest;
    }
    
    return result;
}

// 曼哈顿距离
int manhattanDistance(int x1, int y1, int x2, int y2) {
    return (abs(x1 - x2) + abs(y1 - y2)) * 10;
}

// 初始化网格
int initGrid(int width, int height) {
    gridWidth = width;
    gridHeight = height;
    gridSize = width * height;
    
    // 分配内存
    grid = (Node*)malloc(gridSize * sizeof(Node));
    openSet = (int*)malloc(gridSize * sizeof(int));
    closedSet = (int*)malloc(gridSize * sizeof(int));
    
    openHeap = (Heap*)malloc(sizeof(Heap));
    openHeap->data = (int*)malloc(gridSize * sizeof(int));
    openHeap->capacity = gridSize;
    
    if (!grid || !openSet || !closedSet || !openHeap || !openHeap->data) {
        return 0; // 内存分配失败
    }
    
    // 初始化网格
    for (int i = 0; i < gridSize; i++) {
        int x = i % width;
        int y = i / width;
        
        grid[i].x = x;
        grid[i].y = y;
        grid[i].g = 0;
        grid[i].h = 0;
        grid[i].f = 0;
        grid[i].parent = -1;
        grid[i].walkable = 1; // 默认可通行
        
        openSet[i] = 0;
        closedSet[i] = 0;
    }
    
    openHeap->size = 0;
    
    return 1; // 成功
}

// 设置障碍物
void setObstacle(int x, int y, int isObstacle) {
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return;
    
    int index = y * gridWidth + x;
    grid[index].walkable = !isObstacle;
}

// A*搜索
int search(int startX, int startY, int endX, int endY, int* pathBuffer, int maxPathLength) {
    if (!grid) return 0;
    
    // 重置状态
    for (int i = 0; i < gridSize; i++) {
        grid[i].g = 0;
        grid[i].h = 0;
        grid[i].f = 0;
        grid[i].parent = -1;
        openSet[i] = 0;
        closedSet[i] = 0;
    }
    openHeap->size = 0;
    
    int startIndex = startY * gridWidth + startX;
    int endIndex = endY * gridWidth + endX;
    
    // 初始化起点
    grid[startIndex].g = 0;
    grid[startIndex].h = manhattanDistance(startX, startY, endX, endY);
    grid[startIndex].f = grid[startIndex].h;
    
    heapPush(openHeap, startIndex);
    openSet[startIndex] = 1;
    
    // 8方向移动
    int directions[8][2] = {
        {0, -1}, {1, 0}, {0, 1}, {-1, 0},
        {1, -1}, {1, 1}, {-1, 1}, {-1, -1}
    };
    
    while (openHeap->size > 0) {
        int currentIndex = heapPop(openHeap);
        openSet[currentIndex] = 0;
        closedSet[currentIndex] = 1;
        
        if (currentIndex == endIndex) {
            // 重建路径
            int pathLength = 0;
            int current = endIndex;
            
            while (current != -1 && pathLength < maxPathLength - 1) {
                pathBuffer[pathLength * 2] = grid[current].x;
                pathBuffer[pathLength * 2 + 1] = grid[current].y;
                pathLength++;
                current = grid[current].parent;
            }
            
            // 反转路径
            for (int i = 0; i < pathLength / 2; i++) {
                int temp1 = pathBuffer[i * 2];
                int temp2 = pathBuffer[i * 2 + 1];
                int j = pathLength - 1 - i;
                pathBuffer[i * 2] = pathBuffer[j * 2];
                pathBuffer[i * 2 + 1] = pathBuffer[j * 2 + 1];
                pathBuffer[j * 2] = temp1;
                pathBuffer[j * 2 + 1] = temp2;
            }
            
            return pathLength;
        }
        
        int currentX = grid[currentIndex].x;
        int currentY = grid[currentIndex].y;
        
        // 检查邻居
        for (int i = 0; i < 8; i++) {
            int newX = currentX + directions[i][0];
            int newY = currentY + directions[i][1];
            
            if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) continue;
            
            int neighborIndex = newY * gridWidth + newX;
            
            if (!grid[neighborIndex].walkable || closedSet[neighborIndex]) continue;
            
            int moveCost = (directions[i][0] != 0 && directions[i][1] != 0) ? 14 : 10;
            int tentativeG = grid[currentIndex].g + moveCost;
            
            if (!openSet[neighborIndex] || tentativeG < grid[neighborIndex].g) {
                grid[neighborIndex].parent = currentIndex;
                grid[neighborIndex].g = tentativeG;
                grid[neighborIndex].h = manhattanDistance(newX, newY, endX, endY);
                grid[neighborIndex].f = grid[neighborIndex].g + grid[neighborIndex].h;
                
                if (!openSet[neighborIndex]) {
                    heapPush(openHeap, neighborIndex);
                    openSet[neighborIndex] = 1;
                }
            }
        }
    }
    
    return 0; // 未找到路径
}

// 清理内存
void cleanup() {
    if (grid) {
        free(grid);
        grid = NULL;
    }
    if (openSet) {
        free(openSet);
        openSet = NULL;
    }
    if (closedSet) {
        free(closedSet);
        closedSet = NULL;
    }
    if (openHeap) {
        if (openHeap->data) {
            free(openHeap->data);
        }
        free(openHeap);
        openHeap = NULL;
    }
}