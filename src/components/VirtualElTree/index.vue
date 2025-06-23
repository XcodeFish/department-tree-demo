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
      <span>加载中...</span>
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
            :node="nodeWithSelectionState(node)"
            :on-toggle="handleToggle"
            :on-select="handleSelect"
            :on-check="handleCheck"
          />
          <virtual-tree-node
            v-else
            :node="nodeWithSelectionState(node)"
            :checkable="checkable"
            @toggle="handleToggle"
            @select="handleSelect"
            @check="handleCheck"
          />
        </div>
      </div>
    </div>

    <div v-if="searchLoading" class="virtual-el-tree-search-indicator">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>搜索中...</span>
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
import { processTreeData, isNodeVisible, calculateVisibleNodes } from '../../utils/treeUtils';
import { useWorker } from './composables/useWorker';
import { useTreeState } from './composables/useTreeState';

/**
 * 虚拟滚动树组件Props
 */
const props = defineProps({
  treeData: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 600
  },
  nodeHeight: {
    type: Number,
    default: 40
  },
  loading: {
    type: Boolean,
    default: false
  },
  showSearch: {
    type: Boolean,
    default: true
  },
  searchPlaceholder: {
    type: String,
    default: '搜索部门/人员'
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  performanceMode: {
    type: Boolean,
    default: true
  },
  multiple: {
    type: Boolean,
    default: false
  },
  checkable: {
    type: Boolean,
    default: false
  },
  defaultSelectedKeys: {
    type: Array,
    default: () => []
  },
  defaultCheckedKeys: {
    type: Array,
    default: () => []
  },
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
 * 添加选中状态到节点数据
 */
const nodeWithSelectionState = (node) => {
  if (!node) return null;
  return {
    ...node,
    selected: selectedKeys.value.includes(node.id),
    checked: checkedKeys.value.includes(node.id)
  };
};

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
  if (props.performanceMode && workerRef.value) {
    const node = nodeMapRef.value.get(nodeId);
    if (!node) return;

    // 更新本地节点状态
    node.expanded = !node.expanded;

    workerRef.value.postMessage({
      type: 'toggleNode',
      nodeId,
      expanded: node.expanded
    });
  } else {
    // 主线程处理展开/折叠
    const node = nodeMapRef.value.get(nodeId);
    if (!node) return;

    node.expanded = !node.expanded;
    visibleNodes.value = calculateVisibleNodes(scrollTop.value, props.height);

    // 重新计算树高度
    let visibleCount = 0;
    flattenedData.value.forEach(node => {
      if (isNodeVisible(node, nodeMapRef.value, visibilityCache.value)) {
        visibleCount++;
      }
    });
    totalTreeHeight.value = visibleCount * props.nodeHeight;
    emit('expand', nodeId, node.expanded);
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
    // 主线程计算可见节点
    visibleNodes.value = calculateVisibleNodesInMainThread(scrollPosition, props.height);
  }
}

/**
 * 非Worker模式下的可见节点计算
 */
function calculateVisibleNodesInMainThread(scrollPos, viewHeight) {
  if (!flattenedData.value || flattenedData.value.length === 0) {
    return [];
  }

  const buffer = Math.ceil(viewHeight / props.nodeHeight) * 2;
  const startIndex = Math.max(0, Math.floor(scrollPos / props.nodeHeight) - buffer);
  const visibleCount = Math.ceil(viewHeight / props.nodeHeight) + buffer * 2;

  const result = [];
  let currentTop = 0;
  let currentIndex = 0;

  for (let i = 0; i < flattenedData.value.length; i++) {
    const node = flattenedData.value[i];
    if (!node) continue;
    
    if (isNodeVisible(node, nodeMapRef.value, visibilityCache.value)) {
      if (currentIndex >= startIndex && currentIndex < startIndex + visibleCount) {
        result.push({
          ...node,
          offsetTop: currentTop,
          index: currentIndex
        });
      }
      currentTop += props.nodeHeight;
      currentIndex++;
    }
  }

  emit('visible-nodes-change', result.length);
  return result;
}

/**
 * 回退到主线程计算模式
 */
function fallbackToMainThread() {
  // 计算初始树高度
  let visibleCount = 0;
  flattenedData.value.forEach(node => {
    if (isNodeVisible(node, nodeMapRef.value, visibilityCache.value)) {
      visibleCount++;
    }
  });
  
  totalTreeHeight.value = visibleCount * props.nodeHeight;
  visibleNodes.value = calculateVisibleNodesInMainThread(scrollTop.value, props.height);
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
 * 初始化Worker或回退到主线程计算
 */
function initializeWorker() {
  // 确保flattenedData有值
  if (!flattenedData.value || !Array.isArray(flattenedData.value) || flattenedData.value.length === 0) {
    totalTreeHeight.value = 0;
    visibleNodes.value = [];
    return;
  }

  if (window.Worker && props.performanceMode) {
    // 清理旧Worker
    if (workerRef.value) {
      workerRef.value.terminate();
      workerRef.value = null;
    }

    try {
      workerRef.value = new Worker('/workers/treeWorker.js');

      workerRef.value.onmessage = (e) => {
        const { type, ...data } = e.data;

        switch (type) {
          case 'initialized':
            totalTreeHeight.value = data.totalHeight;
            updateVisibleNodes(scrollTop.value);
            break;

          case 'visibleNodesUpdated':
            if (Array.isArray(data.visibleNodes)) {
              visibleNodes.value = data.visibleNodes;
              totalTreeHeight.value = data.totalHeight;
              emit('visible-nodes-change', data.visibleNodes.length);
            }
            break;

          case 'nodeToggled':
            totalTreeHeight.value = data.totalHeight;
            updateVisibleNodes(scrollTop.value);
            emit('expand', data.nodeId, data.expanded);
            break;

          case 'searchComplete':
            searchLoading.value = false;
            updateVisibleNodes(scrollTop.value);
            emit('search', data.matchCount, data.matches);
            break;
        }
      };

      workerRef.value.onerror = (error) => {
        console.error('Web Worker错误:', error);
        fallbackToMainThread();
      };

      // 发送初始化数据给Worker
      workerRef.value.postMessage({
        type: 'initialize',
        flattenedData: flattenedData.value,
        nodeHeight: props.nodeHeight
      });
    } catch (error) {
      console.error('Worker初始化失败，回退到主线程计算', error);
      // 回退到主线程计算
      fallbackToMainThread();
    }
  } else {
    fallbackToMainThread();
  }
}

// Worker初始化和管理
watch(() => props.treeData, async () => {
  if (props.treeData && Array.isArray(props.treeData) && props.treeData.length > 0) {
    await nextTick();
    initializeWorker();
  } else {
    // 如果没有数据，设置为空数组
    visibleNodes.value = [];
    totalTreeHeight.value = 0;
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