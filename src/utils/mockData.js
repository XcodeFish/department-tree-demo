/**
 * 模拟数据生成工具
 * 用于生成测试用的部门和人员数据
 */

// 中文姓氏列表
const surnames = [
  '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕'
];

// 中文名字列表
const names = [
  '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋',
  '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '秀兰', '霞',
  '平', '刚', '桂英', '玲', '桂兰', '志强', '春梅', '海燕', '晓燕', '欣',
  '建华', '淑珍', '秀梅', '桂荣', '志明', '建国', '玉兰', '丽娟', '建军', '建华'
];

// 部门名称列表
const departmentNames = [
  '技术', '产品', '设计', '运营', '市场', '销售', '客服',
  '人力资源', '财务', '行政', '法务', '采购', '物流', '研发',
  '测试', '数据', '安全', '基础架构', '前端', '后端', '移动端',
  '算法', '运维', '项目管理', '质量控制', '商务', '公关', '培训'
];

// 职位名称列表
const positions = [
  '总监', '经理', '主管', '专员', '助理', '实习生',
  '工程师', '架构师', '设计师', '产品经理', '运营经理',
  '测试工程师', '开发工程师', '销售代表', '客户经理',
  '数据分析师', '人力资源专员', '财务专员', '行政专员',
  '法务专员', '采购专员', '物流专员', '研发工程师'
];

/**
 * 生成随机整数
 * @param {Number} min 最小值
 * @param {Number} max 最大值
 * @returns {Number} 随机整数
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机中文姓名
 * @returns {String} 随机生成的中文姓名
 */
function generateRandomName() {
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  return surname + name;
}

/**
 * 生成随机手机号
 * @returns {String} 随机手机号
 */
function generateRandomPhone() {
  const prefixes = ['134', '135', '136', '137', '138', '139', '150', '151', '152', '157', '158', '159', '182', '183', '187', '188', '198'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let number = '';
  for (let i = 0; i < 8; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return prefix + number;
}

/**
 * 生成随机邮箱
 * @param {String} name 姓名
 * @param {String} deptName 部门名称
 * @returns {String} 随机邮箱
 */
function generateRandomEmail(name, deptName) {
  const domains = ['company.com', 'example.com', 'corp.cn', 'enterprise.org', 'group.net'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const pinyin = name.replace(/[^\x00-\xff]/g, '').toLowerCase() || 'user';
  const deptPinyin = deptName.replace(/[^\x00-\xff]/g, '').toLowerCase() || 'dept';
  return `${pinyin}${Math.floor(Math.random() * 1000)}@${deptPinyin}.${domain}`;
}

/**
 * 生成随机部门名称
 * @returns {String} 随机部门名称
 */
function generateRandomDepartmentName() {
  return departmentNames[Math.floor(Math.random() * departmentNames.length)];
}

/**
 * 生成随机职位名称
 * @param {String} deptName 部门名称
 * @returns {String} 随机职位名称
 */
function generateRandomPosition(deptName) {
  const position = positions[Math.floor(Math.random() * positions.length)];
  return `${deptName}${position}`;
}

/**
 * 生成部门树数据
 * @param {Number} totalNodes 总节点数
 * @returns {Array} 部门树数据
 */
export function generateDepartmentData(totalNodes = 500) {
  // 确保至少有一个根节点
  const rootCount = Math.max(1, Math.floor(totalNodes * 0.02));
  let remainingNodes = totalNodes - rootCount;
  
  // 生成根部门
  const rootDepartments = [];
  for (let i = 0; i < rootCount; i++) {
    const deptName = `${generateRandomDepartmentName()}部`;
    rootDepartments.push({
      id: `dept-${i}`,
      name: deptName,
      type: 'department',
      children: []
    });
  }
  
  // 为每个根部门生成子部门和员工
  let userIdCounter = 0;
  let deptIdCounter = rootCount;
  
  // 递归生成部门和员工
  function generateChildren(parent, depth, maxDepth, remainingNodesRef) {
    if (depth >= maxDepth || remainingNodesRef.count <= 0) return;
    
    // 当前层级的子部门数量
    const childDeptCount = Math.min(
      Math.max(1, Math.floor(Math.random() * 5)),
      remainingNodesRef.count
    );
    remainingNodesRef.count -= childDeptCount;
    
    // 生成子部门
    for (let i = 0; i < childDeptCount; i++) {
      const deptName = `${generateRandomDepartmentName()}组`;
      const deptId = `dept-${parent.id}-${deptIdCounter++}`;
      const department = {
        id: deptId,
        name: deptName,
        type: 'department',
        children: []
      };
      
      parent.children.push(department);
      
      // 为部门生成员工
      const employeeCount = Math.min(
        Math.max(2, Math.floor(Math.random() * 10)),
        remainingNodesRef.count
      );
      remainingNodesRef.count -= employeeCount;
      
      for (let j = 0; j < employeeCount; j++) {
        const name = generateRandomName();
        const position = generateRandomPosition(deptName);
        const userId = `user-${userIdCounter++}`;
        
        department.children.push({
          id: userId,
          name: name,
          type: 'user',
          position: position,
          email: generateRandomEmail(name, deptName),
          phone: generateRandomPhone(),
          departmentId: deptId,
          departmentName: deptName,
          userId: userId
        });
      }
      
      // 递归生成更深层级的部门
      if (depth < maxDepth - 1 && Math.random() > 0.3) {
        generateChildren(department, depth + 1, maxDepth, remainingNodesRef);
      }
    }
  }
  
  // 为每个根部门生成子结构
  const maxDepth = Math.min(5, Math.ceil(Math.log(totalNodes) / Math.log(5)));
  const remainingNodesRef = { count: remainingNodes };
  
  rootDepartments.forEach((dept, index) => {
    const nodesForThisRoot = Math.floor(remainingNodesRef.count / (rootCount - index));
    const localRef = { count: nodesForThisRoot };
    generateChildren(dept, 1, maxDepth, localRef);
    remainingNodesRef.count -= (nodesForThisRoot - localRef.count);
  });
  
  return rootDepartments;
}

/**
 * 计算树中的节点总数
 * @param {Array} tree 树数据
 * @returns {Number} 节点总数
 */
export function countTreeNodes(tree) {
  if (!tree || !Array.isArray(tree)) return 0;
  
  let count = tree.length;
  for (const node of tree) {
    if (node.children && Array.isArray(node.children)) {
      count += countTreeNodes(node.children);
    }
  }
  
  return count;
} 