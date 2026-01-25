/**
 * fast-astar Demo - A*算法可视化演示
 * 使用副本目录中的优化算法库（不修改库文件）
 */
import Grid from './lib/Grid.js';
import Astar from './lib/Astar.js';

const $id = id => document.getElementById(id),
    strToArray = str => str.split(',').map(Number),
    devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1;

// 创建适配层，将副本库的 API 适配到原始演示需要的 API
class CompatibleGrid {
    constructor(options) {
        // 直接使用副本库的 Grid（已支持 render 回调）
        this._grid = new Grid(options);
        this.col = this._grid.col;
        this.row = this._grid.row;
        
        // 创建兼容的 grid 结构（二维数组），用于演示的可视化
        this.grid = this._createCompatGrid();
    }

    _createCompatGrid() {
        // 如果副本库有 grid 属性（非内存高效模式），直接使用它
        if (this._grid.grid && !this._grid.useMemoryEfficientMode) {
            return this._grid.grid;
        }
        
        // 否则创建兼容的 grid 结构
        const grid = [];
        for (let y = 0; y < this.row; y++) {
            const row = [];
            for (let x = 0; x < this.col; x++) {
                const node = this._grid.get([x, y]);
                if (node) {
                    row.push(node);
                } else {
                    // 如果节点不存在，创建一个兼容的节点
                    row.push({
                        x: x,
                        y: y,
                        g: 0,
                        h: 0,
                        f: 0,
                        value: 0,
                        key: [x, y],
                        parent: undefined
                    });
                }
            }
            grid.push(row);
        }
        return grid;
    }

    set(point, key, val) {
        // 直接使用副本库的 set 方法（已支持 render 回调）
        this._grid.set(point, key, val);
        
        // 同步到兼容的 grid 结构（确保获取最新的节点数据，包括 g、h、f 值）
        const node = this._grid.get(point);
        if (node && this.grid[point[1]]) {
            // 更新兼容 grid 结构中的节点（保持引用同步）
            const compatNode = this.grid[point[1]][point[0]];
            if (compatNode !== node) {
                // 如果引用不同，更新为最新节点
                this.grid[point[1]][point[0]] = node;
            } else {
                // 如果引用相同，只需更新属性
                node[key] = val;
            }
        }
    }

    get(point) {
        // 如果 grid 直接引用副本库的 grid，直接从 grid 数组获取（确保是同一个对象引用）
        if (this.grid === this._grid.grid) {
            const row = this.grid[point[1]];
            return row ? row[point[0]] : null;
        }
        
        // 否则总是从副本库获取最新的节点数据（确保 g、h、f 值是最新的）
        const node = this._grid.get(point);
        if (node && this.grid[point[1]]) {
            // 同步到兼容的 grid 结构
            this.grid[point[1]][point[0]] = node;
        }
        return node;
    }

    obstacle(percentage, value) {
        const count = Math.floor(this.col * this.row * percentage / 100);
        const obstacles = {};
        
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * this.col);
            const y = Math.floor(Math.random() * this.row);
            const node = this.get([x, y]);
            if (node && node.value === 0) {
                // 使用副本库的 set 方法设置障碍物
                this._grid.set([x, y], 'value', value);
                obstacles[[x, y]] = null;
            }
        }
        return obstacles;
    }

    isWalkableAt(x, y) {
        return this._grid.isWalkableAt(x, y);
    }
}

class CompatibleAstar {
    constructor(grid, astarOptions = {}) {
        // 使用副本库的 SmartAstar（智能选择最优实现）
        this.grid = grid;
        this._astar = new Astar(grid._grid, astarOptions);
    }

