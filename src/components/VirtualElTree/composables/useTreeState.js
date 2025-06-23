/**
 * 树状态管理组合式API
 * 处理树组件的选中、展开、复选框等状态
 */

import { ref, computed } from 'vue';
import { isNodeVisible, calculateVisibleNodes } from '../utils/treeUtils';

/**
 * 树状态管理
 * @param {Object} options 配置参数
 * @returns {Object} 状态管理相关方法和状态
 */
export function useTreeState(options) {
  const {
    props,
    emit,
    performanceMode,
    workerRef,
    nodeHeight,
    height,
    nodeMapRef
  } = options;

  // 状态定义
  const selectedKeys = ref(props.defaultSelectedKeys || []);
  const checkedKeys = ref(props.defaultCheckedKeys || []);
  const expandedKeys = ref(props.defaultExpandedKeys || []);
  
  const visibleNodes = ref([]);
  const totalTreeHeight = ref(0);
  const scrollTop = ref(0);

  // 处理选择节点
  const handleSelect = (nodeId) => {
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
  };

  // 处理节点展开/折叠
  const handleToggle = (nodeId) => {
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

    // 非Worker模式下需要重新计算可见节点
    if (!performanceMode || !workerRef.value) {
      updateVisibleNodes(scrollTop.value);
    }
  };

  // 处理复选框选中
  const handleCheck = (nodeId, checked) => {
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
  };

  // 计算可见节点 (仅在非Worker模式下使用)
  const updateVisibleNodes = (scrollPosition) => {
    if (performanceMode && workerRef.value) {
      // Worker模式在useWorker中处理
      return;
    }

    // 获取扁平化数据
    const flattenedData = [];
    for (const node of nodeMapRef.value.values()) {
      flattenedData.push(node);
    }

    // 创建可见性缓存
    const visibilityCache = new Map();

    // 计算可见节点
    const result = calculateVisibleNodes(
      flattenedData,
      nodeMapRef.value,
      visibilityCache,
      scrollPosition,
      height,
      nodeHeight,
      Math.ceil(height / nodeHeight) * 2
    );

    visibleNodes.value = result.visibleNodes;
    totalTreeHeight.value = result.totalHeight;
    emit('visible-nodes-change', result.visibleNodes.length);
  };

  // 处理滚动事件
  const handleScroll = (e) => {
    scrollTop.value = e.target.scrollTop;

    // 使用requestAnimationFrame优化滚动性能
    window.requestAnimationFrame(() => {
      updateVisibleNodes(scrollTop.value);
    });
  };

  return {
    selectedKeys,
    checkedKeys,
    expandedKeys,
    visibleNodes,
    totalTreeHeight,
    scrollTop,
    handleSelect,
    handleToggle,
    handleCheck,
    handleScroll,
    updateVisibleNodes
  };
} 