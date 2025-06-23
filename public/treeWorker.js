/**
 * Tree Worker - 多线程处理树数据计算
 */

// 全局状态
let nodeMap = new Map();
let visibilityCache = new Map();
const NODE_HEIGHT = 40; // 与主线程保持一致

// 处理来自主线程的消息
self.onmessage = function(e) {
  const { type } = e.data;

  switch (type) {
    case 'initialize':
      const { flattenedData } = e.data;
      initializeData(flattenedData);
      break;

    case 'updateVisibleNodes':
      const { scrollTop, viewportHeight, buffer } = e.data;
      const result = calculateVisibleNodes(
        scrollTop,
        viewportHeight,
        NODE_HEIGHT,
        buffer
      );
      self.postMessage({ type: 'visibleNodesUpdated', ...result });
      break;

    case 'toggleNode':
      const { nodeId, expanded } = e.data;
      toggleNodeExpanded(nodeId, expanded);
      break;

    case 'search':
      const { searchTerm } = e.data;
      const matchResult = searchNodes(searchTerm);
      self.postMessage({ type: 'searchComplete', matchResult });
      break;
  }
};

// 初始化数据
function initializeData(flattenedData) {
  nodeMap.clear();
  visibilityCache.clear();

  flattenedData.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // 计算初始可见节点和高度
  const initialHeight = calculateTotalHeight();
  self.postMessage({
    type: 'initialized',
    success: true,
    totalHeight: initialHeight
  });
}

// 计算可见节点 (Worker版本的占位实现)
function calculateVisibleNodes(scrollTop, viewportHeight, nodeHeight, buffer) {
  // 目前仅返回占位数据，后续实现完整逻辑
  return {
    visibleNodes: [],
    totalHeight: 1000,
    visibleCount: 0
  };
}

// 计算树的总高度
function calculateTotalHeight() {
  // 现阶段简单返回一个固定值，后续实现实际计算
  return 1000;
}

// 切换节点展开状态
function toggleNodeExpanded(nodeId, expanded) {
  // 占位函数，后续实现完整逻辑
}

// 搜索节点
function searchNodes(term) {
  // 占位函数，后续实现完整逻辑
  return { matchCount: 0, matches: [] };
} 