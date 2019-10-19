 
/**
* 取指定范围的随机整数
* @param {number} <必选> min 最小数
* @param {number} <必选> max 最大数
* @return {number} 返回范围内的整数
*/
function randomInt (min,max){
    return ~~(Math.random() * (max - min + 1)) + min;
};

// 网格节点
const Spot = function(x,y){
    const _ts = this;
    _ts.x = x;
    _ts.y = y;
    _ts.g = 0;
    _ts.h = 0;
    _ts.f = 0;
    _ts.value = 0;
    _ts.key = [x,y];
    _ts.render = function(){
        console.log('网格渲染');
    };
};

class Map{
    constructor(obj){
        const _ts = this;
        _ts.col = obj.col;      // 列，即宽
        _ts.row = obj.row;      // 行，即高
        _ts.grid = _ts.createGrid(obj.col,obj.row,obj.render);
    }

    /**
     * 为地图对象生成指定比例的障碍物
     * @param {number} scale <必选> 障碍物比例0-100
     * @param {number} type <必选> 障碍物类型，任意数字
     */
    obstacle(scale,type){
        const _ts = this;
        let amount = ~~(_ts.col * _ts.row * scale / 100),
            xy = [],
            maskMap;
        for(let i=0; i<amount; i++){
            (maskMap = ()=>{
                xy[0] = randomInt(0,_ts.col - 1);
                xy[1] = randomInt(0,_ts.row - 1);
                if(_ts.get(xy).value === 0){
                    _ts.setValue(xy,type);
                }else{
                    maskMap();
                };
            })()
        };
    }

    /**
     * 获取地图指定位置的方法
     * @param {array} xy <必填> 任意节点坐标
     * @return {spot} 当前位置的网格点
     */
    get(xy){
        return this.grid[xy[1]][xy[0]];
    }

    /**
     * 地图设置方法
     * @param {array} xy <必填> 任意节点坐标
     * @param {number} val <必选> 设置项目的值
     */
    setValue(xy,val){
        this.get(xy).value = val;
    }

    /**
     * 生成一个空的网格对象
     * @param {number} <必选> col 列，即宽
     * @param {number} <必选> row 行，即高
     * @return {object} 网格地图对象
     */
    createGrid(col,row,render){
        const _ts = this;
        let result = [];
        for(let i=0;i<row;i++){
            let wArr = (()=>{
                let wResult = [];
                for(let j=0;j<col;j++){
                    let spot = new Spot(j,i);
                    spot.render = render;
                    spot.render('first');
                    spot = new Proxy(spot,{
                        set(target,key,val){
                            //Reflect.set(target, key, val);
                            target[key] = val;
                            if(key === 'value' && typeof target.render === 'function'){
                                target.render('update');
                            };
                            target[key] = val;
                            return true;
                            // return Reflect.set(target, key, val);
                        },
                        get(target,key){
                            return target[key];
                        }
                    });
                    wResult[j] = spot;
                };
                return wResult;
            })();
            result.push(wArr);
        };
        return result;
    }

    getData(){
        const _ts = this,
            grid = _ts.grid;
        let result = [];
        for(let i=0,iLen=grid.length; i<iLen; i++){
            let item = grid[i];
            result.push((()=>{
                let row = [];
                for(let j=0,jLen=item.length; j<jLen; j++){
                    row.push(item[j].value);
                };
                return row;
            })());
        };
        return result;
    }
}