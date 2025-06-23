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

// 计算可见节点
function calculateVisibleNodes(scrollTop, viewportHeight, nodeHeight, buffer) {
  const visibleNodes = [];
  let accumulatedHeight = 0;
  let currentIndex = 0;
  let visibleCount = 0;

  // 遍历所有节点，计算可见性和位置
  for (const [id, node] of nodeMap.entries()) {
    const isVisible = isNodeVisible(node);

    if (isVisible) {
      const offsetTop = accumulatedHeight;
      visibleCount++;

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
    visibleCount
  };
}

// 节点可见性判断（带缓存）
function isNodeVisible(node) {
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

  // 搜索过滤
  if (node.searchActive && !node.matched) {
    isVisible = false;
  }

  visibilityCache.set(node.id, isVisible);
  return isVisible;
}

// 计算树的总高度
function calculateTotalHeight() {
  let visibleNodeCount = 0;
  for (const [id, node] of nodeMap.entries()) {
    if (isNodeVisible(node)) {
      visibleNodeCount++;
    }
  }
  return visibleNodeCount * NODE_HEIGHT;
}

// 切换节点展开状态
function toggleNodeExpanded(nodeId, expanded) {
  const node = nodeMap.get(nodeId);
  if (!node) return;

  node.expanded = expanded;

  // 清除可见性缓存，因为展开状态变化会影响子节点可见性
  visibilityCache.clear();

  // 重新计算树高度，通知主线程更新
  const newHeight = calculateTotalHeight();
  self.postMessage({
    type: 'nodeToggled',
    nodeId,
    expanded,
    totalHeight: newHeight
  });
}

// 搜索节点
function searchNodes(term) {
  // 重置搜索状态
  for (const [id, node] of nodeMap.entries()) {
    delete node.matched;
  }
  
  // 清除可见性缓存
  visibilityCache.clear();
  
  // 标记是否在搜索模式
  for (const [id, node] of nodeMap.entries()) {
    node.searchActive = !!term;
  }
  
  if (!term) {
    return { matchCount: 0, matches: [] };
  }

  const termLower = term.toLowerCase();
  const matches = [];

  // 标记匹配的节点
  for (const [id, node] of nodeMap.entries()) {
    // 增强搜索：搜索名称、职位、部门名称、电话、邮箱
    const isMatch = node.name.toLowerCase().includes(termLower) ||
                   (node.email && node.email.toLowerCase().includes(termLower)) ||
                   (node.position && node.position.toLowerCase().includes(termLower)) ||
                   (node.phone && node.phone.toLowerCase().includes(termLower)) ||
                   (node.departmentName && node.departmentName.toLowerCase().includes(termLower));
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

  return {
    matchCount: matches.length,
    matches
  };
}

// 展开包含节点的所有父路径
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