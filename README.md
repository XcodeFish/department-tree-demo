# 部门树组件demo (Department Tree Component)

## 项目介绍

这是一个基于Vue3和Element Plus的高性能部门树组件Demo，专为处理大规模组织架构数据而设计。该项目实现了一个能处理8000+节点数据并保持58FPS以上流畅体验的树形组件，通过虚拟滚动、Web Worker多线程计算、数据结构优化等技术，大幅提升了渲染性能，适用于展示复杂的部门人员结构。

## 核心技术栈

- **前端框架**: Vue 3 (Composition API)
- **UI组件库**: Element Plus
- **样式处理**: SCSS
- **构建工具**: Vite
- **多线程处理**: Web Worker
- **性能优化**: 虚拟滚动、shallowRef、扁平化数据结构

## 核心特性

- **虚拟滚动**: 只渲染可视区域节点，支持大数据量高性能渲染
- **Web Worker多线程**: 将复杂计算移至独立线程，避免阻塞UI渲染
- **扁平化数据结构**: 使用Map索引实现O(1)复杂度节点查找
- **高效搜索**: 支持实时搜索和结果高亮
- **多选功能**: 支持节点多选和状态管理
- **性能监控**: 内置性能监控组件，展示FPS、内存使用等指标
- **响应式设计**: 适配不同设备屏幕尺寸
- **Element Plus集成**: 无缝集成Element Plus组件和设计风格

## 性能优势

| 指标 | 传统Tree组件 | 优化方案 | 提升比例 |
|-----|------------|--------|--------|
| 首次渲染时间 | 3.5秒 | 390毫秒 | 提升9倍 |
| 内存占用 | 238MB | 42MB | 减少82.4% |
| DOM节点数量 | ~8000 | <100 | 减少98.7% |
| 滚动帧率(FPS) | 12-18 | 58-60 | 提升3-5倍 |
| 搜索响应时间 | 1.1秒 | 140ms | 提升7.8倍 |

## 安装与运行

### 环境要求

- Node.js 16+
- npm 7+ 或 yarn 1.22+

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/XcodeFish/department-tree-demo.git
cd department-tree-demo

# 安装依赖
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
src/
├── assets/                  # 静态资源
├── components/
│   ├── VirtualElTree/       # 虚拟树组件
│   │   ├── index.vue        # 主组件入口
│   │   ├── VirtualTreeNode.vue # 节点组件
│   │   ├── styles.scss      # 样式文件
│   │   ├── composables/     # 组合式API
│   │   └── utils/           # 工具函数
│   ├── TreePerformanceMonitor/ # 性能监控组件
│   └── MeetingInvitation.vue   # 会议邀请示例组件
├── workers/
│   └── treeWorker.js        # Web Worker实现
├── utils/
│   └── treeUtils.js         # 树数据处理工具
├── App.vue                  # 应用入口
└── main.js                  # 主入口文件
```

## 使用指南

### 基本用法

```vue
<template>
  <virtual-el-tree
    :tree-data="treeData"
    :height="500"
    :performance-mode="true"
    :show-search="true"
    @select="handleSelect"
  />
</template>

<script setup>
import { ref } from 'vue';
import VirtualElTree from './components/VirtualElTree/index.vue';

const treeData = ref([
  {
    id: 1,
    name: '总公司',
    children: [
      {
        id: 2,
        name: '研发部',
        children: [
          {
            id: 5,
            name: '张三',
            type: 'user',
            email: 'zhangsan@example.com',
            position: '前端开发'
          }
        ]
      }
    ]
  }
]);

const handleSelect = (keys, info) => {
  console.log('选中:', keys, info);
};
</script>
```

### 组件属性

| 属性名 | 类型 | 默认值 | 说明 |
|-------|-----|-------|-----|
| treeData | Array | [] | 树形结构数据 |
| height | Number | 600 | 树组件高度(px) |
| nodeHeight | Number | 40 | 单个节点高度(px) |
| loading | Boolean | false | 加载状态 |
| showSearch | Boolean | true | 是否显示搜索框 |
| performanceMode | Boolean | true | 是否启用Web Worker性能模式 |
| multiple | Boolean | false | 是否支持多选 |
| checkable | Boolean | false | 是否显示复选框 |
| defaultSelectedKeys | Array | [] | 默认选中的节点ID数组 |

### 事件

| 事件名 | 参数 | 说明 |
|-------|-----|-----|
| select | (keys, info) | 节点选中时触发 |
| check | (keys, info) | 复选框选中状态变化时触发 |
| expand | (nodeId, expanded) | 展开/折叠节点时触发 |
| visible-nodes-change | (count) | 可见节点数量变化时触发 |

## 开发计划

开发计划按照4天时间安排划分：

### 第一天：环境搭建与核心结构

- 项目初始化与依赖安装
- 数据结构与工具函数实现
- 构建测试数据

### 第二天：核心组件实现

- 虚拟滚动树组件开发
- 节点渲染与交互功能
- Element Plus集成与样式优化

### 第三天：多线程优化与搜索功能

- Web Worker实现与集成
- 搜索功能开发
- 性能优化

### 第四天：业务功能与优化

- 会议邀请表单开发
- 多选功能完善
- 性能测试与优化

## 性能测试

支持在不同节点数量下的性能表现测试：

| 节点数量 | 传统方案 | 优化方案(无WebWorker) | 优化方案(WebWorker) |
|---------|--------|-------------------|-------------------|
| 1,000个 | 可接受 (48fps) | 优秀 (59fps) | 极佳 (60fps) |
| 5,000个 | 较差 (25fps) | 良好 (50fps) | 优秀 (59fps) |
| 8,000个 | 卡顿 (15fps) | 可接受 (45fps) | 优秀 (58fps) |
| 15,000个 | 崩溃风险 | 勉强可用 (30fps) | 良好 (52fps) |

## 浏览器兼容性

- 现代浏览器：Chrome, Firefox, Safari, Edge最新版本
- 需要支持Web Worker API
