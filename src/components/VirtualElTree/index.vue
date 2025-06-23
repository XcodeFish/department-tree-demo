<!-- VirtualElTree/index.vue -->
<template>
  <div class="virtual-el-tree-container" :style="{ position: 'relative' }">
    <!-- 搜索框 -->
    <div v-if="showSearch" class="virtual-el-tree-search">
      <el-input
        v-model="searchValue"
        :placeholder="searchPlaceholder"
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
      />
    </div>

    <!-- 树内容 -->
    <el-empty v-if="!loading && !flattenedData.length" :description="emptyText" />

    <div v-else-if="loading" class="virtual-el-tree-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>

    <div
      v-else
      ref="scrollerRef"
      class="el-tree virtual-el-tree-content"
      :style="{ height: `${height}px`, overflow: 'auto' }"
      @scroll="handleScroll"
    >
      <div
        ref="containerRef"
        class="virtual-el-tree-height-holder"
        :style="{
          height: `${totalTreeHeight}px`,
          position: 'relative'
        }"
      >
        <div
          v-for="node in visibleNodes"
          :key="node.id"
          class="virtual-el-tree-node-container"
          :data-node-id="node.id"
          :style="{
            position: 'absolute',
            top: `${node.offsetTop}px`,
            left: 0,
            right: 0,
            height: `${nodeHeight}px`
          }"
        >
          <slot
            v-if="$slots.default"
            :node="node"
            :on-toggle="handleToggle"
            :on-select="handleSelect"
            :on-check="handleCheck"
            :selected="isNodeSelected(node)"
            :checked="isNodeChecked(node)"
          />
          <virtual-tree-node
            v-else
            :node="{
              ...node,
              selected: isNodeSelected(node),
              checked: isNodeChecked(node)
            }"
            :checkable="checkable"
            @toggle="handleToggle"
            @select="handleSelect"
            @check="handleCheck"
          />
        </div>
      </div>
    </div>

    <div v-if="searchLoading" class="virtual-el-tree-search-indicator">
      <el-icon class="is-loading"><Loading /></el-icon> 搜索中...
    </div>

    <div v-if="multiple && selectedKeys.length > 0" class="virtual-el-tree-selected-count">
      已选: {{ selectedKeys.length }}
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Search, Loading } from '@element-plus/icons-vue';
import { ElInput, ElEmpty, ElIcon } from 'element-plus';
import VirtualTreeNode from './VirtualTreeNode.vue';
import { processTreeData, isNodeVisible as checkNodeVisible, calculateVisibleNodes as calcVisibleNodes } from './utils/treeUtils';
import { useWorker } from './composables/useWorker';
import { useTreeState } from './composables/useTreeState';

/**
 * 组件属性定义
 */
const props = defineProps({
  /**
   * 树数据
   */
  treeData: {
    type: Array,
    default: () => []
  },
  /**
   * 容器高度
   */
  height: {
    type: Number,
    default: 600
  },
  /**
   * 节点高度
   */
  nodeHeight: {
    type: Number,
    default: 40
  },
  /**
   * 加载状态
   */
  loading: {
    type: Boolean,
    default: false
  },
  /**
   * 是否显示搜索框
   */
  showSearch: {
    type: Boolean,
    default: true
  },
  /**
   * 搜索框提示文字
   */
  searchPlaceholder: {
    type: String,
    default: '搜索部门/人员'
  },
  /**
   * 空状态文本
   */
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  /**
   * 性能模式（使用WebWorker）
   */
  performanceMode: {
    type: Boolean,
    default: true
  },
  /**
   * 支持多选
   */
  multiple: {
    type: Boolean,
    default: false
  },
  /**
   * 显示复选框
   */
  checkable: {
    type: Boolean,
    default: false
  },
  /**
   * 默认选中的节点键值
   */
  defaultSelectedKeys: {
    type: Array,
    default: () => []
  },
  /**
   * 默认勾选的节点键值
   */
  defaultCheckedKeys: {
    type: Array,
    default: () => []
  },
  /**
   * 默认展开的节点键值
   */
  defaultExpandedKeys: {
    type: Array,
    default: () => []
  }
});

/**
 * 定义组件事件
 */
