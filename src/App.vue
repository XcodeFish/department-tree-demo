<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElCard, ElButton, ElSwitch, ElMessage, ElTable, ElTableColumn, ElDialog, ElInputNumber, ElDropdown, ElDropdownMenu, ElDropdownItem, ElSelect, ElOption, ElTabs, ElTabPane, ElScrollbar, ElTag } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import VirtualElTree from './components/VirtualElTree/index.vue';
import { generateTestTreeData } from './utils/treeUtils';

// Element Plus语言设置
const locale = zhCn;

// 状态定义
const treeData = ref([]);
const loading = ref(true);
const performanceMode = ref(true);
const showSearch = ref(true);
const multiple = ref(true);
const checkable = ref(true);
const selectedKeys = ref([]);
const checkedKeys = ref([]);
const indeterminateKeys = ref([]);
const visibleNodeCount = ref(0);
const selectedUsers = ref([]);
const isDetailDialogVisible = ref(false);
const currentUser = ref(null);
const dataSize = ref('medium');
const treeRef = ref(null);
const selectedNodesArray = ref([]);
const visibleNodes = ref(0);
const totalNodes = ref(0);
const searchMatches = ref(0);
const checkStrictly = ref(false);

// 选中节点状态
const selectedNodesMap = ref(new Map());

// 初始化时加载数据
onMounted(() => {
  generateData();
});

// 处理节点选择
const handleSelect = (keys, info) => {
  // 直接使用传入的keys作为选中状态
  selectedKeys.value = keys;
  
  // 更新已选人员列表 - 只包含类型为user的节点
  const userNodes = keys.map(key => {
    const node = findNodeById(treeData.value, key);
    return node?.type === 'user' ? node : null;
  }).filter(Boolean); // 过滤掉null和非人员节点
  
  selectedUsers.value = userNodes;
  
  // 注意：不再在这里处理复选框状态，因为VirtualElTree组件内部已经处理了
  
  console.log('选中节点变化:', keys, userNodes.length, selectedUsers.value);
};

// 处理可见节点变化
const handleVisibleNodesChange = (count) => {
  visibleNodeCount.value = count;
};

// 处理节点展开
const handleExpand = (nodeId, expanded) => {
  console.log('节点展开/折叠:', nodeId, expanded);
};

// 生成更多测试数据
const generateMoreData = () => {
  loading.value = true;
  
  setTimeout(() => {
    treeData.value = generateTestTreeData(4, 4, 5);
    loading.value = false;
    ElMessage.success('已生成大量测试数据');
  }, 500);
};

// 生成中等数据
const generateMediumData = () => {
  loading.value = true;
  
  setTimeout(() => {
    treeData.value = generateTestTreeData(3, 3, 3);
    loading.value = false;
  }, 300);
};

// 生成少量数据
const generateLessData = () => {
  loading.value = true;
  
  setTimeout(() => {
    treeData.value = generateTestTreeData(2, 2, 2);
    loading.value = false;
    ElMessage.success('已生成少量测试数据');
  }, 300);
};