    search(start, end, options = {}) {
        // 清理之前的搜索状态
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

        // 重置起点终点
        const startNode = this.grid.get(start);
        const endNode = this.grid.get(end);
        
        if (startNode) {
            startNode.value = 0;
            this.grid.set(start, 'type', 'start');
        }
        if (endNode) {
            endNode.value = 0;
            this.grid.set(end, 'type', 'end');
        }

        // 执行搜索（副本库的 search 可能是异步的）
        const result = this._astar.search(start, end, {
            rightAngle: options.rightAngle || false,
            optimalResult: options.optimalResult !== false
        });

        // 如果结果是 Promise，需要等待
        if (result && typeof result.then === 'function') {
            return result.then(path => {
                this._syncPathToGrid(path);
                return path;
            });
        }

        this._syncPathToGrid(result);
        return result;
    }

    _syncPathToGrid(path) {
        if (!path || !Array.isArray(path)) return;
        
        // 同步路径节点到 grid 结构，建立 parent 关系
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const node = this.grid.get(point);
            if (node && i > 0) {
                const prevPoint = path[i - 1];
                const prevNode = this.grid.get(prevPoint);
                if (prevNode) {
                    node.parent = prevNode;
                }
            }
        }
    }

    getBackPath(point) {
        const node = this.grid.get(point);
        if (!node) return [point];

        const path = [];
        let current = node;
        while (current) {
            path.unshift(current.key);
            // parent 可能是节点对象，也可能是 [x,y] 坐标
            if (Array.isArray(current.parent)) {
                current = this.grid.get(current.parent);
            } else {
                current = current.parent;
            }
        }
        return path;
    }
}

class Demo{
    constructor(){
        const _ts = this;
        _ts.option = {
            lineSize: 2 * devicePixelRatio,
        };
        _ts.taskData = {};
        _ts.backObj = {
            text: {},
            path: undefined,
            highlight: undefined,
            graph: {} 
        };

        _ts.domBox = document.getElementById('app');
        _ts.domResult = document.getElementById('result');
        _ts.domBox.oncontextmenu = function(event){
            event.preventDefault();
            return false;
        };
        _ts.timer;
    }

    init(){
        const _ts = this;
        _ts.setOption();
        _ts.createApp();
    }

    getCurrentTaskData(){
        const _ts = this,
            option = _ts.option;
        return _ts.taskData[[option.col,option.row]];
    }

    setOption(){
        const _ts = this,
            list = ['algorithm','grid','obstacle','rightAngle','speed','optimalResult'],
            option = _ts.option,
            dom = {},
            set = (key,val) => {
                switch (key) {
                    case 'algorithm':
                        option[key] = val || 'auto';
                    break;
                    case 'grid':
                        let arrVal = val.split(',').map(Number),
                            lineSize = option.lineSize,
                            col,
                            row,
                            spotSize;
                        col = option['col'] = arrVal[0];
                        row = option['row'] = arrVal[1];
                        _ts.taskData[[col,row]] = _ts.getCurrentTaskData() || {
                            start: undefined,
                            end: undefined,
                            obstacle: undefined,
                            list: []
                        };

                        // 根据网格大小动态调整格子尺寸
                        if(col >= 100){
                            spotSize = option['spotSize'] = 8 * devicePixelRatio;
                        }else if(col >= 80){
                            spotSize = option['spotSize'] = 10 * devicePixelRatio;
                        }else if(col >= 40){
                            spotSize = option['spotSize'] = 24 * devicePixelRatio;
                        }else{
                            spotSize = option['spotSize'] = 48 * devicePixelRatio;
                        }

                        option['canvasW'] = (spotSize + lineSize) * col + lineSize;
                        option['canvasH'] = (spotSize + lineSize) * row + lineSize;
                    break;
                    case 'obstacle':
                        option[key] = +val;
                        if(_ts.map){
                            _ts.getCurrentTaskData().obstacle = _ts.map.obstacle(option.obstacle,1);
                        }
                    break;
                    case 'speed':
                        option[key] = +val;
                    break;
                    case 'optimalResult':
                    case 'rightAngle':
                        option[key] = !!(+val);
                    break;
                }
            };

        for(let i=0,len=list.length; i<len; i++){
            let item = list[i];
            dom[item] = $id(item);

            let localItemVal = localStorage.getItem(item);
            if(localItemVal){
                dom[item].value = localItemVal;
            }

            set(item, localItemVal || dom[item].value);

            dom[item].onchange = function(){
                localStorage.setItem(item, this.value);
                set(item, this.value);
                _ts.clearDraw();

                if(item === 'grid'){
                    _ts.createApp();
                }else{
                    _ts.drawInit();
                }
            };
        }
    }

