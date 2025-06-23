/**
 * 树组件Web Worker
 * 用于计算密集型任务处理，避免主线程阻塞
 */

// 全局状态
let nodeMap = new Map();
let visibilityCache = new Map();
const NODE_HEIGHT = 40; // 默认节点高度，应与主线程保持一致

// 监听来自主线程的消息
self.onmessage = function(e) {
  const { type } = e.data;

  switch (type) {
    case 'initialize':
      const { flattenedData } = e.data;
      initializeData(flattenedData);
      break;

    case 'updateVisibleNodes':
      const { scrollTop, viewportHeight, buffer } = e.data;
      const { visibleNodes, totalHeight, visibleCount } = calculateVisibleNodes(
        scrollTop, 
        viewportHeight, 
        NODE_HEIGHT, 
        buffer
      );
      self.postMessage({ 
        type: 'visibleNodesUpdated', 
        visibleNodes, 
        totalHeight,
        visibleCount 
      });
      break;

    case 'toggleNode':
      const { nodeId } = e.data;
      toggleNodeExpanded(nodeId);
      break;

    case 'search':
      const { searchTerm } = e.data;
      const matchResult = searchNodes(searchTerm);
      self.postMessage({ type: 'searchComplete', matchResult });
      break;
  }
};

/**
 * 初始化Worker数据
 * @param {Array} flattenedData 扁平化的树数据
 */
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

/**
 * 计算可见节点
 * @param {Number} scrollTop 滚动位置
 * @param {Number} viewportHeight 可视区域高度
 * @param {Number} nodeHeight 节点高度
 * @param {Number} buffer 缓冲区大小
 * @returns {Object} 可见节点信息
 */
function calculateVisibleNodes(scrollTop, viewportHeight, nodeHeight, buffer = 5) {
  const visibleNodes = [];
  let accumulatedHeight = 0;
  let currentIndex = 0;

  // 遍历所有节点，计算可见性和位置
  for (const [id, node] of nodeMap.entries()) {
    const isVisible = isNodeVisible(node);

    if (isVisible) {
      const offsetTop = accumulatedHeight;

      // 检查节点是否在可视区域内（包括缓冲区）
      if (offsetTop >= scrollTop - (buffer * nodeHeight) &&
          offsetTop <= scrollTop + viewportHeight + (buffer * nodeHeight)) {

        visibleNodes.push({
          ...node,
          offsetTop,
          index: currentIndex
        });
      }

      accumulatedHeight += nodeHeight;
      currentIndex++;
    }
  }

  return {
    visibleNodes,
    totalHeight: accumulatedHeight,
    visibleCount: currentIndex
  };
}

/**
 * 节点可见性判断（带缓存）
 * @param {Object} node 节点对象
 * @returns {Boolean} 节点是否可见
 */
function isNodeVisible(node) {
  // 使用缓存避免重复计算
  if (visibilityCache.has(node.id)) {
    return visibilityCache.get(node.id);
  }

  // 根节点总是可见
  if (!node.parentId) {
    visibilityCache.set(node.id, true);
    return true;
  }

  // 递归检查父节点展开状态
  let currentNode = node;
  let isVisible = true;

  while (currentNode.parentId) {
    const parent = nodeMap.get(currentNode.parentId);
    if (!parent || !parent.expanded) {
      isVisible = false;
      break;
    }
    currentNode = parent;
  }

  visibilityCache.set(node.id, isVisible);
  return isVisible;
}

/**
 * 搜索节点
 * @param {String} term 搜索关键词
 * @returns {Object} 搜索结果
 */
function searchNodes(term) {
  if (!term) {
    // 重置搜索状态
    for (const [id, node] of nodeMap.entries()) {
      delete node.matched;
    }
    visibilityCache.clear();
    return { matchCount: 0, matches: [] };
  }

  const termLower = term.toLowerCase();
  const matches = [];

  // 标记匹配的节点
  for (const [id, node] of nodeMap.entries()) {
    // 部门和人员都支持搜索
    const isMatch = node.name.toLowerCase().includes(termLower) ||
                  (node.email && node.email.toLowerCase().includes(termLower)) ||
                  (node.position && node.position.toLowerCase().includes(termLower));
    
    node.matched = isMatch;
    if (isMatch) {
      matches.push(node.id);
    }
  }

  // 展开包含匹配节点的路径
  if (matches.length > 0) {
    matches.forEach(matchId => {
      expandNodePath(matchId);
    });
  }

  // 清除可见性缓存，因为展开状态已改变
  visibilityCache.clear();

  return {
    matchCount: matches.length,
    matches
  };
}

/**
 * 展开/折叠节点
 * @param {String} nodeId 节点ID
 * @returns {Boolean} 操作是否成功
 */
function toggleNodeExpanded(nodeId) {
  const node = nodeMap.get(nodeId);
  if (!node) return false;

  // 更新展开状态
  node.expanded = !node.expanded;
  
  // 清除可见性缓存，重新计算可见节点
  visibilityCache.clear();

  // 重新计算总高度
  const totalHeight = calculateTotalHeight();

  self.postMessage({
    type: 'nodeToggled',
    nodeId,
    expanded: node.expanded,
    totalHeight
  });

  return true;
}

/**
 * 展开包含节点的所有父路径
 * @param {String} nodeId 节点ID
 */
function expandNodePath(nodeId) {
  let currentId = nodeMap.get(nodeId)?.parentId;

  while (currentId) {
    const parent = nodeMap.get(currentId);
    if (parent) {
      parent.expanded = true;
      currentId = parent.parentId;
    } else {
      break;
    }
  }
}

/**
 * 计算树总高度
 * @returns {Number} 总高度
 */
function calculateTotalHeight() {
  let visibleCount = 0;
  
  for (const [id, node] of nodeMap.entries()) {
    if (isNodeVisible(node)) {
      visibleCount++;
    }
  }

  return visibleCount * NODE_HEIGHT;
} 