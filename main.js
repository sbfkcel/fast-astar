(()=>{
    const spotSize = 40,
        col = 20,
        row = 20,
        lineW = 1,
        canvasW = (spotSize + lineW) * col + lineW,
        canvasH = (spotSize + lineW) * row + lineW,
        app = new PIXI.Application({
            width:canvasW,
            height:canvasH,
            antialias:true,
            backgroundColor:0xAAAAAA
        }),
        demoTask = {
            start:undefined,
            end:undefined,
            list:[]
        },

        // 绘制方形
        drawSquare = function(color,x,y){
            let grap = new PIXI.Graphics()
            grap.clear();
            grap.beginFill(color);
            grap.drawRect(x * (spotSize + lineW) + lineW, y * (spotSize + lineW) + lineW, spotSize, spotSize);
            grap.endFill();
            return grap;
        },

        // 绘制圆
        drawRound = function(color,x,y){
            let grap = new PIXI.Graphics(),
                size = spotSize / 4,
                _x = spotSize / 2 + 1 + x * (spotSize + 1),
                _y = spotSize / 2 + 1 + y * (spotSize + 1);
            grap.clear();
            grap.beginFill(color);
            grap.drawCircle(_x,_y,size);
            grap.endFill();
            return grap;
        },

        // 绘制边框
        drawBorder = function(color,x,y){
            let grap = new PIXI.Graphics(),
                lineSize = 4;
            grap.clear();
            grap.lineStyle(lineSize,color,0.3,0);
            grap.beginFill(color,0);
            grap.drawRect(x * (spotSize + lineW) + lineW, y * (spotSize + lineW) + lineW, spotSize, spotSize);
            grap.endFill();
            return grap;
        },

        // 绘制圆角路径
        drawPath = function(color,paths){
            let lineSize = spotSize / 4,
                radiuSize = lineSize / 2,
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
                let x = item[0] * spotSize + spotSize / 2 + item[0] * 1 + 1,
                    y = item[1] * spotSize + spotSize / 2 + item[1] * 1 + 1;
                if(index === 0){
                    
                    drawRound(ctx,x,y,radiuSize,color);

                    ctx.beginPath();
                    ctx.lineWidth = lineSize;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = color;
                    ctx.moveTo(x,y);
                }else{
                    ctx.lineTo(x,y);
                };

                // 结束时画圆
                if(index === paths.length - 1){
                    ctx.stroke();
                    drawRound(ctx,x,y,radiuSize,color);
                };
            });

            let sprite = new PIXI.Sprite(new PIXI.Texture(
                new PIXI.BaseTexture.fromCanvas(canvas),
                new PIXI.Rectangle(0,0,canvasW,canvasH)
            ));
            sprite.alpha = 0.8;

            return sprite;
        },

        // 绘制文字
        drawText = function(f,g,h,x,y){
            let group = new PIXI.Container(),
                style = {
                    fontFamily:'Arial',
                    fontSize:8,
                    fill:0x000000,
                    align:'left'
                },
                padding = 2;
            f = new PIXI.Text(f,style);
            g = new PIXI.Text(g,style);
            h = new PIXI.Text(h,style);
            x = x * (spotSize + lineW) + lineW;
            y = y * (spotSize + lineW) + lineW;
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
        },
        
        render = function(obj){
            const _ts = this;

            let x = _ts.x,
                y = _ts.y,
                type = _ts.type,
                itemObj = {};
            
            if(type){
                switch (type) {
                    case 'start':
                    case 'end':
                        demoTask[type] = [x,y];
                    break;
                    case 'highlight':
                    case 'open':
                    case 'close':
                    case 'update':
                        itemObj[type] = [x,y];
                        itemObj.time = 5;
                    break;
                };
            };
            if(Object.keys(itemObj).length){
                demoTask.list.push(itemObj);
            };
        };
    // app.view.style.width = canvasW / 2 + 'px';
    // app.view.style.height = canvasH / 2 + 'px';
    document.body.appendChild(app.view);

    // 创建地图
    let map = new Map({
        col:col,
        row:row,
        render:render
    });

    // 设置地图障碍物
    // [[19,10],[20,10],[21,10],[22,10],[19,11],[19,12],[19,13],[19,14],[20,14],[21,14],[21,12],[22,12]].forEach(item => {
    //     map.get(item).value = 1;
    // });

    map.obstacle(30,1);
    
    let astar = new Astart(map),
        result = astar.search([0,0],[19,19],{rightAngle:false}),
        text = result ? '寻找到的路径：'+result : '路线不通';

    document.getElementById('result').innerHTML = text;


    (()=>{
        window.task = demoTask;

        // 创建图层
        let group = {
                text: new PIXI.display.Group(5,true),
                startEnd: new PIXI.display.Group(4,true),
                path: new PIXI.display.Group(3,true),
                highlight: new PIXI.display.Group(2,true),
                graph: new PIXI.display.Group(1,true),
                background: new PIXI.display.Group(0,true)
            };
            
        app.stage = new PIXI.display.Stage();
        app.stage.sortableChildren = true;
        for(let key in group){
            app.stage.addChild(new PIXI.display.Layer(group[key]));
        };


        // 绘制背景
        let map = astar.grid.grid,
            backgroundContainer = new PIXI.Container();
        app.stage.addChild(backgroundContainer);
        for(let i=0,iLen=map.length; i<iLen; i++){
            let item = map[i];
            for(let j=0,jLen=item.length; j<jLen; j++){
                let spot = item[j],
                    x = spot.x,
                    y = spot.y,
                    color = spot.value === 0 ? 0xFFFFFF : 0x000000,
                    bgGrap = drawSquare(color,x,y);
                bgGrap.parentGroup = group.background;
                backgroundContainer.addChild(bgGrap);
            };
        };

        // 绘制开始与结束点
        let startEndContainer = new PIXI.Container();
        app.stage.addChild(startEndContainer);
        [demoTask.start,demoTask.end].forEach((item,index)=>{
            let color = !index ? 0xFF0000 : 0x007FFF,
                x = item[0],
                y = item[1],
                grap = drawRound(color,x,y);
            grap.parentGroup = group.startEnd;
            startEndContainer.addChild(grap);
        });

        
        // 按任务列表开始绘制
        let drawEach,
            graphContainer = new PIXI.Container(),
            highlightContainer = new PIXI.Container(),
            pathContainer = new PIXI.Container(),
            textContainer = new PIXI.Container(),
            backObj = {
                text:{},
                path:undefined,
                highlight:undefined,
                graph:{} 
            };
        app.stage.addChild(graphContainer);
        app.stage.addChild(highlightContainer);
        app.stage.addChild(pathContainer);
        app.stage.addChild(textContainer);
        window.a = graphContainer;
        window.b = astar;

        let taskLen;
        (drawEach = index => {
            taskLen = demoTask.list.length;
            console.log(index,taskLen);
            
            if(taskLen > index){
                let data = demoTask.list[index],
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
                                if(key === 'open' || key === 'update'){
                                    f = spot.f;
                                    g = spot.g;
                                    h = spot.h;
                                    if(f){
                                        if(backObj.text[item]){
                                            textContainer.removeChild(backObj.text[item]);
                                        };
                                        
                                        grap = backObj.text[item] = drawText(f,g,h,x,y);
                                        grap.parentGroup = group.text;
                                        textContainer.addChild(grap);
                                    };
                                };
                                switch (key) {
                                    case 'open':
                                    case 'close':
                                        color = key === 'open' ? 0xD4FFE0 : 0x00EDB6;
                                        // 删除旧的网络绘图
                                        if(backObj.graph[item]){
                                            graphContainer.removeChild(backObj.graph[item]);
                                        };
                                        grap = backObj.graph[item] = drawSquare(color,x,y);
                                        grap.parentGroup = group.graph;
                                        graphContainer.addChild(grap);
                                    break;
                                    case 'highlight':
                                        // 高亮当前的格子
                                        color = 0x000000;
                                        if(backObj.highlight){
                                            highlightContainer.removeChild(backObj.highlight);
                                        };
                                        grap = backObj.highlight = drawBorder(color,x,y);
                                        grap.parentGroup = group.highlight;
                                        highlightContainer.addChild(grap);

                                        // 寻找当前路径
                                        let path = astar.getBackPath(item);
                                        if(path.length > 1){
                                            color = 0xFFFF00;
                                            if(backObj.path){
                                                pathContainer.removeChild(backObj.path);
                                            };
                                            grap = backObj.path = drawPath(color,path);
                                            grap.parentGroup = group.path;
                                            pathContainer.addChild(grap);
                                        };
                                    break;
                                };
                            };
                        };
                        //console.log(index,data);
                        drawEach(++index);
                    };
                if(index < taskLen){
                    setTimeout(draw,data.time); 
                };
                
            };
        })(0);
    })();
})()