const emit = defineEmits([
  'select',
  'check',
  'expand',
  'visible-nodes-change',
  'search'
]);

// DOM引用
const scrollerRef = ref(null);
const containerRef = ref(null);

// 搜索相关状态
const searchValue = ref('');
const searchLoading = ref(false);

// 使用shallowRef优化大数组性能
const nodeMapRef = ref(new Map());
const visibilityCache = ref(new Map());

// 状态定义
const selectedKeys = ref(props.defaultSelectedKeys || []);
const checkedKeys = ref(props.defaultCheckedKeys || []);
const expandedKeys = ref(props.defaultExpandedKeys || []);
const visibleNodes = shallowRef([]);
const totalTreeHeight = ref(0);
const scrollTop = ref(0);
const workerRef = ref(null);

// 数据处理 - 使用Vue3 computed避免重复计算
const processedData = computed(() => {
  const processed = processTreeData(props.treeData || []);
  nodeMapRef.value = processed.nodeMap;
  visibilityCache.value = processed.visibilityCache;
  return processed;
});

const flattenedData = computed(() => processedData.value.flattenedData || []);

/**
 * 判断节点是否被选中
 */
function isNodeSelected(node) {
  return selectedKeys.value.includes(node.id);
}

/**
 * 判断节点是否被勾选
 */
function isNodeChecked(node) {
  return checkedKeys.value.includes(node.id);
}

/**
 * 处理节点点击选择
 */
function handleSelect(nodeId) {
  if (props.multiple) {
    // 多选模式
    const index = selectedKeys.value.indexOf(nodeId);
    if (index > -1) {
      // 如果已选中，则移除
      selectedKeys.value.splice(index, 1);
      emit('select', [...selectedKeys.value], { selected: false, nodeIds: [nodeId] });
    } else {
      // 如果未选中，则添加
      selectedKeys.value.push(nodeId);
      emit('select', [...selectedKeys.value], { selected: true, nodeIds: [nodeId] });
    }
  } else {
    // 单选模式
    selectedKeys.value = [nodeId];
    emit('select', selectedKeys.value, { node: nodeMapRef.value.get(nodeId), selected: true });
  }
}

/**
 * 处理节点展开/折叠
 */
function handleToggle(nodeId) {
  const node = nodeMapRef.value.get(nodeId);
  if (!node) return;

  // 更新节点展开状态
  node.expanded = !node.expanded;

  // 更新展开键数组
  const index = expandedKeys.value.indexOf(nodeId);
  if (node.expanded && index === -1) {
    expandedKeys.value.push(nodeId);
  } else if (!node.expanded && index > -1) {
    expandedKeys.value.splice(index, 1);
  }

  // 发送事件
  emit('expand', nodeId, node.expanded);

  if (props.performanceMode && workerRef.value) {
    workerRef.value.postMessage({
      type: 'toggleNode',
      nodeId
    });
  } else {
    // 清除可见性缓存
    visibilityCache.value.clear();
    
    // 重新计算可见节点
    updateVisibleNodes(scrollTop.value);
  }
}

/**
 * 处理复选框选中
 */
function handleCheck(nodeId, checked) {
  if (props.checkable) {
    const index = checkedKeys.value.indexOf(nodeId);
    if (index > -1 && !checked) {
      // 如果已选中且取消选中
      checkedKeys.value.splice(index, 1);
      emit('check', [...checkedKeys.value], { checked: false, nodeIds: [nodeId] });
    } else if (index === -1 && checked) {
      // 如果未选中且选中
      checkedKeys.value.push(nodeId);
      emit('check', [...checkedKeys.value], { checked: true, nodeIds: [nodeId] });
    }
  }
}

/**
 * 处理滚动事件
 */
function handleScroll(e) {
  scrollTop.value = e.target.scrollTop;

  // 使用requestAnimationFrame优化滚动性能
  window.requestAnimationFrame(() => {
    updateVisibleNodes(scrollTop.value);
  });
}

/**
 * 更新可见节点
 */