    createApp(){
        const _ts = this,
            option = _ts.option;
        if(_ts.app){
            _ts.domBox.removeChild(_ts.app.view);
        }
        window.app = _ts.app = new PIXI.Application({
            width: option.canvasW,
            height: option.canvasH,
            antialias: false,
            backgroundColor: 0xDDDDDD,
            forceCanvas: false
        });
        _ts.app.view.style.width = '1002px';
        _ts.app.view.style.height = '602px';
        _ts.domBox.appendChild(_ts.app.view);

        let group = _ts.pixiGroup = {
            event: new PIXI.display.Group(6,true),
            text: new PIXI.display.Group(5,true),
            startEnd: new PIXI.display.Group(4,true),
            path: new PIXI.display.Group(3,true),
            highlight: new PIXI.display.Group(2,true),
            graph: new PIXI.display.Group(1,true),
            background: new PIXI.display.Group(0,true)
        },
        container = _ts.pixiContainer = {
            event: new PIXI.Container(),
            text: new PIXI.Container(),
            startEnd: new PIXI.Container(),
            path: new PIXI.Container(),
            highlight: new PIXI.Container(),
            graph: new PIXI.Container(),
            background: new PIXI.Container()
        };

        _ts.app.stage = new PIXI.display.Stage();
        _ts.app.stage.sortableChildren = true;
        for(let key in group){
            _ts.app.stage.addChild(new PIXI.display.Layer(group[key]));
        }
        for(let key in container){
            _ts.app.stage.addChild(container[key]);
        }

        _ts.drawInit();
    }

    render(demo){
        const _ts = this;
        let x = _ts.x,
            y = _ts.y,
            type = _ts.type,
            itemObj = {},
            demoOption = demo.option,
            taskObj = demo.taskData[[demoOption.col,demoOption.row]];
        if(type){
            switch (type) {
                case 'start':
                case 'end':
                    taskObj[type] = [x,y];
                break;
                default:
                    itemObj[type] = [x,y];
                break;
            }
        }
        if(Object.keys(itemObj).length){
            taskObj.list.push(itemObj);
        }
    }

    async drawInit(){
        const _ts = this,
            option = _ts.option;
        
        // 性能计时
        const startTime = performance.now();
        
        const map = _ts.map = new CompatibleGrid({
            col: option.col,
            row: option.row,
            render: function(){
                _ts.render.call(this, _ts);
            }
        }),
        taskData = _ts.getCurrentTaskData(),
        obstacle = taskData.obstacle,
        start = taskData.start || [0,0],
        end = taskData.end || [option.col-1,option.row-1];

        if(obstacle){
            for(let key in obstacle){
                key = strToArray(key);
                map.set(key, 'value', 1);
            }
        }else{
            _ts.getCurrentTaskData().obstacle = map.obstacle(_ts.option.obstacle, 1);
        }

        const algo = option.algorithm || 'auto';
        const astarOptions = (algo && algo !== 'auto') ? { prefer: algo } : {};
        let astar = _ts.astar = new CompatibleAstar(map, astarOptions),
            result = await astar.search(start, end, {
                rightAngle: _ts.option.rightAngle,
                optimalResult: _ts.option.optimalResult
            });
        
        const searchTime = performance.now() - startTime;
        
        let text;
        if(result){
            const implName = (astar._astar && typeof astar._astar.getCurrentImplementation === 'function')
                ? astar._astar.getCurrentImplementation().name
                : (algo === 'auto' ? 'Smart' : algo);
            const maxPrint = 200;
            const coords = result
                .slice(0, maxPrint)
                .map(p => `[${p[0]},${p[1]}]`)
                .join('');
            const suffix = result.length > maxPrint ? `...(+${result.length - maxPrint})` : '';
            text = `Found path with ${result.length} steps in ${searchTime.toFixed(2)}ms (${implName}): ${coords}${suffix}`;
            _ts.domResult.className = "result";
            
            // 将最终路径添加到任务列表中以便显示
            if(result && result.length > 0){
                taskData.list.push({
                    finalPath: result
                });
            }
        }else{
            text = 'No result';
            _ts.domResult.className = "result result--notResult";
        }
        _ts.domResult.innerHTML = text;

        _ts.drawEventAndBackground();
        _ts.drawStartEnd();
        
        // 如果有路径，立即绘制最终路径
        if(result && result.length > 0){
            const color = 0xFFFF00;
            const grap = _ts._drawPath(color, result);
            grap.parentGroup = _ts.pixiGroup.path;
            _ts.pixiContainer.path.addChild(grap);
            _ts.backObj.path = grap;
        }
        
        _ts.drawTask();
    }

