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
            :selected="selectedKeys.includes(node.id)"
            :checked="checkedKeys.includes(node.id)"
          />
          <virtual-tree-node
            v-else
            :node="{
              ...node,
              selected: selectedKeys.includes(node.id),
              checked: checkedKeys.includes(node.id)
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
import { ref, shallowRef, computed, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Search, Loading } from '@element-plus/icons-vue';
import { ElInput, ElEmpty } from 'element-plus';
import VirtualTreeNode from './VirtualTreeNode.vue';
import { processTreeData } from '../../utils/treeUtils';

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
    default: false
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
  }
});

const emit = defineEmits([
  'select',
  'check',
  'expand',
  'visible-nodes-change'
]);

// 状态定义
const scrollerRef = ref(null);
const containerRef = ref(null);
const searchValue = ref('');
const searchLoading = ref(false);
const scrollTop = ref(0);
const totalTreeHeight = ref(0);
const selectedKeys = ref(props.defaultSelectedKeys || []);
const checkedKeys = ref(props.defaultSelectedKeys || []);

// 使用shallowRef优化大数组性能
const visibleNodes = shallowRef([]);
const workerRef = ref(null);
const nodeMapRef = ref(new Map());

// 数据处理 - 使用Vue3 computed避免重复计算
const processedData = computed(() => {
  const processed = processTreeData(props.treeData || []);
  nodeMapRef.value = processed.nodeMap;
  return processed;
});

const flattenedData = computed(() => processedData.value.flattenedData);

// Worker初始化和管理
watch(() => props.treeData, async () => {
  if (props.treeData.length) {
    await nextTick();
    initializeWorker();
  }
}, { immediate: true });

function initializeWorker() {
  if (window.Worker && props.performanceMode) {
    // 清理旧Worker
    if (workerRef.value) {
      workerRef.value.terminate();
    }

    try {
      workerRef.value = new Worker('/treeWorker.js');

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
    } catch (error) {
      console.error('Worker初始化失败，使用主线程计算:', error);
      fallbackToMainThread();
    }
  } else {
    // 回退到主线程计算（非高性能模式）
    fallbackToMainThread();
  }
}

// 回退到主线程计算
function fallbackToMainThread() {
  let visibleCount = 0;
  flattenedData.value.forEach(node => {
    if (isNodeVisible(node)) {
      visibleCount++;
    }
  });
  totalTreeHeight.value = visibleCount * props.nodeHeight;
  visibleNodes.value = calculateVisibleNodes(scrollTop.value, props.height);
}

// 更新可见节点
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
    visibleNodes.value = calculateVisibleNodes(scrollPosition, props.height);
  }
}

// 非Worker模式下的可见节点计算
function calculateVisibleNodes(scrollPos, viewHeight) {
  const buffer = Math.ceil(viewHeight / props.nodeHeight) * 2;
  const startIndex = Math.max(0, Math.floor(scrollPos / props.nodeHeight) - buffer);
  const visibleCount = Math.ceil(viewHeight / props.nodeHeight) + buffer * 2;

  const result = [];
  let currentTop = 0;
  let currentIndex = 0;

  for (let i = 0; i < flattenedData.value.length; i++) {
    const node = flattenedData.value[i];
    const isVisible = isNodeVisible(node);

    if (isVisible) {
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

// 非Worker模式下的节点可见性判断
function isNodeVisible(node) {
  if (!node.parentId) return true;

  let currentNode = node;
  while (currentNode.parentId) {
    const parent = nodeMapRef.value.get(currentNode.parentId);
    if (!parent || !parent.expanded) return false;
    currentNode = parent;
  }
  
  // 搜索过滤
  if (searchValue.value && !node.matched) {
    return false;
  }
  
  return true;
}

// 处理滚动事件
function handleScroll(e) {
  scrollTop.value = e.target.scrollTop;

  window.requestAnimationFrame(() => {
    updateVisibleNodes(scrollTop.value);
  });
}

// 处理节点展开/折叠
function handleToggle(nodeId) {
  if (props.performanceMode && workerRef.value) {
    const node = nodeMapRef.value.get(nodeId);
    if (!node) return;

    const newExpandedState = !node.expanded;
    node.expanded = newExpandedState;

    workerRef.value.postMessage({
      type: 'toggleNode',
      nodeId,
      expanded: newExpandedState
    });
  } else {
    // 主线程处理展开/折叠
    const node = nodeMapRef.value.get(nodeId);
    if (!node) return;

    node.expanded = !node.expanded;
    
    // 清除可见性缓存
    processedData.value.visibilityCache.clear();
    
    visibleNodes.value = calculateVisibleNodes(scrollTop.value, props.height);

    // 重新计算树高度
    let visibleCount = 0;
    flattenedData.value.forEach(node => {
      if (isNodeVisible(node)) {
        visibleCount++;
      }
    });
    totalTreeHeight.value = visibleCount * props.nodeHeight;
    emit('expand', nodeId, node.expanded);
  }
}

// 处理选择节点
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

// 处理复选框选中
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

// 处理搜索
function handleSearch(value) {
  searchLoading.value = true;

  if (props.performanceMode && workerRef.value) {
    workerRef.value.postMessage({
      type: 'search',
      searchTerm: value
    });
  } else {
    // 主线程搜索处理
    if (!value) {
      // 重置搜索状态
      flattenedData.value.forEach(node => {
        delete node.matched;
      });
      processedData.value.visibilityCache.clear();
    } else {
      const termLower = value.toLowerCase();

      // 标记匹配的节点
      flattenedData.value.forEach(node => {
        // 增强搜索：搜索名称、职位、部门名称、电话、邮箱
        const isMatch = node.name.toLowerCase().includes(termLower) ||
                      (node.email && node.email.toLowerCase().includes(termLower)) ||
                      (node.position && node.position.toLowerCase().includes(termLower)) ||
                      (node.phone && node.phone.toLowerCase().includes(termLower)) ||
                      (node.departmentName && node.departmentName.toLowerCase().includes(termLower));
        node.matched = isMatch;
      });

      // 展开包含匹配节点的路径
      flattenedData.value.forEach(node => {
        if (node.matched) {
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
      
      processedData.value.visibilityCache.clear();
    }

    // 更新视图
    visibleNodes.value = calculateVisibleNodes(scrollTop.value, props.height);
    searchLoading.value = false;
  }
}

// 清理资源
onUnmounted(() => {
  if (workerRef.value) {
    workerRef.value.terminate();
  }
});
</script>

<style lang="scss">
@import './styles.scss';

.virtual-el-tree-container {
  width: 100%;

  .virtual-el-tree-search {
    margin-bottom: 8px;
  }

  .virtual-el-tree-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    
    .is-loading {
      font-size: 24px;
      animation: rotating 2s linear infinite;
    }
  }

  .virtual-el-tree-content {
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
  }
  
  .virtual-el-tree-search-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.8);
    padding: 2px 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    font-size: 12px;

    .el-icon {
      margin-right: 4px;
    }
  }
  
  .virtual-el-tree-selected-count {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: var(--el-color-primary);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
  }

  // 性能优化相关样式
  .virtual-el-tree-height-holder {
    will-change: transform;
    contain: strict;
  }
}

@keyframes rotating {
  0% {
    transform: rotateZ(0deg);
  }
  100% {
    transform: rotateZ(360deg);
  }
}
</style> 