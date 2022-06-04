const $id = id => document.getElementById(id),
    strToArray = str => str.split(',').map(Number),
    devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1;
class Demo{
    constructor(){
        const _ts = this;
        _ts.option = {          // 保存相关选项
            lineSize:2 * devicePixelRatio,
        };
        _ts.taskData = {        // 任务数据
            // '40,24':{
            //     start:undefined,
            //     end:undefined,
            //     obstacle:undefined,
            //     list:[]
            // },
            // ...
        };
        _ts.backObj = {         // 保存pixi精灵，用于重绘之前的移除
            text:{},
            path:undefined,
            highlight:undefined,
            graph:{} 
        };

        _ts.domBox = document.getElementById('app');
        _ts.domResult = document.getElementById('result');
        _ts.domBox.oncontextmenu = function(event){
            event.preventDefault();
            return false;
        };
        _ts.timer;              // 保存计时器
    }
    init(){
        const _ts = this;
        _ts.setOption();        // 初始化选项
        _ts.createApp();
    }
    // 获取当前任务数据
    getCurrentTaskData(){
        const _ts = this,
            option = _ts.option;
        return _ts.taskData[[option.col,option.row]];
    }

    // 设置选项
    setOption(){
        const _ts = this,
            list = ['grid','obstacle','rightAngle','speed','optimalResult'],
            option = _ts.option,
            dom = {},
            set = (key,val) => {
                switch (key) {
                    case 'grid':
                        let arrVal = val.split(',').map(Number),
                            lineSize = option.lineSize,
                            col,
                            row,
                            spotSize;
                        // 设置网格宽、高
                        col = option['col'] = arrVal[0];
                        row = option['row'] = arrVal[1];
                        _ts.taskData[[col,row]] = _ts.getCurrentTaskData() || {
                            start:undefined,
                            end:undefined,
                            obstacle:undefined,
                            list:[]
                        };

                        // 设置网格大小
                        if(arrVal[0] === 40){
                            spotSize = option['spotSize'] = 24 * devicePixelRatio;
                        }else{
                            spotSize = option['spotSize'] = 48 * devicePixelRatio;
                        };

                        // 设置画面宽高
                        option['canvasW'] = (spotSize + lineSize) * col + lineSize;
                        option['canvasH'] = (spotSize + lineSize) * row + lineSize;
                    break;
                    case 'obstacle':
                        option[key] = +val;
                        if(_ts.map){
                            _ts.getCurrentTaskData().obstacle = _ts.map.obstacle(option.obstacle,1);
                        };
                    break;
                    case 'speed':
                        option[key] = +val;
                    break;
                    case 'optimalResult':
                    case 'rightAngle':
                        option[key] = !!(+val);
                    break;
                };
            };
        for(let i=0,len=list.length; i<len; i++){
            let item = list[i];
            dom[item] = $id(item);

            // 如果本地已经有存储记录，则将表单的值初始为已存储的值
            let localItemVal = localStorage.getItem(item);
            if(localItemVal){
                dom[item].value = localItemVal;
            };

            // 初始化选项值
            set(item,localItemVal || dom[item].value);

            // 为dom绑定监听事件
            dom[item].onchange = function(){
                localStorage.setItem(item,this.value);
                set(item,this.value);
                _ts.clearDraw();

                // 如果是修改图地，则需要重新创建pixi app，修改其它选项则只需要重新初始绘制即可
                if(item === 'grid'){
                    _ts.createApp();
                }else{
                    _ts.drawInit();
                };
            };
        };
    }

    // 创建应用
    createApp(){
        const _ts = this,
            option = _ts.option;
        if(_ts.app){
            _ts.domBox.removeChild(_ts.app.view);
        };
        window.app = _ts.app = new PIXI.Application({
            width:option.canvasW,
            height:option.canvasH,
            antialias:true,
            backgroundColor:0xDDDDDD,
            forceCanvas:false
        });
        _ts.app.view.style.width = '1002px';
        _ts.app.view.style.height = '602px';
        _ts.domBox.appendChild(_ts.app.view);

        // 创建图层分组
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
        };
        for(let key in container){
            _ts.app.stage.addChild(container[key]);
        };

