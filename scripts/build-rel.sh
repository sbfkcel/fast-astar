#!/bin/bash

# 🚀 Rust WebAssembly 发布构建脚本
# 极致优化，最小文件大小，用于生产环境

echo "🚀 Rust WebAssembly 发布构建"
echo "=================================================="

# 发布构建 - 极致优化
build_release() {
    echo "🔥 使用发布模式构建 WebAssembly..."
    
    cd "$(dirname "$0")/.."
    
    # 发布模式的编译器标志 - 极致优化
    export RUSTFLAGS="-C target-feature=+simd128 -C target-feature=+bulk-memory -C target-feature=+sign-ext -C target-feature=+nontrapping-fptoint -C link-arg=--strip-debug -C link-arg=--strip-all"
    
    # 使用 wasm-pack 发布构建
    wasm-pack build \
        --target web \
        --out-dir pkg \
        --release \
        --out-name astar_wasm \
        -- \
        --no-default-features
    
    if [ $? -eq 0 ]; then
        echo "✅ 发布构建成功！"
        
        # 复制文件到根目录
        echo "📁 复制生成的文件..."
        cp pkg/astar_wasm.js wasm.js
        cp pkg/astar_wasm_bg.wasm astar.wasm
        sed -i '' "s/astar_wasm_bg\.wasm/astar.wasm/g" wasm.js
        
        # 复制 TypeScript 定义文件（如果存在）
        if [ -f "pkg/astar_wasm.d.ts" ]; then
            cp pkg/astar_wasm.d.ts wasm.d.ts
            echo "   - 复制 TypeScript 定义文件"
        fi
        
        # 优化 JavaScript 文件
        echo "🔧 优化 JavaScript 包装器..."
        
        # 移除注释和空行，压缩 JS
        sed -i '' '/^[[:space:]]*\/\//d; /^[[:space:]]*$/d' wasm.js 2>/dev/null || true
        
        # 显示优化结果
        echo ""
        echo "📊 发布优化结果:"
        if [ -f "wasm.js" ]; then
            size_js=$(wc -c < "wasm.js" 2>/dev/null || echo "0")
            echo "   - wasm.js: ${size_js} bytes"
        fi
        
        if [ -f "astar.wasm" ]; then
            size_wasm=$(wc -c < "astar.wasm" 2>/dev/null || echo "0")
            echo "   - astar.wasm: ${size_wasm} bytes"
        fi
        
        # 如果有 wasm-opt，使用最激进的优化
        if command -v wasm-opt &> /dev/null; then
            echo ""
            echo "🔥 使用 wasm-opt 超激进优化..."
            wasm-opt -Oz --enable-bulk-memory --enable-simd --enable-sign-ext --enable-nontrapping-float-to-int --strip-debug --strip-producers astar.wasm -o astar.wasm 2>/dev/null || {
                echo "⚠️  wasm-opt 优化失败，使用原始文件"
            }
            
            size_optimized=$(wc -c < "astar.wasm" 2>/dev/null || echo "0")
            echo "   - 超优化后: ${size_optimized} bytes"
        fi
        
        # 计算总大小和优化比例
        total_size=$((size_js + size_wasm))
        echo "   - 总大小: ${total_size} bytes"
        
        echo ""
        echo "🎯 发布模式特点:"
        echo "   ✅ 极致文件大小优化"
        echo "   ✅ 最高运行性能"
        echo "   ✅ 去除调试信息"
        echo "   ✅ 适合生产部署"
        
        return 0
    else
        echo "❌ 发布构建失败"
        return 1
    fi
}

# 主函数
main() {
    # 检查工具
    if ! command -v rustc &> /dev/null; then
        echo "❌ 未检测到 Rust"
        echo "💡 安装 Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    
    if ! command -v wasm-pack &> /dev/null; then
        echo "❌ 未检测到 wasm-pack"
        echo "💡 安装 wasm-pack: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"
        exit 1
    fi
    
    echo "✅ 工具检查通过"
    
    # 检查 wasm-opt
    if command -v wasm-opt &> /dev/null; then
        echo "✅ 检测到 wasm-opt - 将进行额外优化"
    else
        echo "⚠️  未检测到 wasm-opt - 建议安装以获得更好的优化"
        echo "💡 安装 wasm-opt: brew install binaryen (macOS) 或访问 https://github.com/WebAssembly/binaryen"
    fi
    
    echo ""
    echo "🚀 开始发布构建..."
    
    if build_release; then
        echo ""
        echo "🎉 发布构建完成！"
        echo "📖 测试: npm test"
        echo "🚀 部署: 文件已优化，可用于生产环境"
    else
        echo ""
        echo "❌ 构建失败"
        exit 1
    fi
}

# 运行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi