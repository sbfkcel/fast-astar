const obj = require('fast-astar'),
    Grid = obj.Grid,
    Astar = obj.Astar;

// Create a grid
let grid = new Grid({
        col:11,                  // col
        row:7,                   // row
        render:function(){       // Optional, this method is triggered when the grid point changes
            // console.log(this);
        }
    });

// Add obstacles to the grid
[[5,2],[5,3],[5,4]].forEach(item => {
    grid.set(item,'value',1);    // Values greater than 0 are obstacles
});

// Pass the grid as a parameter to the Astar object
let astar = new Astar(grid),
    path = astar.search(
        [2,3],                   // start
        [8,3],                   // end
        {                        // option
            rightAngle:false,    // default:false,Allow diagonal
            optimalResult:true   // default:true,In a few cases, the speed is slightly slower
        }
    );

console.log('Result',path);      // [[2,3],[3,2],[4,1],[5,1],[6,1],[7,2],[8,3]]