    clearDraw(){
        const _ts = this,
            option = _ts.option,
            container = _ts.pixiContainer;

        _ts.getCurrentTaskData().list = [];

        if(_ts.timer){
            clearTimeout(_ts.timer);
        }
        
        for(let key in container){
            let itemContainer = container[key];
            itemContainer.removeChildren(0, itemContainer.children.length);
        }
    }

    drawEventAndBackground(){
        const _ts = this,
            map = _ts.map,
            gridList = map.grid,
            taskData = _ts.getCurrentTaskData(),
            obstacle = taskData.obstacle;

        for(let i=0, iLen=gridList.length; i<iLen; i++){
            let item = gridList[i];
            for(let j=0, jLen=item.length; j<jLen; j++){
                let spot = item[j],
                    x = spot.x,
                    y = spot.y,
                    color = spot.value === 0 ? 0xFFFFFF : 0x000000,
                    bg, ev;

                bg = _ts._drawSquare(color, x, y);
                bg.parentGroup = _ts.pixiGroup.background;
                _ts.pixiContainer.background.addChild(bg);

                ev = _ts._drawSquare(color, x, y);
                ev.xy = [x,y];
                ev.interactive = true;
                ev.cursor = 'pointer';
                ev.alpha = 0;
                ev.parentGroup = _ts.pixiGroup.event;
                _ts.pixiContainer.event.addChild(ev);

                ev.mousedown = function(event){
                    taskData.start = taskData.end;
                    taskData.end = this.xy;
                    _ts.clearDraw();
                    _ts.drawInit();
                };
                ev.rightdown = function(event){
                    if(obstacle[this.xy] === null){
                        delete obstacle[this.xy];
                    }else if(obstacle[this.xy] === undefined){
                        obstacle[this.xy] = null;
                    }
                    _ts.clearDraw();
                    _ts.drawInit();
                };
            }
        }
    }

    drawStartEnd(){
        const _ts = this,
            data = _ts.getCurrentTaskData();
        [data.start, data.end].forEach((item, index)=>{
            let color = !index ? 0xFF0000 : 0x007FFF,
                x = item[0],
                y = item[1],
                grap = _ts._drawRound(color, x, y);
            grap.parentGroup = _ts.pixiGroup.startEnd;
            _ts.pixiContainer.startEnd.addChild(grap);
        });
    }

