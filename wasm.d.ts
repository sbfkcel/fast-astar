/* tslint:disable */
/* eslint-disable */

export class AstarGrid {
    free(): void;
    [Symbol.dispose](): void;
    batchFindPaths(requests: Int32Array): Int32Array;
    clearObstacles(): void;
    findPath(start_x: number, start_y: number, end_x: number, end_y: number, optimal_result: boolean): Int32Array;
    getHeight(): number;
    getObstacleCount(): number;
    getWidth(): number;
    isWalkable(x: number, y: number): boolean;
    constructor(width: number, height: number);
    setObstacle(x: number, y: number, is_obstacle: boolean): void;
    setObstaclesBatch(obstacles_data: Uint8Array): void;
    setObstaclesFromCoords(coords: Int32Array): void;
}

export class AstarGridSparse {
    free(): void;
    [Symbol.dispose](): void;
    clearObstacles(): void;
    findPath(start_x: bigint, start_y: bigint, end_x: bigint, end_y: bigint, optimal_result: boolean): Int32Array;
    getHeight(): bigint;
    getObstacleCount(): number;
    getWidth(): bigint;
    constructor(width: bigint, height: bigint);
    setObstacle(x: bigint, y: bigint, is_obstacle: boolean): void;
    setObstaclesFromCoords(coords: Int32Array): void;
}

export function getVersion(): string;

export function recommendedImpl(width: bigint, height: bigint): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_astargrid_free: (a: number, b: number) => void;
    readonly __wbg_astargridsparse_free: (a: number, b: number) => void;
    readonly astargrid_batchFindPaths: (a: number, b: number, c: number, d: number) => void;
    readonly astargrid_clearObstacles: (a: number) => void;
    readonly astargrid_findPath: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly astargrid_getHeight: (a: number) => number;
    readonly astargrid_getObstacleCount: (a: number) => number;
    readonly astargrid_getWidth: (a: number) => number;
    readonly astargrid_isWalkable: (a: number, b: number, c: number) => number;
    readonly astargrid_new: (a: number, b: number) => number;
    readonly astargrid_setObstacle: (a: number, b: number, c: number, d: number) => void;
    readonly astargrid_setObstaclesBatch: (a: number, b: number, c: number) => void;
    readonly astargrid_setObstaclesFromCoords: (a: number, b: number, c: number) => void;
    readonly astargridsparse_clearObstacles: (a: number) => void;
    readonly astargridsparse_findPath: (a: number, b: number, c: bigint, d: bigint, e: bigint, f: bigint, g: number) => void;
    readonly astargridsparse_getHeight: (a: number) => bigint;
    readonly astargridsparse_getObstacleCount: (a: number) => number;
    readonly astargridsparse_getWidth: (a: number) => bigint;
    readonly astargridsparse_new: (a: bigint, b: bigint) => number;
    readonly astargridsparse_setObstacle: (a: number, b: bigint, c: bigint, d: number) => void;
    readonly astargridsparse_setObstaclesFromCoords: (a: number, b: number, c: number) => void;
    readonly getVersion: (a: number) => void;
    readonly recommendedImpl: (a: bigint, b: bigint) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
