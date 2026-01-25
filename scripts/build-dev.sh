#!/bin/bash

# 🛠️ Rust WebAssembly 开发构建脚本
# 快速构建，保留调试信息，便于开发调试

echo "🛠️ Rust WebAssembly 开发构建"
echo "=================================================="

# 开发构建 - 快速编译，保留调试信息
build_dev() {
    echo "🔨 使用开发模式构建 WebAssembly..."
    
    cd "$(dirname "$0")/.."
    
    # 开发模式的编译器标志 - 优先编译速度
    export RUSTFLAGS="-C target-feature=+bulk-memory"
    
    # 使用 wasm-pack 开发构建
    wasm-pack build \
        --target web \
        --out-dir pkg \
        --dev \
        --out-name astar_wasm
    
    if [ $? -eq 0 ]; then
        echo "✅ 开发构建成功！"
        
        # 复制文件到根目录
        echo "📁 复制生成的文件..."
        cp pkg/astar_wasm.js wasm.js
        cp pkg/astar_wasm_bg.wasm astar.wasm
        sed -i '' "s/astar_wasm_bg\.wasm/astar.wasm/g" wasm.js
        
        # 开发模式保留 TypeScript 定义文件
        if [ -f "pkg/astar_wasm.d.ts" ]; then
            cp pkg/astar_wasm.d.ts wasm.d.ts
            echo "   - 复制 TypeScript 定义文件"
        fi
        
        # 显示构建结果
        echo ""
        echo "📊 开发构建结果:"
        if [ -f "wasm.js" ]; then
            size_js=$(wc -c < "wasm.js" 2>/dev/null || echo "0")
            echo "   - wasm.js: ${size_js} bytes"
        fi
        
        if [ -f "astar.wasm" ]; then
            size_wasm=$(wc -c < "astar.wasm" 2>/dev/null || echo "0")
            echo "   - astar.wasm: ${size_wasm} bytes"
        fi
        
        total_size=$((size_js + size_wasm))
        echo "   - 总大小: ${total_size} bytes"
        
        echo ""
        echo "💡 开发模式特点:"
        echo "   ✅ 快速编译"
        echo "   ✅ 保留调试信息"
        echo "   ✅ 包含 TypeScript 定义"
        echo "   ✅ 便于调试和开发"
        
        return 0
    else
        echo "❌ 开发构建失败"
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
    echo ""
    echo "🛠️ 开始开发构建..."
    
    if build_dev; then
        echo ""
        echo "🎉 开发构建完成！"
        echo "📖 测试: npm test"
        echo "🔄 热重载: 修改代码后重新运行此脚本"
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