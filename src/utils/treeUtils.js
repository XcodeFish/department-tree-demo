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
        phone: node.phone,               // 用户电话
        position: node.position,         // 用户职位
        departmentName: node.departmentName // 用户所属部门名称
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
 * @returns {Array} 树数据
 */
export function generateTestTreeData(depth = 3, childrenPerNode = 4, userCount = 2) {
  const companyDomain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  
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
  return Array(Math.min(childrenPerNode, DEPARTMENT_TYPES.length))
    .fill(null)
    .map((_, i) => generateDepartment(1, i));
} 