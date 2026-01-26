/* @ts-self-types="./astar_wasm.d.ts" */
export class AstarGrid {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AstarGridFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_astargrid_free(ptr, 0);
    }
    /**
     * @param {Int32Array} requests
     * @returns {Int32Array}
     */
    batchFindPaths(requests) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray32ToWasm0(requests, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.astargrid_batchFindPaths(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayI32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 4, 4);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    clearObstacles() {
        wasm.astargrid_clearObstacles(this.__wbg_ptr);
    }
    /**
     * @param {number} start_x
     * @param {number} start_y
     * @param {number} end_x
     * @param {number} end_y
     * @param {boolean} optimal_result
     * @returns {Int32Array}
     */
    findPath(start_x, start_y, end_x, end_y, optimal_result) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.astargrid_findPath(retptr, this.__wbg_ptr, start_x, start_y, end_x, end_y, optimal_result);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayI32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    getHeight() {
        const ret = wasm.astargrid_getHeight(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    getObstacleCount() {
        const ret = wasm.astargrid_getObstacleCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    getWidth() {
        const ret = wasm.astargrid_getWidth(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isWalkable(x, y) {
        const ret = wasm.astargrid_isWalkable(this.__wbg_ptr, x, y);
        return ret !== 0;
    }
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        const ret = wasm.astargrid_new(width, height);
        this.__wbg_ptr = ret >>> 0;
        AstarGridFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} is_obstacle
     */
    setObstacle(x, y, is_obstacle) {
        wasm.astargrid_setObstacle(this.__wbg_ptr, x, y, is_obstacle);
    }
    /**
     * @param {Uint8Array} obstacles_data
     */
    setObstaclesBatch(obstacles_data) {
        const ptr0 = passArray8ToWasm0(obstacles_data, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.astargrid_setObstaclesBatch(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Int32Array} coords
     */
    setObstaclesFromCoords(coords) {
        const ptr0 = passArray32ToWasm0(coords, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.astargrid_setObstaclesFromCoords(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) AstarGrid.prototype[Symbol.dispose] = AstarGrid.prototype.free;
export class AstarGridSparse {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AstarGridSparseFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_astargridsparse_free(ptr, 0);
    }
    clearObstacles() {
        wasm.astargridsparse_clearObstacles(this.__wbg_ptr);
    }
    /**
     * @param {bigint} start_x
     * @param {bigint} start_y
     * @param {bigint} end_x
     * @param {bigint} end_y
     * @param {boolean} optimal_result
     * @returns {Int32Array}
     */
    findPath(start_x, start_y, end_x, end_y, optimal_result) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.astargridsparse_findPath(retptr, this.__wbg_ptr, start_x, start_y, end_x, end_y, optimal_result);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayI32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {bigint}
     */
    getHeight() {
        const ret = wasm.astargridsparse_getHeight(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    getObstacleCount() {
        const ret = wasm.astargridsparse_getObstacleCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {bigint}
     */
    getWidth() {
        const ret = wasm.astargridsparse_getWidth(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {bigint} width
     * @param {bigint} height
     */
    constructor(width, height) {
        const ret = wasm.astargridsparse_new(width, height);
        this.__wbg_ptr = ret >>> 0;
        AstarGridSparseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {bigint} x
     * @param {bigint} y
     * @param {boolean} is_obstacle
     */
    setObstacle(x, y, is_obstacle) {
        wasm.astargridsparse_setObstacle(this.__wbg_ptr, x, y, is_obstacle);
    }
    /**
     * @param {Int32Array} coords
     */
    setObstaclesFromCoords(coords) {
        const ptr0 = passArray32ToWasm0(coords, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.astargridsparse_setObstaclesFromCoords(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) AstarGridSparse.prototype[Symbol.dispose] = AstarGridSparse.prototype.free;
/**
 * @returns {string}
 */
export function getVersion() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.getVersion(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export2(deferred1_0, deferred1_1, 1);
    }
}
/**
 * @param {bigint} width
 * @param {bigint} height
 * @returns {number}
 */
export function recommendedImpl(width, height) {
    const ret = wasm.recommendedImpl(width, height);
    return ret;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
    };
    return {
        __proto__: null,
        "./astar_wasm_bg.js": import0,
    };
}
const AstarGridFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_astargrid_free(ptr >>> 0, 1));
const AstarGridSparseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_astargridsparse_free(ptr >>> 0, 1));
function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}
let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}
let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}
function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}
let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}
function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
let WASM_VECTOR_LEN = 0;
let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}
async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);
                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                } else { throw e; }
            }
        }
        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);
        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}
function initSync(module) {
    if (wasm !== undefined) return wasm;
    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }
    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }
    if (module_or_path === undefined) {
        module_or_path = new URL('astar.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();
    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }
    const { instance, module } = await __wbg_load(await module_or_path, imports);
    return __wbg_finalize_init(instance, module);
}
export { initSync, __wbg_init as default };
