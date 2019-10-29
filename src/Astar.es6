const strToArr = str => str.split(',').map(Number);
class Astar{
    constructor(grid){
        const _ts = this;
        _ts.grid = grid;        // 保存传入地图网格
        _ts.openList = {};      // 开启列表
        _ts.closeList = {};     // 关闭列表（存放不需要再次检查的节点）
        _ts.current;            // 保存当前正在寻找的节点       
    }
    
    /**
     * 寻找路径
     * @param  {array} start <必填>，起始位置（[x,y]）
     * @param  {array} end <必填>，结束位置（[x,y]）
     * @return {array}  返回寻找到的路径
     */
    search(start,end,option){
        const _ts = this,
            defaultOption = {
                rightAngle:false,
                optimalResult:true
            };
        
        option = _ts.searchOption = option || {};
        
        for(let key in defaultOption){
            if(option[key] === undefined){
                option[key] = defaultOption[key];
            };
        };

        _ts.start = start;                                          // 记录开始点
        _ts.end = end;                                              // 记录结束点
        _ts.grid.get(start).value = 0;
        _ts.grid.set(start,'type','start');
        _ts.grid.get(end).value = 0;
        _ts.grid.set(end,'type','end');
        let result,eachSearch;
        
        // 将起点加入到开启列表
        _ts.openList[start] = null;
        _ts.grid.set(start,'type','open');
        (eachSearch = (node)=>{
            _ts.grid.set(node,'type','highlight');
            // 如果当前节点即结束节点，则说明找到终点
            if(_ts.grid.get(node) === _ts.grid.get(_ts.end)){
                result = _ts.getBackPath(node);
                // console.log('找到结束点',result);
            }else{
                let aroundNode = _ts.getAround(node);               // 得到四周有用的节点

                // 将四周有用的节点添加到开启列表
                for(let i=0,len=aroundNode.length; i<len; i++){
                    let item = aroundNode[i],
                        spot = _ts.grid.get(item);

                    // 如果网格不存在开启列表，则加入到开启列表并把选中的新方格作为父节点及计算其g、f、h值
                    if(_ts.openList[item] !== null){
                        _ts.openList[item] = null;
                        spot.parent = node;
                        spot.g = _ts.g(item,node);
                        spot.h = _ts.h(item,_ts.end);
                        spot.f = _ts.f(item);
                        _ts.grid.set(item,'type','open');
                    }
                    // 如果已经在开启列表里了，则检查该条路径是否会更好
                    // 检查新的路径g值是否会更低，如果更低则把该相邻方格的你节点改为目前选中的方格并重新计算其g、f、h
                    else{
                        let oldG = spot.g,
                            newG = _ts.g(item,node);
                        if(newG < oldG){
                            spot.parent = node;
                            spot.g = newG;
                            spot.f = _ts.f(item);
                            _ts.grid.set(item,'type','update');
                        };
                    };
                };
                // 从开启列表中删除点A并加入到关闭列表
                delete _ts.openList[node];
                _ts.closeList[node] = null;
                _ts.grid.set(node,'type','close');
                
                // 从开启列表中寻找最小的F值的项目，并将其加入到关闭列表
                let minItem = _ts.getOpenListMin();
                if(minItem){
                    eachSearch(minItem.key);
                };
            };
        })(start);
        return result;
    }

    getBackPath(xy){
        const _ts = this;
        let result = [xy],
            eachBack;
        (eachBack = xy => {
            let gridParent = _ts.grid.get(xy).parent;
            if(gridParent){
                result.unshift(gridParent);
                eachBack(gridParent);
            };
        })(xy);
        return result;
    }

    /**
     * 获取打开列表中，f值最小的索引值的项
     * @return {object|undefined} 返回打开列表中，f值最小的索引值
     */
    getOpenListMin(){
        const _ts = this;
        let data;
        for(let key in _ts.openList){
            let item = strToArr(key),
                itemData = _ts.grid.get(item);
            if(data === undefined || itemData.f < data.f){
                data = _ts.grid.get(item);
            };
        };
        return data;
    }

    /**
     * 获取指定网格的偏移目标
     * @param  {array} grid 网格坐标
     * @param  {array} offset 偏移位置
     * @return {array} 得到偏移的网格坐标
     */
    getOffsetGrid(grid,offset){
        let x = grid[0] + offset[0],
            y = grid[1] + offset[1];
        return [x,y];
    }
    
    /**
     * 获取当前节点四周的有效节点
     * @param  {array} grid <必填> 任意节点坐标
     * @return {array} 有效的节点列表
     */
    getAround(xy){
        const _ts = this;
        let searchOption = _ts.searchOption,
            result = [],
            grid = _ts.grid,
            obj = {
                'lt':[-1,-1],
                't':[0,-1],
                'rt':[1,-1],
                'r':[1,0],
                'rb':[1,1],
                'b':[0,1],
                'lb':[-1,1],
                'l':[-1,0]
            },
            isValid = (xy,place)=>{
                let neighbor = grid.get(_ts.getOffsetGrid(xy,place));
                return neighbor !== undefined && neighbor.value > 0 ? true : false;
            };
        // 如果是直角则删除交叉格式忽略
        if(searchOption.rightAngle){
            delete obj.lt;
            delete obj.rt;
            delete obj.rb;
            delete obj.lb;
        }else{
            // 如果左边有障碍物，则左上、左下忽略
            if(isValid(xy,obj.l)){
                delete obj.lt;
                delete obj.lb;
            };
            // 如果右边有障碍物，则右上、右下忽略
            if(isValid(xy,obj.r)){
                delete obj.rt;
                delete obj.rb;
            };
            // 如果顶上有障碍物，则左上，右则忽略
            if(isValid(xy,obj.t)){
                delete obj.lt;
                delete obj.rt;
            };
            // 如果底部有障碍物，则左下，右下忽略
            if(isValid(xy,obj.b)){
                delete obj.lb;
                delete obj.rb;
            };
        };
        
        for(let key in obj){
            let item = obj[key],
                _xy = [
                    xy[0] + item[0],
                    xy[1] + item[1]
                ],
                isClose = _ts.closeList[_xy] === null;
            if(
                _xy[0] > -1 && _xy[0] < grid.col &&                 // 判断水平边界
                _xy[1] > -1 && _xy[1] < grid.row &&                 // 判断纵向边界
                !isClose &&                                         // 已经关闭过的不检查
                grid.get(_xy).value < 1                             // 判断地图无障碍物（是可移动区域）
            ){
                result.push(_xy);
            };
        };
        return result;
    }

    /**
     * 得到当前节点的权重
     * @param {array} grid <必填> 需要计算的节点
     */
    f(grid){
        const _ts = this,
            item = _ts.grid.get(grid);
        return item.g + item.h;
    }

    /**
     * 从start到指定网络的移动成本（垂直、水平返回10，斜角返回14）
     * @param  {array} grid <必填>，子起点位置（[x,y]）
     * @param  {array} parent <必填>，父起点位置（[x,y]）
     * @return {number} 移动成本
     */
    g(grid,parent){
        return this.searchOption.optimalResult ? (parent[0] === grid[0] || parent[1] === grid[1] ? 10 : 14) + this.grid.get(parent).g : 0;
    }

    /**
     * 获取至目标点的估计移动成本（使用曼哈顿方法获取）
     * @param {array} 起始位置，x:number,y:number
     * @param {array} 结束位置，x:number,y:number
     * @return {number} 估计移动成本(曼哈顿值 * 10)
     */
    h(start,end){
        return (Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1])) * 10;
    }
};
export default Astar;