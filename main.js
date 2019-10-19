(()=>{
    let graphicObj = {};
    const spotSize = 20,
        col = 11,
        row = 7,
        lineW = 1,
        canvasW = (spotSize + lineW) * col + lineW,
        canvasH = (spotSize + lineW) * row + lineW,
        app = new PIXI.Application({
            width:canvasW,
            height:canvasH,
            antialias:true,
            backgroundColor:0xAAAAAA
        }),    
        draw = function(status){
            let grap = this.grap,
                x = this.x,
                y = this.y,
                val = this.value; 
            if(!grap){
                grap = this.grap = new PIXI.Graphics();
                app.stage.addChild(grap);
            };
            console.log({status:status,x:x,y:y,val:val});
            let colors = {};
            colors[0] = 0xFFFFFF;           // 可行走的颜色
            colors[1] = 0x000000;           // 障碍物颜色
            colors[-1] = 0x029B10;
            colors[-2] = 0xFF0000;
            
            grap.clear();
            grap.beginFill(colors[val]);
            grap.drawRect(x * (spotSize + lineW) + lineW, y * (spotSize + lineW) + lineW, spotSize, spotSize);
            grap.endFill();
        };
    document.body.appendChild(app.view);


    // 创建地图
    let map = new Map({
        col:col,
        row:row,
        render:function(status){
            draw.call(this,status);
        }
    });
    // 设置地图障碍物
    [[5,2],[5,3],[5,4]].forEach(item => {
        map.setValue(item,1);
    });
    // map.obstacle(5,1);

    // 初始化地图图形
    // for(let i=0,iLen=map.grid.length; i<iLen; i++){
    //     let row = map.grid[i];  // 即列
    //     for(let j=0,jLen=row.length; j<jLen; j++){
    //         let spot = row[j],
    //             grap = graphicObj[[j,i]] = new PIXI.Graphics();
    //         draw(j,i,spot.value);
    //         app.stage.addChild(grap);
    //     };
    // };
    
    let astar = new Astart(map);
    
    // // 获取四周有效点
    // astar.getAround([1,1]).forEach((item,index) => {
    //     console.log(item,index);
    // });

    console.log('搜索到的路径',astar.search([2,3],[8,3]));
    window.aa = astar;
    window.map = map;
})()