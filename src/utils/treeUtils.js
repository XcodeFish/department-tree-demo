/**
 * 树数据处理工具
 */

/**
 * 处理树数据，生成扁平化结构和Map索引
 * @param {Array} treeData - 树形结构数据
 * @returns {Object} 包含扁平化数据结构、节点Map索引和缓存信息
 */
export function processTreeData(treeData) {
  // 如果treeData为空，返回空结果
  if (!treeData || !Array.isArray(treeData) || treeData.length === 0) {
    return {
      flattenedData: [],
      nodeMap: new Map(),
      visibilityCache: new Map(),
      expandedCount: 0
    };
  }
  
  const flattenedData = [];
  const nodeMap = new Map();
  const visibilityCache = new Map();
  let expandedCount = 0;

  /**
   * 递归扁平化树结构
   * @param {Array} nodes 节点数组
   * @param {Number} level 当前层级
   * @param {String|null} parentId 父节点ID
   * @param {Array} parentPath 父节点路径
   */
  function flatten(nodes, level = 0, parentId = null, parentPath = []) {
    if (!nodes || !Array.isArray(nodes)) return;
    
    nodes.forEach(node => {
      // 检查节点是否有效
      if (!node || typeof node !== 'object') return;
      
      // 确保节点有id
      const nodeId = node.id || `node_${Math.random().toString(36).substr(2, 9)}`;
      const currentPath = [...parentPath, nodeId];
      const pathKey = currentPath.join('/');

      // 创建扁平化节点
      const flatNode = {
        id: nodeId,
        name: node.name || node.label || '未命名节点', // 兼容Element Plus的label字段
        label: node.label || node.name || '未命名节点', // 兼容Element Plus的label字段
        parentId,
        level,
        expanded: level <= 1, // 默认展开前两级
        children: node.children?.filter(Boolean).map(child => child.id || child.key || `child_${Math.random().toString(36).substr(2, 9)}`) || [],
        isLeaf: !node.children || !Array.isArray(node.children) || node.children.length === 0,
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

      // 添加到扁平数组和Map索引
      flattenedData.push(flatNode);
      nodeMap.set(flatNode.id, flatNode);

      // 递归处理子节点
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        flatten(node.children.filter(Boolean), level + 1, nodeId, currentPath);
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
 * 判断节点是否可见（考虑父节点展开状态）
 * @param {Object} node 节点数据
 * @param {Map} nodeMap 节点Map索引
 * @param {Map} cache 可见性缓存
 * @returns {Boolean} 是否可见
 */
export function isNodeVisible(node, nodeMap, cache) {
  if (cache.has(node.id)) {
    return cache.get(node.id);
  }

  // 根节点总是可见
  if (!node.parentId) {
    cache.set(node.id, true);
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

  cache.set(node.id, isVisible);
  return isVisible;
}

/**
 * 计算节点在展开/折叠状态下的高度
 * @param {Array} flattenedData 扁平化的节点数据
 * @param {Map} nodeMap 节点Map索引
 * @param {Number} nodeHeight 单个节点高度
 * @returns {Number} 总高度
 */
export function calculateTotalHeight(flattenedData, nodeMap, nodeHeight) {
  const visibilityCache = new Map();
  let visibleCount = 0;

  for (let i = 0; i < flattenedData.length; i++) {
    const node = flattenedData[i];
    if (isNodeVisible(node, nodeMap, visibilityCache)) {
      visibleCount++;
    }
  }

  return visibleCount * nodeHeight;
}

/**
 * 计算可见节点列表
 * @param {Array} flattenedData 扁平化的节点数据
 * @param {Map} nodeMap 节点Map索引
 * @param {Map} visibilityCache 可见性缓存
 * @param {Number} scrollTop 滚动位置
 * @param {Number} viewportHeight 视口高度
 * @param {Number} nodeHeight 节点高度
 * @param {Number} buffer 上下缓冲区节点数量
 * @returns {Object} 可见节点和相关信息
 */
export function calculateVisibleNodes(
  flattenedData,
  nodeMap,
  visibilityCache,
  scrollTop,
  viewportHeight,
  nodeHeight, 
  buffer
) {
  const visibleNodes = [];
  let accumulatedHeight = 0;
  let currentIndex = 0;

  // 计算起始和结束索引
  const startIndex = Math.max(0, Math.floor(scrollTop / nodeHeight) - buffer);
  const visibleCount = Math.ceil(viewportHeight / nodeHeight) + buffer * 2;
  const endIndex = startIndex + visibleCount;

  // 遍历所有节点，计算可见性和位置
  for (let i = 0; i < flattenedData.length; i++) {
    const node = flattenedData[i];
    if (isNodeVisible(node, nodeMap, visibilityCache)) {
      const offsetTop = accumulatedHeight;

      // 检查节点是否在可视区域内（包括缓冲区）
      if (currentIndex >= startIndex && currentIndex < endIndex) {
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
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 回退实现
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 中文姓氏
const SURNAMES = ['张', '李', '王', '赵', '陈', '刘', '杨', '黄', '周', '吴', '林', '孙', '马', '郭', '胡', '朱', '高', '林', '何', '郑', '罗', '宋', '谢', '唐', '韩', '冯', '于', '董', '萧', '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕', '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎', '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜', '范', '方', '石', '姚', '谭', '廖', '邹', '熊', '金', '陆', '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史', '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤', '尹', '黎', '易', '常', '武', '乔', '贺', '赖', '龚', '文'];

// 名字常用字
const NAME_CHARS = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '博'];

// 职位
const POSITIONS = ['总经理', '副总经理', '总监', '经理', '主管', '工程师', '设计师', '产品经理', '研发工程师', '前端开发', '后端开发', '测试工程师', '财务', '人事专员', '市场专员', '销售代表', '客户经理', '行政专员', '实习生'];

// 部门名称
const DEPARTMENT_TYPES = ['研发部', '市场部', '销售部', '人力资源部', '财务部', '行政部', '客户服务部', '产品部', '运营部', '法务部', '技术部', '质量保证部', '采购部', '战略发展部'];

// 二级部门后缀
const DEPARTMENT_SUFFIX = ['一组', '二组', '三组', '四组', '五组', '六组', 'A组', 'B组', 'C组', 'D组', '北区', '南区', '东区', '西区', '实验室', '中心', '事业部'];

// 邮箱域名
const EMAIL_DOMAINS = ['company.com', 'mail.com', 'example.com', 'corp.cn', 'enterprise.net', 'work.org'];

/**
 * 生成中文姓名
 * @returns {string} 生成的姓名
 */
function generateChineseName() {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const nameChar = NAME_CHARS[Math.floor(Math.random() * NAME_CHARS.length)];
  return surname + nameChar;
}

/**
 * 生成手机号码
 * @returns {string} 生成的手机号
 */
function generatePhoneNumber() {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '150', '151', '152', '153', '155', '156', '157', '158', '159', '170', '176', '177', '178', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let number = '';
  for (let i = 0; i < 8; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return prefix + number;
}

/**
 * 生成邮箱
 * @param {string} name - 姓名（用于生成邮箱前缀）
 * @param {string} companyDomain - 公司域名
 * @returns {string} 生成的邮箱地址
 */
function generateEmail(name, companyDomain = null) {
  const pinyin = name
    .split('')
    .map(char => {
      // 简化处理，实际应用中可以使用拼音转换库
      return char.charCodeAt(0).toString(36);
    })
    .join('');
  
  const randomNum = Math.floor(Math.random() * 1000);
  const domain = companyDomain || EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  
  return `${pinyin}${randomNum}@${domain}`;
}

/**
 * 生成测试用的树数据
 * @param {number} depth - 树的深度
 * @param {number} childrenPerNode - 每个节点的子节点数量
 * @param {number} userCount - 每个末级部门的用户数量
 * @returns {Object} 包含树数据和节点总数的对象 { data: Array, count: Number }
 */
export function generateTestTreeData(depth = 3, childrenPerNode = 4, userCount = 2) {
  const companyDomain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  let totalCount = 0; // 用于统计总节点数
  
  // 生成部门树
  function generateDepartment(currentDepth, index = 0, parentPath = '', parentName = '') {
    const deptId = generateUUID();
    let deptName;
    
    if (currentDepth === 1) {
      // 一级部门
      deptName = DEPARTMENT_TYPES[index % DEPARTMENT_TYPES.length];
    } else {
      // 子部门
      const suffixIndex = (index + currentDepth) % DEPARTMENT_SUFFIX.length;
      const parentShortName = parentName.replace(/部$/, '');
      deptName = `${parentShortName}${DEPARTMENT_SUFFIX[suffixIndex]}`;
    }
    
    const pathName = parentPath ? `${parentPath}-${deptName}` : deptName;
    
    const department = {
      id: deptId,
      name: deptName,
      type: 'department',
      children: []
    };
    
    // 增加节点计数
    totalCount++;
    
    // 生成子部门
    if (currentDepth < depth) {
      department.children = Array(childrenPerNode)
        .fill(null)
        .map((_, i) => generateDepartment(currentDepth + 1, i, pathName, deptName));
    } else {
      // 在末级部门添加用户节点
      department.children = Array(userCount)
        .fill(null)
        .map(() => {
          const name = generateChineseName();
          const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
          
          // 增加用户节点计数
          totalCount++;
          
          return {
            id: generateUUID(),
            name,
            type: 'user',
            position,
            phone: generatePhoneNumber(),
            email: generateEmail(name, companyDomain),
            departmentName: deptName
          };
        });
    }
    
    return department;
  }
  
  // 生成顶层部门
  const treeData = Array(Math.min(childrenPerNode, DEPARTMENT_TYPES.length))
    .fill(null)
    .map((_, i) => generateDepartment(1, i));
    
  return {
    data: treeData,
    count: totalCount
  };
} 