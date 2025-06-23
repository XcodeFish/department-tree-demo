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
              checked: checkedKeys.includes(node.id),
              indeterminate: indeterminateKeys.includes(node.id)
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
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>搜索中...</span>
    </div>

    <!-- 搜索结果计数 -->
    <div 
      v-if="searchResults.matchCount > 0" 
      class="virtual-el-tree-search-count"
    >
      匹配: {{ searchResults.matchCount }}
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
  },
  checkStrictly: {
    type: Boolean,
    default: false
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
const searchResults = shallowRef({
  matches: [],
  matchCount: 0,
  searchTerm: '',
  lastSearchTime: 0
});

// 状态定义
const visibleNodes = shallowRef([]);
const totalTreeHeight = ref(0);
const scrollTop = ref(0);
const selectedKeys = ref(props.defaultSelectedKeys || []);
const checkedKeys = ref(props.defaultCheckedKeys || []);
const indeterminateKeys = ref([]);
const visibilityCache = ref(new Map());
const nodeMapRef = ref(new Map());

// 上次滚动位置，用于增量计算
const lastScrollTop = ref(0);
// 节点差异缓存，用于增量计算
const diffCache = ref({
  lastVisibleRange: { start: 0, end: 0 },
  cachedNodes: new Map(),
  lastComputeTime: 0
});

// 初始化时同步选中状态和复选框状态
onMounted(() => {
  if (props.checkable) {
    // 确保defaultSelectedKeys中的节点在checkedKeys中
    if (props.defaultSelectedKeys && props.defaultSelectedKeys.length > 0) {
      props.defaultSelectedKeys.forEach(nodeId => {
        if (!checkedKeys.value.includes(nodeId)) {
          checkedKeys.value.push(nodeId);
        }
      });
    }
    
    // 确保defaultCheckedKeys中的节点在selectedKeys中
    if (props.defaultCheckedKeys && props.defaultCheckedKeys.length > 0) {
      props.defaultCheckedKeys.forEach(nodeId => {
        if (!selectedKeys.value.includes(nodeId)) {
          selectedKeys.value.push(nodeId);
        }
      });
    }
  }
});

// 使用计算属性优化性能
const processedData = computed(() => {
  const result = processTreeData(props.treeData || []);
  nodeMapRef.value = result.nodeMap;
  visibilityCache.value = result.visibilityCache;
  return result;
});

// 使用shallowRef优化大数组性能
const flattenedData = shallowRef([]);

// 监听处理后的数据更新扁平化结果
watch(() => processedData.value, (newData) => {
  flattenedData.value = newData.flattenedData;
}, { immediate: true });

// 使用组合式API: Worker管理
const {
  workerRef,
  initializeWorker,
  updateVisibleNodes: updateWorkerVisibleNodes,
  handleToggle: workerHandleToggle,
  handleSearch: handleWorkerSearch,
  destroyWorker
} = useWorker({
  performanceMode: props.performanceMode,
  nodeHeight: props.nodeHeight,
  height: props.height,
  flattenedData,
  scrollTop,
  totalTreeHeight,
  visibleNodes,
  searchResults,
  emit
});

/**
 * 清除选中状态
 */
function clearSelection() {
  selectedKeys.value = [];
}

/**
 * 清除复选框选中状态
 */
function clearChecked() {
  checkedKeys.value = [];
  indeterminateKeys.value = [];
}

/**
 * 设置复选框选中状态
 */
function setCheckedKeys(keys, checked = true) {
  if (!Array.isArray(keys)) return;

  if (checked) {
    // 添加选中状态，去重
    const uniqueKeys = [...new Set([...checkedKeys.value, ...keys])];
    checkedKeys.value = uniqueKeys;
  } else {
    // 移除选中状态
    checkedKeys.value = checkedKeys.value.filter(key => !keys.includes(key));
  }
}

/**
 * 处理节点选择
 */
function handleSelect(nodeId) {
  if (props.multiple) {
    // 多选模式
    const index = selectedKeys.value.indexOf(nodeId);
    if (index > -1) {
      // 如果已选中，则移除
      selectedKeys.value.splice(index, 1);
      
      // 同步更新复选框状态
      if (props.checkable) {
        // 从复选框中也移除
        const checkIndex = checkedKeys.value.indexOf(nodeId);
        if (checkIndex > -1) {
          checkedKeys.value.splice(checkIndex, 1);
          
          // 如果启用级联选择
          if (!props.checkStrictly) {
            const node = nodeMapRef.value.get(nodeId);
            if (node) {
              // 更新子节点状态
              updateChildrenChecked(node, false);
              // 更新父节点状态
              updateParentChecked(node);
            }
          }
        }
      }
      
      emit('select', [...selectedKeys.value], { selected: false, nodeIds: [nodeId] });
    } else {
      // 如果未选中，则添加
      selectedKeys.value.push(nodeId);
      
      // 同步更新复选框状态
      if (props.checkable && !checkedKeys.value.includes(nodeId)) {
        checkedKeys.value.push(nodeId);
        
        // 如果启用级联选择
        if (!props.checkStrictly) {
          const node = nodeMapRef.value.get(nodeId);
          if (node) {
            // 更新子节点状态
            updateChildrenChecked(node, true);
            // 更新父节点状态
            updateParentChecked(node);
          }
        }
      }
      
      emit('select', [...selectedKeys.value], { selected: true, nodeIds: [nodeId] });
    }
  } else {
    // 单选模式
    selectedKeys.value = [nodeId];
    
    // 同步更新复选框状态
    if (props.checkable) {
      // 清空之前的选中状态
      const oldCheckedKeys = [...checkedKeys.value];
      checkedKeys.value = [nodeId];
      
      // 如果启用级联选择，处理子节点
      if (!props.checkStrictly) {
        const node = nodeMapRef.value.get(nodeId);
        if (node) {
          // 更新子节点状态
          updateChildrenChecked(node, true);
          // 更新父节点状态
          updateParentChecked(node);
        }
      }
    }
    
    emit('select', selectedKeys.value, { node: nodeMapRef.value.get(nodeId), selected: true });
  }
}

/**
 * 处理节点展开/折叠
 */
function handleToggle(nodeId) {
  // 获取节点
  const node = nodeMapRef.value.get(nodeId);
  if (!node) return;
  
  // 更新本地节点状态
  node.expanded = !node.expanded;
  
  // 使用Worker处理或主线程处理
  workerHandleToggle(nodeId, node.expanded);
}

/**
 * 处理复选框选中
 */
function handleCheck(nodeId, checked) {
  // 获取节点
  const node = nodeMapRef.value.get(nodeId);
  if (!node || !props.checkable) return;

  // 更新选中状态
  const index = checkedKeys.value.indexOf(nodeId);
  if (index > -1 && !checked) {
    // 如果已选中且取消选中
    checkedKeys.value.splice(index, 1);
    
    // 同步更新节点选中状态
    const selectedIndex = selectedKeys.value.indexOf(nodeId);
    if (selectedIndex > -1) {
      selectedKeys.value.splice(selectedIndex, 1);
    }
    
    // 严格模式下不处理关联节点
    if (!props.checkStrictly) {
      // 更新子节点状态
      updateChildrenChecked(node, false);
      // 更新父节点状态
      updateParentChecked(node);
    }
    emit('check', [...checkedKeys.value], { checked: false, nodeIds: [nodeId] });
  } else if (index === -1 && checked) {
    // 如果未选中且选中
    checkedKeys.value.push(nodeId);
    
    // 同步更新节点选中状态
    if (!selectedKeys.value.includes(nodeId)) {
      selectedKeys.value.push(nodeId);
    }
    
    // 严格模式下不处理关联节点
    if (!props.checkStrictly) {
      // 更新子节点状态
      updateChildrenChecked(node, true);
      // 更新父节点状态
      updateParentChecked(node);
    }
    emit('check', [...checkedKeys.value], { checked: true, nodeIds: [nodeId] });
  }
}

/**
 * 更新子节点的选中状态
 */
function updateChildrenChecked(node, checked) {
  if (!node.children || node.children.length === 0) return;

  // 递归处理子节点
  node.children.forEach(childId => {
    const childNode = nodeMapRef.value.get(childId);
    if (!childNode) return;
    
    const checkIndex = checkedKeys.value.indexOf(childId);
    const selectedIndex = selectedKeys.value.indexOf(childId);
    
    // 更新复选框状态
    if (checked && checkIndex === -1) {
      checkedKeys.value.push(childId);
    } else if (!checked && checkIndex > -1) {
      checkedKeys.value.splice(checkIndex, 1);
    }
    
    // 同步更新节点选中状态
    if (checked && selectedIndex === -1) {
      selectedKeys.value.push(childId);
    } else if (!checked && selectedIndex > -1) {
      selectedKeys.value.splice(selectedIndex, 1);
    }
    
    // 递归处理子节点的子节点
    updateChildrenChecked(childNode, checked);
  });
}

/**
 * 更新父节点的选中状态
 */
function updateParentChecked(node) {
  if (!node.parentId) return;
  
  const parent = nodeMapRef.value.get(node.parentId);
  if (!parent) return;
  
  // 检查所有兄弟节点的状态
  const siblings = parent.children || [];
  const checkedSiblings = siblings.filter(id => checkedKeys.value.includes(id));
  const indeterminateSiblings = siblings.filter(id => indeterminateKeys.value.includes(id));
  
  const parentCheckedIndex = checkedKeys.value.indexOf(parent.id);
  const parentIndeterminateIndex = indeterminateKeys.value.indexOf(parent.id);
  
  // 全选
  if (checkedSiblings.length === siblings.length) {
    if (parentCheckedIndex === -1) {
      checkedKeys.value.push(parent.id);
    }
    if (parentIndeterminateIndex > -1) {
      indeterminateKeys.value.splice(parentIndeterminateIndex, 1);
    }
  }
  // 部分选中
  else if (checkedSiblings.length > 0 || indeterminateSiblings.length > 0) {
    if (parentIndeterminateIndex === -1) {
      indeterminateKeys.value.push(parent.id);
    }
    if (parentCheckedIndex > -1) {
      checkedKeys.value.splice(parentCheckedIndex, 1);
    }
  }
  // 全不选
  else {
    if (parentCheckedIndex > -1) {
      checkedKeys.value.splice(parentCheckedIndex, 1);
    }
    if (parentIndeterminateIndex > -1) {
      indeterminateKeys.value.splice(parentIndeterminateIndex, 1);
    }
  }
  
  // 递归处理父节点的父节点
  updateParentChecked(parent);
}

// 导出组件方法
defineExpose({
  clearSelection,
  clearChecked,
  getSelectedKeys: () => selectedKeys.value,
  getCheckedKeys: () => checkedKeys.value,
  getIndeterminateKeys: () => indeterminateKeys.value,
  setSelectedKeys: (keys) => {
    selectedKeys.value = Array.isArray(keys) ? keys : [];
  },
  setCheckedKeys,
  // 获取半选状态的节点
  getHalfCheckedKeys: () => indeterminateKeys.value,
  // 获取选中的节点数据
  getCheckedNodes: () => {
    return checkedKeys.value.map(id => nodeMapRef.value.get(id)).filter(Boolean);
  },
  // 获取选中的叶子节点
  getCheckedLeafKeys: () => {
    return checkedKeys.value.filter(id => {
      const node = nodeMapRef.value.get(id);
      return node && (!node.children || node.children.length === 0);
    });
  }
});

/**
 * 处理滚动事件
 */
function handleScroll(e) {
  scrollTop.value = e.target.scrollTop;

  // 使用requestAnimationFrame优化滚动性能
  window.requestAnimationFrame(() => {
    // 调用Worker版本的更新函数
    if (props.performanceMode && workerRef.value) {
      updateWorkerVisibleNodes(scrollTop.value);
    } else {
      // 主线程模式
      const result = incrementalCalculateNodes(scrollTop.value, props.height);
      visibleNodes.value = result.visibleNodes;
      totalTreeHeight.value = result.totalHeight;
      lastScrollTop.value = scrollTop.value;
    }
  });
}

/**
 * 处理搜索功能
 */
function handleSearch(term) {
  searchValue.value = term;
  searchLoading.value = true;
  
  // 重置搜索结果
  searchResults.value = {
    ...searchResults.value,
    searchTerm: term,
    lastSearchTime: Date.now()
  };

  if (props.performanceMode && workerRef.value) {
    // Worker模式搜索
    handleWorkerSearch(term);
  } else {
    // 主线程搜索处理
    performMainThreadSearch(term);
  }
  
  emit('search', term);
}

/**
 * 主线程执行搜索逻辑
 * @param {String} term 搜索关键词
 */
function performMainThreadSearch(term) {
  // 清除先前的匹配状态
  flattenedData.value.forEach(node => {
    delete node.matched;
    delete node.matchScore;
  });

  // 清除可见性缓存，因为展开状态可能会变化
  visibilityCache.value.clear();
  
  if (!term) {
    // 如果搜索词为空，直接更新视图
    // 调用主线程计算
    const result = incrementalCalculateNodes(scrollTop.value, props.height);
    visibleNodes.value = result.visibleNodes;
    totalTreeHeight.value = result.totalHeight;
    lastScrollTop.value = scrollTop.value;
    
    searchLoading.value = false;
    
    // 重置搜索结果
    searchResults.value = {
      matches: [],
      matchCount: 0,
      searchTerm: '',
      lastSearchTime: Date.now()
    };
    
    return;
  }

  const termLower = term.toLowerCase();
  const matches = [];
  const matchScores = new Map(); // 用于存储匹配得分，优先显示高匹配度的结果

  // 标记匹配的节点
  for (let i = 0; i < flattenedData.value.length; i++) {
    const node = flattenedData.value[i];
    
    // 搜索字段包括名称、邮箱和职位
    const nameMatch = node.name && node.name.toLowerCase().includes(termLower);
    const labelMatch = node.label && node.label.toLowerCase().includes(termLower);
    const emailMatch = node.email && node.email.toLowerCase().includes(termLower);
    const positionMatch = node.position && node.position.toLowerCase().includes(termLower);
    
    // 计算匹配得分
    let score = 0;
    if (nameMatch || labelMatch) score += 10; // 名称匹配优先级最高
    if (emailMatch) score += 5;               // 邮箱次之
    if (positionMatch) score += 3;            // 职位再次之
    
    const isMatch = nameMatch || labelMatch || emailMatch || positionMatch;
    
    if (isMatch) {
      node.matched = true;
      node.matchScore = score;
      matchScores.set(node.id, score);
      matches.push(node.id);
    }
  }

  // 对匹配结果进行排序（可用于优先展示高匹配度的结果）
  matches.sort((a, b) => {
    return (matchScores.get(b) || 0) - (matchScores.get(a) || 0);
  });

  // 为匹配的节点展开父路径
  if (matches.length > 0) {
    matches.forEach(matchId => {
      expandMatchNodePath(matchId);
    });
  }

  // 更新搜索结果状态
  searchResults.value = {
    matches,
    matchCount: matches.length,
    searchTerm: term,
    lastSearchTime: Date.now()
  };

  // 更新视图
  if (props.performanceMode && workerRef.value) {
    updateWorkerVisibleNodes(scrollTop.value);
  } else {
    // 主线程计算
    const result = incrementalCalculateNodes(scrollTop.value, props.height);
    visibleNodes.value = result.visibleNodes;
    totalTreeHeight.value = result.totalHeight;
    lastScrollTop.value = scrollTop.value;
  }
  
  searchLoading.value = false;
  
  // 发出搜索完成事件
  emit('search', term, matches.length, matches);
}

/**
 * 展开匹配节点的父路径
 * @param {String} nodeId 节点ID
 */
function expandMatchNodePath(nodeId) {
  const node = nodeMapRef.value.get(nodeId);
  if (!node) return;
  
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

/**
 * 非Worker模式下的可见节点计算
 */
function calculateVisibleNodesInMainThread(scrollPosition, viewportHeight) {
  const buffer = Math.ceil(viewportHeight / props.nodeHeight) * 2;
  const startIndex = Math.max(0, Math.floor(scrollPosition / props.nodeHeight) - buffer);
  const visibleCount = Math.ceil(viewportHeight / props.nodeHeight) + buffer * 2;
  
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

// Worker初始化和管理 - 使用组合式API
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

// 监听选中状态变化，自动同步复选框状态
watch(selectedKeys, (newSelected) => {
  if (props.checkable) {
    // 确保所有选中的节点也在复选框选中状态中
    newSelected.forEach(nodeId => {
      if (!checkedKeys.value.includes(nodeId)) {
        checkedKeys.value.push(nodeId);
        
        // 如果启用级联选择，更新关联节点
        if (!props.checkStrictly) {
          const node = nodeMapRef.value.get(nodeId);
          if (node) {
            updateChildrenChecked(node, true);
            updateParentChecked(node);
          }
        }
      }
    });
  }
}, { deep: true });

// 监听复选框状态变化，自动同步选中状态
watch(checkedKeys, (newChecked) => {
  // 暂时不需要实现，因为复选框变化时不一定要同步选中状态
  // 但如果有特殊需求，可以在此实现
}, { deep: true });

// 清理资源
onUnmounted(() => {
  destroyWorker();
});

/**
 * 增量计算可见节点
 * @param {Number} currentScrollTop 当前滚动位置
 * @param {Number} viewportHeight 视口高度
 * @returns {Array} 可见节点列表
 */
function incrementalCalculateNodes(currentScrollTop, viewportHeight) {
  const now = performance.now();
  const buffer = Math.ceil(viewportHeight / props.nodeHeight) * 2;
  
  // 计算当前可见范围
  const startIndex = Math.max(0, Math.floor(currentScrollTop / props.nodeHeight) - buffer);
  const endIndex = Math.ceil((currentScrollTop + viewportHeight) / props.nodeHeight) + buffer;
  const currentRange = { start: startIndex, end: endIndex };
  
  // 获取上次计算的范围
  const { lastVisibleRange, cachedNodes, lastComputeTime } = diffCache.value;
  
  // 如果滚动距离小，使用增量计算
  const scrollDistanceSmall = Math.abs(currentScrollTop - lastScrollTop.value) < 300;
  const timeDiffSmall = now - lastComputeTime < 300;
  
  if (scrollDistanceSmall && timeDiffSmall &&
      (currentRange.start >= lastVisibleRange.start - buffer/2 && 
       currentRange.end <= lastVisibleRange.end + buffer/2)) {
    
    // 使用缓存的节点，只计算差异
    const result = [];
    let currentTop = 0;
    let visibleIndex = 0;
    
    for (let i = 0; i < flattenedData.value.length; i++) {
      const node = flattenedData.value[i];
      if (!node) continue;
      
      // 使用缓存的可见性判断
      let isVisible;
      if (cachedNodes.has(node.id)) {
        const cachedData = cachedNodes.get(node.id);
        isVisible = cachedData.isVisible;
        currentTop = cachedData.offsetTop;
        visibleIndex = cachedData.visibleIndex;
      } else {
        isVisible = isNodeVisible(node, nodeMapRef.value, visibilityCache.value);
      }
      
      if (isVisible) {
        // 检查是否在当前可视区域
        if (visibleIndex >= startIndex && visibleIndex <= endIndex) {
          result.push({
            ...node,
            offsetTop: currentTop,
            index: visibleIndex
          });
        }
        
        // 更新或添加到缓存
        cachedNodes.set(node.id, {
          isVisible,
          offsetTop: currentTop,
          visibleIndex
        });
        
        currentTop += props.nodeHeight;
        visibleIndex++;
      }
    }
    
    // 更新缓存
    diffCache.value = {
      lastVisibleRange: currentRange,
      cachedNodes,
      lastComputeTime: now
    };
    
    return {
      visibleNodes: result,
      totalHeight: currentTop
    };
  }
  
  // 常规完整计算
  return calculateVisibleNodesInMainThread(currentScrollTop, viewportHeight);
}
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