// 递归查找节点
const findNodeById = (nodes, id) => {
  if (!nodes || !Array.isArray(nodes)) return null;
  
  for (const node of nodes) {
    if (node.id === id) {
      console.log('找到节点:', id, node);
      return node;
    }
    
    if (node.children && Array.isArray(node.children)) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  
  return null;
};

// 已选中节点数量
const selectedCount = computed(() => selectedKeys.value.length);

// 查看用户详情
const showUserDetail = (user) => {
  currentUser.value = user;
  isDetailDialogVisible.value = true;
};

// 节点总数
const nodeCount = computed(() => {
  let count = 0;
  const countNodes = (nodes) => {
    if (!nodes) return;
    count += nodes.length;
    nodes.forEach(node => {
      if (node.children) countNodes(node.children);
    });
  };
  countNodes(treeData.value);
  return count;
});

// 生成测试数据
const generateData = async () => {
  loading.value = true;
  
  try {
    // 根据规模确定节点数量
    let nodeCount;
    switch (dataSize.value) {
      case 'small': nodeCount = 100; break;
      case 'medium': nodeCount = 500; break;
      case 'large': nodeCount = 1000; break;
      case 'huge': nodeCount = 3000; break;
      default: nodeCount = 500;
    }
    
    // 模拟异步数据加载
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const data = generateDepartmentData(nodeCount);
    
    // 确保生成的数据是有效的
    if (!data || !Array.isArray(data) || data.length === 0) {
      ElMessage.error('生成测试数据失败：数据格式无效');
      treeData.value = [];
      return;
    }
    
    // 赋值前检查数据结构
    treeData.value = data;
    totalNodes.value = countNodes(data);
    
    // 调试输出
    console.log('生成树数据:', {
      nodesCount: totalNodes.value,
      rootNodes: data.length,
      firstNode: data[0]
    });
    
    ElMessage.success(`成功生成 ${totalNodes.value} 个节点的测试数据`);
  } catch (error) {
    console.error('数据生成错误:', error);
    ElMessage.error(`数据生成错误: ${error.message}`);
    treeData.value = []; // 出错时设置为空数组
  } finally {
    loading.value = false;
  }
};

// 计算节点总数
const countNodes = (nodes) => {
  let count = 0;
  const traverse = (items) => {
    count += items.length;
    items.forEach(item => {
      if (item.children?.length) {
        traverse(item.children);
      }
    });
  };
  traverse(nodes);
  return count;
};

// 生成测试部门数据
const generateDepartmentData = (count) => {
  const departments = [];
  let remainingCount = count;
  const maxDepth = 4; // 限制树的深度，避免过深
  const maxChildrenPerNode = 8; // 限制每个节点的最大子节点数
  
  // 生成中文姓名
  const generateChineseName = () => {
    const familyNames = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴', '郑', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗'];
    const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英'];
    return familyNames[Math.floor(Math.random() * familyNames.length)] + givenNames[Math.floor(Math.random() * givenNames.length)];
  };
  
  // 生成手机号
  const generatePhone = () => {
    const prefixes = ['138', '139', '137', '136', '135', '134', '159', '158', '157', '150', '151', '152', '188', '187', '182', '183', '184', '178', '170'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let number = '';
    for (let i = 0; i < 8; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return prefix + number;
  };
  
  // 生成公司邮箱
  const generateEmail = (name, id) => {
    const domains = ['example.com', 'company.cn', 'enterprise.org', 'corp.net'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const pinyin = name.replace(/[^\x00-\xff]/g, ''); // 简单处理，实际应使用拼音转换库
    return `${pinyin || 'user'}${id.split('-').pop()}@${domain}`;
  };
  
  // 生成基本部门结构
  const generateDepts = (depth = 0, parentPrefix = '', index = 0) => {
    if (remainingCount <= 0 || depth > maxDepth) return null;
    
    const deptId = parentPrefix ? `${parentPrefix}-${index}` : `dept-${index}`;
    const dept = {
      id: deptId,
      name: `部门${deptId}`,
      type: 'department',
      departmentId: deptId, // 添加部门ID
      code: `D${deptId.replace(/\D/g, '')}`, // 部门编码
      manager: generateChineseName(), // 部门负责人
      createTime: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0], // 创建时间
      children: []
    };
    
    remainingCount--;
    
    // 随机决定子部门数量，但基于剩余节点数合理分配
    const maxPossibleChildren = Math.min(
      maxChildrenPerNode, 
      Math.floor(remainingCount / 2) + 1
    );
    const childCount = depth < maxDepth 
      ? Math.max(1, Math.floor(Math.random() * maxPossibleChildren))
      : 0;
    
    // 生成子部门
    for (let i = 0; i < childCount && remainingCount > 0; i++) {
      const child = generateDepts(depth + 1, deptId, i);
      if (child) {
        dept.children.push(child);
      }
    }
    
    // 在非最底层部门添加少量直属人员节点
    if (remainingCount > 0 && dept.children.length < maxChildrenPerNode) {
      const userCount = Math.min(
        Math.floor(Math.random() * 3) + 1,
        remainingCount,
        maxChildrenPerNode - dept.children.length
      );
      
      for (let i = 0; i < userCount; i++) {
        const userId = `${deptId}-user-${i}`;
        const name = generateChineseName();
        const user = generateUser(userId, name, deptId);
        dept.children.push(user);
        remainingCount--;
      }
    }
    
    return dept;
  };
  
  // 生成人员数据
  const generateUser = (id, name, departmentId) => {
    const positions = ['开发工程师', '产品经理', '设计师', '测试工程师', '运维工程师', '销售经理', '人力资源', '财务'];
    const position = positions[Math.floor(Math.random() * positions.length)];
    const phone = generatePhone();
    const email = generateEmail(name, id);
    
    return {
      id,
      name: name,
      type: 'user',
      position: position,
      email: email,
      phone: phone,
      userId: `U${id.split('-').pop()}`, // 用户ID
      departmentId: departmentId, // 部门ID
      departmentName: `部门${departmentId}`, // 部门名称
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`, // 随机头像
      status: Math.random() > 0.1 ? '在职' : '离职', // 状态
      entryDate: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0], // 入职日期
      isLeaf: true
    };
  };
  
  // 生成多个根部门
  const rootCount = Math.min(5, Math.max(1, Math.ceil(count / 200)));
  for (let i = 0; i < rootCount && remainingCount > 0; i++) {
    const dept = generateDepts(0, '', i);
    if (dept) {
      departments.push(dept);
    }
  }
  
  return departments;
};

// 处理节点检查
const handleCheck = (keys, info) => {
  console.log('勾选节点:', keys, info);
};

// 处理数据大小选择
const handleSizeCommand = (command) => {
  dataSize.value = command;
  ElMessage.success(`已切换到${command}规模数据`);
  
  if (treeData.value.length > 0) {
    generateData();
  }
};

// 处理搜索结果
const handleSearch = (count, matches) => {
  searchMatches.value = count;
  if (count > 0) {
    ElMessage.info(`找到 ${count} 个匹配项`);
  }
};

// 计算属性
const selectedNodesList = computed(() => {
  // 直接使用selectedUsers，它已经包含了所有类型为user的节点
  return selectedUsers.value;
});

const checkedNodes = computed(() => {
  return checkedKeys.value.map(id => findNodeById(treeData.value, id)).filter(Boolean);
});

// 清空选择
const clearSelection = () => {
  if (treeRef.value) {
    treeRef.value.clearSelection();
    selectedKeys.value = [];
  }
};

// 清空勾选
const clearChecked = () => {
  if (treeRef.value) {
    treeRef.value.clearChecked();
    checkedKeys.value = [];
    indeterminateKeys.value = [];
  }
};

// 获取性能快照
const takeSnapshot = () => {
  const snapshot = {
    timestamp: new Date().toISOString(),
    totalNodes: totalNodes.value,
    visibleNodes: visibleNodes.value,
    selectedNodes: selectedNodesList.value.length,
    performanceMode: performanceMode.value,
    searchMatches: searchMatches.value
  };
  
  console.log('Performance snapshot:', snapshot);
  ElMessage.success('性能快照已记录到控制台');
};
</script>

<template>
  <div class="app-container">
    <el-config-provider :locale="locale">
      <el-card class="tree-card">
        <template #header>
          <div class="card-header">
            <h3>部门树组件演示</h3>
            <div class="controls">
              <el-select v-model="dataSize" placeholder="数据规模" style="width: 120px;" @change="generateData">
                <el-option label="小规模 (100)" value="small" />
                <el-option label="中规模 (500)" value="medium" />
                <el-option label="大规模 (1000)" value="large" />
                <el-option label="超大规模 (3000)" value="huge" />
              </el-select>
              
              <el-switch
                v-model="performanceMode"
                active-text="性能模式"
                inactive-text="普通模式"
                class="ml-10"
              />
              
              <el-switch
                v-model="checkStrictly"
                active-text="严格选择"
                inactive-text="级联选择"
                class="ml-10"
              />
              
              <el-button type="primary" @click="generateData" :loading="loading">生成测试数据</el-button>
            </div>
          </div>
        </template>
        
        <div v-if="loading" class="loading-container" v-loading="true" element-loading-text="生成测试数据中...">
        </div>
        
        <div v-else class="tree-container">
          <div class="tree-wrapper">
            <virtual-el-tree
              ref="treeRef"
              :tree-data="treeData"
              :height="600"
              :loading="loading"
              :performance-mode="performanceMode"
              :check-strictly="checkStrictly"
              :show-search="true"
              :multiple="true"
              :checkable="true"
              search-placeholder="搜索部门或人员..."
              @select="handleSelect"
              @check="handleCheck"
              @expand="handleExpand"
            />
          </div>
          
          <div class="info-panel">
            <el-tabs>
              <el-tab-pane label="选中信息">
                <div class="selection-info">
                  <div class="info-header">
                    <h4>已选择 {{ selectedNodesList.length }} 人</h4>
                    <el-button type="text" @click="clearSelection">清空选择</el-button>
                  </div>
                  
                  <el-scrollbar height="200px">
                    <div v-if="selectedNodesList.length === 0" class="empty-tip">
                      请在左侧点击选择节点
                    </div>
                    <div v-else class="selected-list">
                      <div v-for="node in selectedNodesList" :key="node.id" class="selected-item">
                        <el-tag size="small" type="success">人员</el-tag>
                        <span class="name">{{ node.name }}</span>
                        <span v-if="node.position" class="position">{{ node.position }}</span>
                      </div>
                    </div>
                  </el-scrollbar>
                </div>
              </el-tab-pane>
              
              <el-tab-pane label="复选框选中">
                <div class="selection-info">
                  <div class="info-header">
                    <h4>已勾选 {{ checkedKeys.length }} 项</h4>
                    <el-button type="text" @click="clearChecked">清空勾选</el-button>
                  </div>
                  
                  <el-scrollbar height="200px">
                    <div v-if="checkedNodes.length === 0" class="empty-tip">
                      请在左侧勾选复选框
                    </div>
                    <div v-else class="selected-list">
                      <div v-for="node in checkedNodes" :key="node.id" class="selected-item">
                        <el-tag size="small" :type="node.type === 'user' ? 'success' : 'info'">
                          {{ node.type === 'user' ? '人员' : '部门' }}
                        </el-tag>
                        <span class="name">{{ node.name }}</span>
                        <span v-if="node.position" class="position">{{ node.position }}</span>
                      </div>
                    </div>
                  </el-scrollbar>
                </div>
              </el-tab-pane>
              
              <el-tab-pane label="性能信息">
                <div class="performance-info">
                  <div class="info-item">
                    <span class="label">总节点数:</span>
                    <span class="value">{{ totalNodes }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">当前可见节点:</span>
                    <span class="value">{{ visibleNodesCount }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">已选中节点:</span>
                    <span class="value">{{ selectedKeys.length }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">已勾选节点:</span>
                    <span class="value">{{ checkedKeys.length }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">半选状态节点:</span>
                    <span class="value">{{ indeterminateKeys.length }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Worker模式:</span>
                    <span class="value">{{ performanceMode ? '启用' : '禁用' }}</span>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </el-card>
    </el-config-provider>
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.tree-card {
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
    }
    
    .controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.tree-container {
  display: flex;
  gap: 20px;
  
  .tree-wrapper {
    flex: 1;
    min-width: 0;
  }
  
  .info-panel {
    width: 350px;
    
    .selection-info {
      .info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        
        h4 {
          margin: 0;
        }
      }
      
      .empty-tip {
        color: var(--el-text-color-secondary);
        text-align: center;
        padding: 30px 0;
      }
      
      .selected-list {
        .selected-item {
          display: flex;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--el-border-color-lighter);
          
          .name {
            margin-left: 8px;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .position {
            margin-left: 8px;
            color: var(--el-text-color-secondary);
            font-size: 12px;
          }
        }
      }
    }
    
    .performance-info {
      .info-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);
        
        .label {
          color: var(--el-text-color-secondary);
        }
        
        .value {
          font-weight: bold;
        }
      }
    }
  }
}

.ml-10 {
  margin-left: 10px;
}
</style>
