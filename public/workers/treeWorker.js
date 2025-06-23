/**
 * Web Worker 多线程处理树组件计算
 * 用于提高大数据量下的性能表现
 */

// 全局状态
let nodeMap = new Map();
let flattenedData = [];
let visibilityCache = new Map();
let NODE_HEIGHT = 40; // 默认节点高度

// 监听主线程消息
self.onmessage = function(e) {
  const { type } = e.data;

  switch (type) {
    case 'initialize':
      const { flattenedData: data, nodeHeight } = e.data;
      initializeData(data, nodeHeight);
      break;

    case 'updateVisibleNodes':
      const { scrollTop, viewportHeight, buffer } = e.data;
      updateVisibleNodes(scrollTop, viewportHeight, buffer);
      break;

    case 'toggleNode':
      const { nodeId, expanded } = e.data;
      toggleNodeExpanded(nodeId, expanded);
      break;

    case 'search':
      const { searchTerm } = e.data;
      searchNodes(searchTerm);
      break;
  }
};

/**
 * 初始化数据
 * @param {Array} data 扁平化的节点数据
 * @param {Number} nodeHeight 节点高度
 */
function initializeData(data, nodeHeight) {
  flattenedData = data;
  NODE_HEIGHT = nodeHeight || NODE_HEIGHT;
  
  // 重建节点Map和可见性缓存
  nodeMap.clear();
  visibilityCache.clear();

  flattenedData.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // 计算初始树高度
  const totalHeight = calculateTotalHeight();

  // 通知初始化完成
  self.postMessage({
    type: 'initialized',
    success: true,
    totalHeight
  });
}

/**
 * 计算树的总高度
 * @returns {Number} 总高度（像素）
 */
function calculateTotalHeight() {
  let visibleCount = 0;
  
  for (let i = 0; i < flattenedData.length; i++) {
    const node = flattenedData[i];
    if (isNodeVisible(node)) {
      visibleCount++;
    }
  }
  
  return visibleCount * NODE_HEIGHT;
}

/**
 * 更新可见节点并返回给主线程
 * @param {Number} scrollTop 滚动位置
 * @param {Number} viewportHeight 视口高度
 * @param {Number} buffer 缓冲区大小
 */
function updateVisibleNodes(scrollTop, viewportHeight, buffer) {
  const result = calculateVisibleNodes(scrollTop, viewportHeight, buffer);
  
  self.postMessage({
    type: 'visibleNodesUpdated',
    visibleNodes: result.visibleNodes,
    totalHeight: result.totalHeight,
    visibleCount: result.visibleCount
  });
}

/**
 * 计算可见节点列表
 * @param {Number} scrollTop 滚动位置
 * @param {Number} viewportHeight 视口高度
 * @param {Number} buffer 缓冲区大小(节点数)
 * @returns {Object} 可见节点列表和总高度
 */
function calculateVisibleNodes(scrollTop, viewportHeight, buffer) {
  const visibleNodes = [];
  let accumulatedHeight = 0;
  let currentIndex = 0;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / NODE_HEIGHT) - buffer);
  const visibleCount = Math.ceil(viewportHeight / NODE_HEIGHT) + buffer * 2;
  const endIndex = startIndex + visibleCount;

  // 遍历所有节点，计算可见性和位置
  for (let i = 0; i < flattenedData.length; i++) {
    const node = flattenedData[i];
    const isVisible = isNodeVisible(node);

    if (isVisible) {
      const offsetTop = accumulatedHeight;

      // 检查节点是否在可视区域内（包括缓冲区）
      if (currentIndex >= startIndex && currentIndex < endIndex) {
        visibleNodes.push({
          ...node,
          offsetTop,
          index: currentIndex
        });
      }

      accumulatedHeight += NODE_HEIGHT;
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
 * 切换节点的展开/折叠状态
 * @param {String} nodeId 节点ID
 * @param {Boolean} expanded 是否展开
 */
function toggleNodeExpanded(nodeId, expanded) {
  const node = nodeMap.get(nodeId);
  if (!node) return;
  
  // 更新节点展开状态
  node.expanded = expanded;
  
  // 清除节点及其子节点的可见性缓存
  clearNodeVisibilityCache(nodeId);
  
  // 计算新的树高度
  const totalHeight = calculateTotalHeight();
  
  // 通知节点状态已更新
  self.postMessage({
    type: 'nodeToggled',
    nodeId,
    expanded,
    totalHeight
  });
}

/**
 * 清除节点及其所有子节点的可见性缓存
 * @param {String} nodeId 节点ID
 */
function clearNodeVisibilityCache(nodeId) {
  // 清除当前节点缓存
  visibilityCache.delete(nodeId);
  
  // 清除子节点缓存
  const childrenIds = findAllChildren(nodeId);
  childrenIds.forEach(id => {
    visibilityCache.delete(id);
  });
}

/**
 * 查找节点的所有子节点ID（递归）
 * @param {String} nodeId 节点ID
 * @returns {Array} 子节点ID列表
 */
function findAllChildren(nodeId) {
  const children = [];
  const node = nodeMap.get(nodeId);
  
  if (!node || !node.children || node.children.length === 0) {
    return children;
  }
  
  node.children.forEach(childId => {
    children.push(childId);
    const childrenOfChild = findAllChildren(childId);
    children.push(...childrenOfChild);
  });
  
  return children;
}

/**
 * 判断节点是否可见
 * @param {Object} node 节点数据
 * @returns {Boolean} 是否可见
 */
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

  visibilityCache.set(node.id, isVisible);
  return isVisible;
}

/**
 * 搜索节点
 * @param {String} term 搜索词
 */
function searchNodes(term) {
  // 清除旧的匹配状态
  flattenedData.forEach(node => {
    delete node.matched;
    delete node.matchScore;
  });

  if (!term) {
    // 重置搜索，清除可见性缓存（因为展开状态可能变化）
    visibilityCache.clear();
    self.postMessage({
      type: 'searchComplete',
      searchTerm: term,
      matchCount: 0,
      matches: []
    });
    return;
  }

  const termLower = term.toLowerCase();
  const matches = [];
  const matchScores = new Map(); // 用于存储匹配得分

  // 标记匹配的节点
  for (let i = 0; i < flattenedData.length; i++) {
    const node = flattenedData[i];
    
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

  // 对匹配结果进行排序
  matches.sort((a, b) => {
    return (matchScores.get(b) || 0) - (matchScores.get(a) || 0);
  });

  // 为匹配的节点展开父路径
  if (matches.length > 0) {
    matches.forEach(matchId => {
      expandNodePath(matchId);
    });
  }

  // 清除可见性缓存，因为展开状态已变化
  visibilityCache.clear();
  
  // 构建详细的搜索结果
  const searchResult = {
    searchTerm: term,
    matchCount: matches.length,
    matches: matches,
    // 包含匹配得分
    matchDetails: matches.map(id => ({
      id,
      score: matchScores.get(id) || 0,
      node: nodeMap.get(id)
    })),
    // 计算搜索完成时间，用于性能监控
    timeTaken: performance.now() - performance.timeOrigin
  };

  // 通知搜索完成
  self.postMessage({
    type: 'searchComplete',
    ...searchResult
  });
}

/**
 * 展开包含指定节点的所有父路径
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