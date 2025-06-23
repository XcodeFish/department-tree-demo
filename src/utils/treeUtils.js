/**
 * 树数据处理工具
 */

/**
 * 处理树数据，生成扁平化结构和Map索引
 * @param {Array} treeData - 树形结构数据
 * @returns {Object} 包含扁平化数据结构、节点Map索引和缓存信息
 */
export function processTreeData(treeData) {
  const flattenedData = [];
  const nodeMap = new Map();
  const visibilityCache = new Map();
  let expandedCount = 0;

  // 递归扁平化树结构
  function flatten(nodes, level = 0, parentId = null, parentPath = []) {
    if (!nodes || !nodes.length) return;
    
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
 * 生成测试用的树数据
 * @param {number} depth - 树的深度
 * @param {number} childrenPerNode - 每个节点的子节点数量
 * @param {number} userCount - 每个末级部门的用户数量
 * @returns {Array} 树数据
 */
export function generateTestTreeData(depth = 3, childrenPerNode = 4, userCount = 2) {
  // 简单的测试数据生成
  function generateNode(currentDepth, index, parentPath) {
    const id = parentPath ? `${parentPath}-${index}` : `${index}`;
    const node = {
      id,
      name: `部门 ${id}`,
      type: 'department'
    };
    
    if (currentDepth < depth) {
      node.children = Array(childrenPerNode)
        .fill(null)
        .map((_, i) => generateNode(currentDepth + 1, i, id));
    } else {
      // 在末级部门添加用户节点
      node.children = Array(userCount)
        .fill(null)
        .map((_, i) => ({
          id: `user-${id}-${i}`,
          name: `用户 ${id}-${i}`,
          type: 'user',
          position: `职位 ${i + 1}`,
          email: `user${id}-${i}@example.com`
        }));
    }
    
    return node;
  }
  
  return Array(childrenPerNode)
    .fill(null)
    .map((_, i) => generateNode(1, i));
} 