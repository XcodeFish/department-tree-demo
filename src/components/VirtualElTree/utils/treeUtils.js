/**
 * 树数据处理工具函数
 * 实现数据扁平化和节点Map索引创建，支持高效的节点访问
 */

/**
 * 处理树数据，将树状结构扁平化并创建节点索引
 * @param {Array} treeData - 原始树结构数据
 * @returns {Object} 包含扁平化数据、节点Map索引和可见性缓存
 */
export function processTreeData(treeData) {
  const flattenedData = [];
  const nodeMap = new Map();
  const visibilityCache = new Map();
  let expandedCount = 0;

  // 递归扁平化树结构
  function flatten(nodes, level = 0, parentId = null, parentPath = []) {
    nodes.forEach(node => {
      const currentPath = [...parentPath, node.id];
      const pathKey = currentPath.join('/');

      const flatNode = {
        id: node.id,
        name: node.name || node.label, // 兼容Element Plus的label字段
        label: node.label || node.name, // 兼容Element Plus的label字段
        parentId,
        level,
        expanded: level === 0, // 默认展开第一级
        children: node.children?.map(child => child.id || child.key) || [],
        isLeaf: !node.children || node.children.length === 0,
        pathKey,
        loaded: true,
        // 扩展支持人员节点
        type: node.type || 'department', // 'department' 或 'user'
        avatar: node.avatar,             // 用户头像
        email: node.email,               // 用户邮箱
        position: node.position          // 用户职位
      };

      // 计算初始展开的节点数量
      if (flatNode.expanded) {
        expandedCount++;
      }

      flattenedData.push(flatNode);
      nodeMap.set(flatNode.id, flatNode);

      if (node.children?.length) {
        flatten(node.children, level + 1, node.id, currentPath);
      }
    });
  }

  flatten(treeData);

  return {
    flattenedData,
    nodeMap,
    visibilityCache,
    expandedCount
  };
}

/**
 * 计算节点是否可见（基于父节点展开状态）
 * @param {Object} node - 节点对象
 * @param {Map} nodeMap - 节点索引Map
 * @param {Map} visibilityCache - 可见性缓存
 * @returns {Boolean} 节点是否可见
 */
export function isNodeVisible(node, nodeMap, visibilityCache) {
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
 * 计算可见节点
 * @param {Array} flattenedData - 扁平化的节点数据
 * @param {Map} nodeMap - 节点索引Map
 * @param {Map} visibilityCache - 可见性缓存
 * @param {Number} scrollTop - 滚动位置
 * @param {Number} viewportHeight - 可视区域高度
 * @param {Number} nodeHeight - 单个节点高度
 * @param {Number} buffer - 上下缓冲区节点数量
 * @returns {Object} 包含可见节点数组和总高度
 */
export function calculateVisibleNodes(flattenedData, nodeMap, visibilityCache, scrollTop, viewportHeight, nodeHeight, buffer = 5) {
  const visibleNodes = [];
  let accumulatedHeight = 0;
  let currentIndex = 0;

  // 计算起始位置和可见数量
  const startIndex = Math.max(0, Math.floor(scrollTop / nodeHeight) - buffer);
  const visibleCount = Math.ceil(viewportHeight / nodeHeight) + buffer * 2;

  for (let i = 0; i < flattenedData.length; i++) {
    const node = flattenedData[i];
    const isVisible = isNodeVisible(node, nodeMap, visibilityCache);

    if (isVisible) {
      const offsetTop = accumulatedHeight;

      if (currentIndex >= startIndex && currentIndex < startIndex + visibleCount) {
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
 * 搜索匹配节点并处理展开状态
 * @param {String} term - 搜索关键词
 * @param {Map} nodeMap - 节点索引Map
 * @param {Map} visibilityCache - 可见性缓存
 * @returns {Object} 搜索结果
 */
export function searchNodes(term, nodeMap, visibilityCache) {
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
      expandNodePath(matchId, nodeMap);
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
 * 展开包含节点的所有父路径
 * @param {String} nodeId - 节点ID
 * @param {Map} nodeMap - 节点索引Map
 */
export function expandNodePath(nodeId, nodeMap) {
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