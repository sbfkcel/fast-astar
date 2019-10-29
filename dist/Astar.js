/*! Project:astar, Create:FWS 2019.10.29 15:21, Update:FWS 2019.10.29 15:48 */ 
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):"function"==typeof define&&(define.cmd||define.hjs)?define(function(require,exports,e){e.exports=t()}):e.Astar=t()}(this,function(){"use strict";var e=function(e){return e.split(",").map(Number)};return function(){function t(e){var t=this;t.grid=e,t.openList={},t.closeList={},t.current}return t.prototype.search=function(e,t,r){var n=this,i={rightAngle:!1,optimalResult:!0};r=n.searchOption=r||{};for(var o in i)r[o]===undefined&&(r[o]=i[o]);n.start=e,n.end=t,n.grid.get(e).value=0,n.grid.set(e,"type","start"),n.grid.get(t).value=0,n.grid.set(t,"type","end");var d,u;return n.openList[e]=null,n.grid.set(e,"type","open"),(u=function(e){if(n.grid.set(e,"type","highlight"),n.grid.get(e)===n.grid.get(n.end))d=n.getBackPath(e);else{for(var t=n.getAround(e),r=0,i=t.length;r<i;r++){var o=t[r],l=n.grid.get(o);if(null!==n.openList[o])n.openList[o]=null,l.parent=e,l.g=n.g(o,e),l.h=n.h(o,n.end),l.f=n.f(o),n.grid.set(o,"type","open");else{var s=l.g,g=n.g(o,e);g<s&&(l.parent=e,l.g=g,l.f=n.f(o),n.grid.set(o,"type","update"))}}delete n.openList[e],n.closeList[e]=null,n.grid.set(e,"type","close");var f=n.getOpenListMin();f&&u(f.key)}})(e),d},t.prototype.getBackPath=function(e){var t,r=this,n=[e];return(t=function(e){var i=r.grid.get(e).parent;i&&(n.unshift(i),t(i))})(e),n},t.prototype.getOpenListMin=function(){var t,r=this;for(var n in r.openList){var i=e(n),o=r.grid.get(i);(t===undefined||o.f<t.f)&&(t=r.grid.get(i))}return t},t.prototype.getOffsetGrid=function(e,t){return[e[0]+t[0],e[1]+t[1]]},t.prototype.getAround=function(e){var t=this,r=t.searchOption,n=[],i=t.grid,o={lt:[-1,-1],t:[0,-1],rt:[1,-1],r:[1,0],rb:[1,1],b:[0,1],lb:[-1,1],l:[-1,0]},d=function(e,r){var n=i.get(t.getOffsetGrid(e,r));return n!==undefined&&n.value>0};r.rightAngle?(delete o.lt,delete o.rt,delete o.rb,delete o.lb):(d(e,o.l)&&(delete o.lt,delete o.lb),d(e,o.r)&&(delete o.rt,delete o.rb),d(e,o.t)&&(delete o.lt,delete o.rt),d(e,o.b)&&(delete o.lb,delete o.rb));for(var u in o){var l=o[u],s=[e[0]+l[0],e[1]+l[1]],g=null===t.closeList[s];s[0]>-1&&s[0]<i.col&&s[1]>-1&&s[1]<i.row&&!g&&i.get(s).value<1&&n.push(s)}return n},t.prototype.f=function(e){var t=this,r=t.grid.get(e);return r.g+r.h},t.prototype.g=function(e,t){return this.searchOption.optimalResult?(t[0]===e[0]||t[1]===e[1]?10:14)+this.grid.get(t).g:0},t.prototype.h=function(e,t){return 10*(Math.abs(e[0]-t[0])+Math.abs(e[1]-t[1]))},t}()});