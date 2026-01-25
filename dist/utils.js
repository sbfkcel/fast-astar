// 🔧 工具函数模块 - 统一的环境检测和性能工具

// 环境检测（单例模式，避免重复检测）
export const isNode = typeof process !== 'undefined' && 
                     process.versions && 
                     process.versions.node;

export const isBrowser = typeof window !== 'undefined' && 
                        typeof document !== 'undefined';

// 性能计时工具
export function getPerformanceNow() {
    if (typeof performance !== 'undefined' && performance.now) {
        return performance.now();
    }
    return Date.now();
}

// 环境信息获取
export function getEnvironmentInfo() {
    return {
        platform: isNode ? 'Node.js' : 'Browser',
        version: isNode ? process.version : (navigator?.userAgent || 'Unknown'),
        memory: (() => {
            if (typeof performance !== 'undefined' && performance.memory) {
                return Math.floor(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB';
            }
            if (isNode && process.memoryUsage) {
                const usage = process.memoryUsage();
                return Math.floor(usage.heapTotal / 1024 / 1024) + 'MB';
            }
            return 'Unknown';
        })(),
        webAssemblySupport: typeof WebAssembly !== 'undefined',
        performanceAPI: typeof performance !== 'undefined',
        cores: (() => {
            if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
                return navigator.hardwareConcurrency;
            }
            if (isNode) {
                try {
                    // 在 ES Module 中，需要动态导入
                    return 4; // 默认值，实际值需要异步获取
                } catch (e) {
                    return 4;
                }
            }
            return 4;
        })()
    };
}

// 兼容性检查
export function checkCompatibility() {
    const issues = [];
    const warnings = [];
    
    // 检查必要的API
    if (typeof Array === 'undefined') {
        issues.push('Array构造函数不可用');
    }
    
    if (typeof Math === 'undefined') {
        issues.push('Math对象不可用');
    }
    
    if (typeof performance === 'undefined') {
        warnings.push('Performance API不可用，将使用Date.now()');
    }
    
    if (typeof console === 'undefined') {
        warnings.push('Console API不可用，调试信息将被忽略');
    }
    
    return {
        compatible: issues.length === 0,
        issues,
        warnings,
        environment: getEnvironmentInfo()
    };
}