    drawTask(){
        const _ts = this,
            option = _ts.option,
            task = _ts.getCurrentTaskData().list,
            astar = _ts.astar,
            backObj = _ts.backObj,
            container = _ts.pixiContainer,
            group = _ts.pixiGroup;
        let taskLen,
            drawEach,
            destroyOption = {children:true, texture:true, baseTexture:true};

        (drawEach = index => {
            taskLen = task.length;
            if(taskLen > index){
                let data = task[index],
                    draw = ()=>{
                        // 处理最终路径
                        if(data.finalPath && Array.isArray(data.finalPath)){
                            const finalPath = data.finalPath;
                            if(finalPath.length > 1){
                                const color = 0xFFFF00;
                                if(backObj.path){
                                    backObj.path.destroy(destroyOption);
                                    container.path.removeChild(backObj.path);
                                }
                                const grap = backObj.path = _ts._drawPath(color, finalPath);
                                grap.parentGroup = group.path;
                                container.path.addChild(grap);
                            }
                            drawEach(++index);
                            return;
                        }

                        for(let key in data){
                            let item = data[key],
                                x = item[0],
                                y = item[1],
                                spot = null,
                                color,
                                grap,
                                f, g, h;
                            
                            // 直接从 grid 数组获取节点，确保是同一个对象引用
                            if(astar.grid.grid === astar.grid._grid.grid){
                                const row = astar.grid.grid[y];
                                spot = row ? row[x] : null;
                            } else {
                                spot = astar.grid.get(item);
                            }

                            if(item && key !== 'time'){
                                // 只在小网格上显示 f/g/h 值
                                if((key === 'open' || key === 'update') && option.col <= 20){
                                    // 确保从最新的节点获取值
                                    // 直接从 grid 数组获取，确保是同一个对象引用
                                    let latestNode = null;
                                    if(astar.grid.grid === astar.grid._grid.grid){
                                        // 如果 grid 直接引用副本库的 grid，直接从数组获取
                                        const row = astar.grid.grid[y];
                                        latestNode = row ? row[x] : null;
                                    } else {
                                        latestNode = astar.grid.get(item);
                                    }
                                    
                                    if(latestNode){
                                        f = latestNode.f || 0;
                                        g = latestNode.g || 0;
                                        h = latestNode.h || 0;
                                        // 显示值（即使为 0 也显示）
                                        if(f !== undefined && f !== null){
                                            if(backObj.text[item]){
                                                backObj.text[item].destroy(destroyOption);
                                                container.text.removeChild(backObj.text[item]);
                                            }
                                            
                                            grap = backObj.text[item] = _ts._drawText(f, g, h, x, y);
                                            grap.parentGroup = group.text;
                                            container.text.addChild(grap);
                                        }
                                    }
                                }

                                switch (key) {
                                    case 'open':
                                    case 'close':
                                        color = key === 'open' ? 0xD4FFE0 : 0x00EDB6;
                                        if(backObj.graph[item]){
                                            backObj.graph[item].destroy(destroyOption);
                                            container.graph.removeChild(backObj.graph[item]);
                                        }
                                        grap = backObj.graph[item] = _ts._drawSquare(color, x, y);
                                        grap.parentGroup = group.graph;
                                        container.graph.addChild(grap);
                                    break;
                                    case 'highlight':
                                        color = 0x000000;
                                        if(backObj.highlight){
                                            backObj.highlight.destroy(destroyOption);
                                            container.highlight.removeChild(backObj.highlight);
                                        }
                                        grap = backObj.highlight = _ts._drawBorder(color, x, y);
                                        grap.parentGroup = group.highlight;
                                        container.highlight.addChild(grap);

                                        let path = astar.getBackPath(item);
                                        if(path.length > 1){
                                            color = 0xFFFF00;
                                            if(backObj.path){
                                                backObj.path.destroy(destroyOption);
                                                container.path.removeChild(backObj.path);
                                            }
                                            grap = backObj.path = _ts._drawPath(color, path);
                                            grap.parentGroup = group.path;
                                            container.path.addChild(grap);
                                        }
                                    break;
                                }
                            }
                        }
                        drawEach(++index);
                    };
                if(index < taskLen){
                    _ts.timer = setTimeout(draw, option.speed); 
                }
            }
        })(0);
    }

    _drawSquare(color, x, y){
        const _ts = this,
            option = _ts.option,
            spotSize = option.spotSize,
            lineSize = option.lineSize;

        let grap = new PIXI.Graphics();
        grap.clear();
        grap.beginFill(color);
        grap.drawRect(x * (spotSize + lineSize) + lineSize, y * (spotSize + lineSize) + lineSize, spotSize, spotSize);
        grap.endFill();
        return grap;
    }