function updateVisibleNodes(scrollPosition) {
  if (props.performanceMode && workerRef.value) {
    const buffer = Math.ceil(props.height / props.nodeHeight) * 2;

    workerRef.value.postMessage({
      type: 'updateVisibleNodes',
      scrollTop: scrollPosition,
      viewportHeight: props.height,
      buffer
    });
  } else {
    // 获取扁平化数据
    const flattenedData = [];
    for (const node of nodeMapRef.value.values()) {
      flattenedData.push(node);
    }

    // 计算可见节点
    const result = calcVisibleNodes(
      flattenedData,
      nodeMapRef.value,
      visibilityCache.value,
      scrollPosition,
      props.height,
      props.nodeHeight,
      Math.ceil(props.height / props.nodeHeight) * 2
    );

    visibleNodes.value = result.visibleNodes;
    totalTreeHeight.value = result.totalHeight;
    emit('visible-nodes-change', result.visibleNodes.length);
  }
}

/**
 * 处理搜索功能
 */
function handleSearch(term) {
  searchLoading.value = true;
  searchValue.value = term;

  // 搜索处理
  if (props.performanceMode && workerRef.value) {
    workerRef.value.postMessage({
      type: 'search',
      searchTerm: term
    });
  } else {
    // 重置缓存
    visibilityCache.value.clear();
    
    // 主线程搜索处理
    if (!term) {
      // 重置搜索状态
      flattenedData.value.forEach(node => {
        delete node.matched;
      });
    } else {
      const termLower = term.toLowerCase();

      // 标记匹配的节点
      flattenedData.value.forEach(node => {
        // 部门和人员都支持搜索
        const isMatch = node.name.toLowerCase().includes(termLower) ||
                      (node.email && node.email.toLowerCase().includes(termLower)) ||
                      (node.position && node.position.toLowerCase().includes(termLower));
        node.matched = isMatch;
        
        // 展开包含匹配节点的路径
        if (isMatch) {
          let currentId = node.parentId;
          while (currentId) {
            const parent = nodeMapRef.value.get(currentId);
            if (parent) {
              parent.expanded = true;
              currentId = parent.parentId;
            } else {
              break;
            }
          }
        }
      });
    }

    // 更新视图
    updateVisibleNodes(scrollTop.value);
    searchLoading.value = false;
  }

  emit('search', term);
}

/**
 * 初始化Web Worker
 */
function initializeWorker() {
  if (window.Worker && props.performanceMode) {
    // 清理旧Worker
    if (workerRef.value) {
      workerRef.value.terminate();
    }

    try {
      // 创建Worker实例
      workerRef.value = new Worker('/src/workers/treeWorker.js');

      // 注册消息处理函数
      workerRef.value.onmessage = (e) => {
        const { type, ...data } = e.data;

        switch (type) {
          case 'initialized':
            totalTreeHeight.value = data.totalHeight;
            updateVisibleNodes(scrollTop.value);
            break;

          case 'visibleNodesUpdated':
            visibleNodes.value = data.visibleNodes;
            totalTreeHeight.value = data.totalHeight;
            emit('visible-nodes-change', data.visibleNodes.length);
            break;

          case 'nodeToggled':
            totalTreeHeight.value = data.totalHeight;
            updateVisibleNodes(scrollTop.value);
            emit('expand', data.nodeId, data.expanded);
            break;

          case 'searchComplete':
            searchLoading.value = false;
            updateVisibleNodes(scrollTop.value);
            break;
        }
      };

      // 发送初始化数据给Worker
      workerRef.value.postMessage({
        type: 'initialize',
        flattenedData: flattenedData.value
      });
    } catch (err) {
      console.error('Failed to initialize tree worker:', err);
      // 回退到主线程处理
      updateVisibleNodes(scrollTop.value);
    }
  } else {
    // 回退到主线程计算
    updateVisibleNodes(scrollTop.value);
  }
}

// 监听数据变化，重新初始化树
watch(() => props.treeData, () => {
  if (props.treeData.length) {
    initializeWorker();
  }
}, { immediate: true });

// 清理资源
onUnmounted(() => {
  if (workerRef.value) {
    workerRef.value.terminate();
    workerRef.value = null;
  }
});
</script>

<style lang="scss">
@import './styles.scss';

/* 自定义动画 */
@keyframes rotating {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style> 