        // 初始画画图
        _ts.drawInit();
    }

    // 处理动画渲染数据
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
                // case 'highlight':
                // case 'open':
                // case 'close':
                // case 'update':
                default:
                    itemObj[type] = [x,y];
                break;
            };
        };
        if(Object.keys(itemObj).length){
            taskObj.list.push(itemObj);
        };
    }

    // 绘制初始化
    drawInit(){
        const _ts = this,
            option = _ts.option,
            map = _ts.map = new Grid({
                col:option.col,
                row:option.row,
                render:function(){
                    _ts.render.call(this,_ts);
                }
            }),
            taskData = _ts.getCurrentTaskData(),
            obstacle = taskData.obstacle,
            start = taskData.start || [0,0],
            end = taskData.end || [option.col-1,option.row-1];

        // 如果有旧的障碍物数据则使用旧的数据，否则则生成新的数据并保存
        if(obstacle){
            for(let key in obstacle){
                key = strToArray(key);
                map.set(key,'value',1);
            };
        }else{
            _ts.getCurrentTaskData().obstacle = map.obstacle(_ts.option.obstacle,1);
        };
        let astar = _ts.astar = new Astar(map),
            result = astar.search(start,end,{
                rightAngle:_ts.option.rightAngle,
                optimalResult:_ts.option.optimalResult
            }),
            text = result ? result.map(item => `[${item}]`) : 'No result';

        // 显示寻找结果
        _ts.domResult.innerHTML = text;
        if(result){
            _ts.domResult.className = "result";
        }else{
            _ts.domResult.className = "result result--notResult";
        };
        _ts.drawEventAndBackground();   // 绘制背景层
        _ts.drawStartEnd();             // 绘制起止点
        _ts.drawTask();                 // 绘制任务
    }

    // 清除绘制
    clearDraw(){
        const _ts = this,
            option = _ts.option,
            container = _ts.pixiContainer;
        // 清除旧的动画数据
        _ts.getCurrentTaskData().list = [];

        // 清除当前正在执行的动画
        if(_ts.timer){
            clearTimeout(_ts.timer);
        };
        
        // 删除所有绘图
        for(let key in container){
            let itemContainer = container[key];
            // itemContainer.children.forEach(item => {
            //     item.destroy({
            //         children:true,
            //         texture:true,
            //         baseTexture:true
            //     });
            // });

            itemContainer.removeChildren(0,itemContainer.children.length);
        };
    }

    // 绘制背景&绑定事件
    drawEventAndBackground(){
        const _ts = this,
            map = _ts.map,
            gridList = map.grid,
            taskData = _ts.getCurrentTaskData(),
            obstacle = taskData.obstacle;
        for(let i=0,iLen=gridList.length; i<iLen; i++){
            let item = gridList[i];
            for(let j=0,jLen=item.length; j<jLen; j++){
                let spot = item[j],
                    x = spot.x,
                    y = spot.y,
                    color = spot.value === 0 ? 0xFFFFFF : 0x000000,
                    bg,ev;
                // 添加背景精灵
                bg = _ts._drawSquare(color,x,y);
                bg.parentGroup = _ts.pixiGroup.background;
                _ts.pixiContainer.background.addChild(bg);

                // 添加事件精灵
                ev = _ts._drawSquare(color,x,y)
                ev.xy = [x,y];
                ev.interactive = true;
                ev.cursor = 'pointer';
                ev.alpha = 0;
                ev.parentGroup = _ts.pixiGroup.event;
                _ts.pixiContainer.event.addChild(ev);
                ev.mousedown = function(event){
                    // console.log('左键',this.xy);
                    taskData.start = taskData.end;
                    taskData.end = this.xy;
                    _ts.clearDraw();
                    _ts.drawInit();
                };
                ev.rightdown = function(event){
                    // console.log('右键',this.xy,obstacle);
                    if(obstacle[this.xy] === null){
                        delete obstacle[this.xy];
                    }else if(obstacle[this.xy] === undefined){
                        obstacle[this.xy] = null;
                    };
                    _ts.clearDraw();
                    _ts.drawInit();
                };
            };
        };
    }

    // 绘制起止点
    drawStartEnd(){
        const _ts = this,
            data = _ts.getCurrentTaskData();
        [data.start,data.end].forEach((item,index)=>{
            let color = !index ? 0xFF0000 : 0x007FFF,
                x = item[0],
                y = item[1],
                grap = _ts._drawRound(color,x,y);
            grap.parentGroup = _ts.pixiGroup.startEnd;
            _ts.pixiContainer.startEnd.addChild(grap);
        });
    }

    // 绘制任务演示
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
            destroyOption = {children:true,texture:true,baseTexture:true};
        (drawEach = index => {
            taskLen = task.length;
            if(taskLen > index){
                let data = task[index],
                    draw = ()=>{
                        for(let key in data){
                            let item = data[key],
                                x = item[0],
                                y = item[1],
                                spot = astar.grid.get(item),
                                color,
                                grap,
                                f,
                                g,
                                h;
                            if(item && key !== 'time'){
                                if((key === 'open' || key === 'update') && option.col === 20){
                                    f = spot.f;
                                    g = spot.g;
                                    h = spot.h;
                                    if(f){
                                        if(backObj.text[item]){
                                            backObj.text[item].destroy(destroyOption);
                                            container.text.removeChild(backObj.text[item]);
                                        };
                                        
                                        grap = backObj.text[item] = _ts._drawText(f,g,h,x,y);
                                        grap.parentGroup = group.text;
                                        container.text.addChild(grap);
                                    };
                                };
                                switch (key) {
                                    case 'open':
                                    case 'close':
                                        color = key === 'open' ? 0xD4FFE0 : 0x00EDB6;
                                        // 删除旧的网络绘图
                                        if(backObj.graph[item]){
                                            backObj.graph[item].destroy(destroyOption);
                                            container.graph.removeChild(backObj.graph[item]);
                                        };
                                        grap = backObj.graph[item] = _ts._drawSquare(color,x,y);
                                        grap.parentGroup = group.graph;
                                        container.graph.addChild(grap);
                                    break;
                                    case 'highlight':
                                        // 高亮当前的格子
                                        color = 0x000000;
                                        if(backObj.highlight){
                                            backObj.highlight.destroy(destroyOption);
                                            container.highlight.removeChild(backObj.highlight);
                                        };
                                        grap = backObj.highlight = _ts._drawBorder(color,x,y);
                                        grap.parentGroup = group.highlight;
                                        container.highlight.addChild(grap);

                                        // 寻找当前路径
                                        let path = astar.getBackPath(item);
                                        if(path.length > 1){
                                            color = 0xFFFF00;
                                            if(backObj.path){
                                                backObj.path.destroy(destroyOption);
                                                container.path.removeChild(backObj.path);
                                            };
                                            grap = backObj.path = _ts._drawPath(color,path);
                                            grap.parentGroup = group.path;
                                            container.path.addChild(grap);
                                        };
                                    break;
                                };
                            };
                        };
                        drawEach(++index);
                    };
                if(index < taskLen){
                    _ts.timer = setTimeout(draw,option.speed); 
                };
            };
        })(0);
    }

    // 绘制方形
    _drawSquare(color,x,y){
        const _ts = this,
            option = _ts.option,
            spotSize = option.spotSize,
            lineSize = option.lineSize;

        let grap = new PIXI.Graphics()
        grap.clear();
        grap.beginFill(color);
        grap.drawRect(x * (spotSize + lineSize) + lineSize, y * (spotSize + lineSize) + lineSize, spotSize, spotSize);
        grap.endFill();
        return grap;
    }

    // 绘制圆
    _drawRound(color,x,y){
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
        grap.drawCircle(_x,_y,size);
        grap.endFill();
        return grap;
    }

    // 绘制边框
    _drawBorder(color,x,y){
        const _ts = this,
            option = _ts.option,
            spotSize = option.spotSize,
            lineSize = option.lineSize,
            grap = new PIXI.Graphics(),
            borderSize = ~~(spotSize / 10);
        grap.clear();
        grap.lineStyle(borderSize,color,0.3,0);
        grap.beginFill(color,0);
        grap.drawRect(x * (spotSize + lineSize) + lineSize, y * (spotSize + lineSize) + lineSize, spotSize, spotSize);
        grap.endFill();
        return grap;
    }

    // 绘制路径
    _drawPath(color,paths){
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
            drawRound = (ctx,x,y,size,color) => {
                ctx.beginPath();
                ctx.arc(x,y,size,0,2*Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
            };
        color = '#' + color.toString(16);
        canvas.width = canvasW;
        canvas.height = canvasH;
        canvas.style.background = 'orange';
        paths.forEach((item,index)=>{
            let x = item[0] * spotSize + spotSize / 2 + item[0] * lineSize + lineSize,
                y = item[1] * spotSize + spotSize / 2 + item[1] * lineSize + lineSize;
            if(index === 0){
                drawRound(ctx,x,y,radiuSize,color);     // 开始画圆修饰路径
                ctx.beginPath();                        // 开始路径
                ctx.lineWidth = pathSize;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = color;
                ctx.moveTo(x,y);
            }else{
                ctx.lineTo(x,y);
            };
            if(index === paths.length - 1){
                ctx.stroke();                           // 结束路径
                drawRound(ctx,x,y,radiuSize,color);     // 结束画圆修饰路径
            };
        });

        let sprite = new PIXI.Sprite(new PIXI.Texture(
            new PIXI.BaseTexture.fromDeprecated(canvas),
            new PIXI.Rectangle(0,0,canvasW,canvasH)
        ));
        sprite.alpha = 0.8;
        return sprite;
    }

    // 绘制文字
    _drawText = function(f,g,h,x,y){
        const _ts = this,
            option = _ts.option,
            lineSize = option.lineSize,
            spotSize = option.spotSize;
        let group = new PIXI.Container(),
            style = {
                fontFamily:'Arial',
                fontSize:8 * devicePixelRatio,
                fill:0x000000,
                align:'left'
            },
            padding = lineSize * 3;
        f = new PIXI.Text(f,style);
        g = new PIXI.Text(g,style);
        h = new PIXI.Text(h,style);
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
let demo = new Demo();
demo.init();