    _drawRound(color, x, y){
        const _ts = this,
            option = _ts.option,
            spotSize = option.spotSize,
            lineSize = option.lineSize;
        let grap = new PIXI.Graphics(),
            size = spotSize / 4,
            _x = spotSize / 2 + lineSize + x * (spotSize + lineSize),
            _y = spotSize / 2 + lineSize + y * (spotSize + lineSize);
        grap.clear();
        grap.beginFill(color);
        grap.drawCircle(_x, _y, size);
        grap.endFill();
        return grap;
    }

    _drawBorder(color, x, y){
        const _ts = this,
            option = _ts.option,
            spotSize = option.spotSize,
            lineSize = option.lineSize,
            grap = new PIXI.Graphics(),
            borderSize = ~~(spotSize / 10);
        grap.clear();
        grap.lineStyle(borderSize, color, 0.3, 0);
        grap.beginFill(color, 0);
        grap.drawRect(x * (spotSize + lineSize) + lineSize, y * (spotSize + lineSize) + lineSize, spotSize, spotSize);
        grap.endFill();
        return grap;
    }

    _drawPath(color, paths){
        const _ts = this,
            option = _ts.option,
            spotSize = option.spotSize,
            lineSize = option.lineSize,
            canvasW = option.canvasW,
            canvasH = option.canvasH;
        let pathSize = spotSize / 4,
            radiuSize = pathSize / 2,
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            drawRound = (ctx, x, y, size, color) => {
                ctx.beginPath();
                ctx.arc(x, y, size, 0, 2*Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
            };

        color = '#' + color.toString(16);
        canvas.width = canvasW;
        canvas.height = canvasH;
        canvas.style.background = 'orange';

        paths.forEach((item, index)=>{
            let x = item[0] * spotSize + spotSize / 2 + item[0] * lineSize + lineSize,
                y = item[1] * spotSize + spotSize / 2 + item[1] * lineSize + lineSize;
            if(index === 0){
                drawRound(ctx, x, y, radiuSize, color);
                ctx.beginPath();
                ctx.lineWidth = pathSize;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = color;
                ctx.moveTo(x, y);
            }else{
                ctx.lineTo(x, y);
            }
            if(index === paths.length - 1){
                ctx.stroke();
                drawRound(ctx, x, y, radiuSize, color);
            }
        });

        let sprite = new PIXI.Sprite(new PIXI.Texture(
            new PIXI.BaseTexture.fromCanvas(canvas),
            new PIXI.Rectangle(0, 0, canvasW, canvasH)
        ));
        sprite.alpha = 0.8;
        return sprite;
    }

    _drawText(f, g, h, x, y){
        const _ts = this,
            option = _ts.option,
            lineSize = option.lineSize,
            spotSize = option.spotSize;
        let group = new PIXI.Container(),
            style = {
                fontFamily: 'Arial',
                fontSize: 8 * devicePixelRatio,
                fill: 0x000000,
                align: 'left'
            },
            padding = lineSize * 3;
        f = new PIXI.Text(f, style);
        g = new PIXI.Text(g, style);
        h = new PIXI.Text(h, style);
        x = x * (spotSize + lineSize) + lineSize;
        y = y * (spotSize + lineSize) + lineSize;
        f.x = padding;
        f.y = padding;
        g.x = padding;
        g.y = spotSize - g.height - padding + 2;
        h.y = spotSize - h.height - padding + 2;
        h.x = spotSize - h.width - padding;
        group.addChild(f);
        group.addChild(g);
        group.addChild(h);
        group.x = x;
        group.y = y;
        return group;
    }
}

// 等待 PIXI.js 和 pixi-layers 加载完成
function waitForPIXI() {
    if (typeof PIXI !== 'undefined' && PIXI.display && PIXI.display.Group) {
        // PIXI 已加载，初始化演示
        let demo = new Demo();
        demo.init();
    } else {
        // 等待一段时间后重试
        setTimeout(waitForPIXI, 50);
    }
}

// 如果 DOM 已加载，直接检查；否则等待 DOM 加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForPIXI);
} else {
    waitForPIXI();
}
