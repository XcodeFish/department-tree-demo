<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElCard, ElButton, ElSwitch, ElMessage, ElTable, ElTableColumn, ElDialog, ElInputNumber } from 'element-plus';
import VirtualElTree from './components/VirtualElTree/index.vue';
import { generateTestTreeData } from './utils/treeUtils';

// 状态定义
const treeData = ref([]);
const loading = ref(true);
const performanceMode = ref(true);
const showSearch = ref(true);
const multiple = ref(true);
const checkable = ref(true);
const selectedKeys = ref([]);
const visibleNodeCount = ref(0);
const selectedUsers = ref([]);
const isDetailDialogVisible = ref(false);
const currentUser = ref(null);
const dataSize = ref(1000);

// 初始化时加载数据
onMounted(() => {
  generateData();
});

// 处理节点选择
const handleSelect = (keys, info) => {
  selectedKeys.value = keys;
  
  // 更新已选人员列表
  selectedUsers.value = keys.map(key => {
    const node = findNodeById(treeData.value, key);
    return node?.type === 'user' ? node : null;
  }).filter(Boolean); // 过滤掉null和非人员节点
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
  if (!nodes) return null;

  for (const node of nodes) {
    if (node.id === id) return node;

    if (node.children) {
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
const generateData = () => {
  loading.value = true;
  
  // 使用setTimeout避免UI阻塞
  setTimeout(() => {
    try {
      const size = dataSize.value;
      const maxDepth = 6;
      const maxChildrenPerNode = 8;
      
      // 随机姓氏
      const familyNames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', 
                          '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
      
      // 随机名字
      const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', 
                        '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞'];
      
      // 随机职位
      const positions = ['经理', '主管', '总监', '专员', '助理', '工程师', '设计师', '分析师', 
                        '顾问', '总裁', '副总裁', '实习生', '总经理', '董事长', '技术总监'];
      
      // 随机部门名称
      const deptNames = [
        '技术部', '市场部', '销售部', '人力资源部', '财务部', '产品部', '客服部',
        '研发部', '行政部', '运营部', '设计部', '法务部', '采购部', '质量部', '战略部'
      ];
      
      // 生成随机用户
      const generateRandomUser = (parentId, level, index) => {
        const id = `user-${parentId}-${level}-${index}`;
        const familyName = familyNames[Math.floor(Math.random() * familyNames.length)];
        const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
        const position = positions[Math.floor(Math.random() * positions.length)];
        
        return {
          id,
          name: familyName + givenName,
          type: 'user',
          parentId,
          email: `${familyName.toLowerCase()}${givenName.toLowerCase()}@example.com`,
          position,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
        };
      };
      
      // 生成随机部门
      const generateRandomDept = (parentId, level, index, remaining) => {
        if (level >= maxDepth || remaining <= 0) return null;
        
        const id = `dept-${parentId ? parentId : 'root'}-${level}-${index}`;
        const name = `${deptNames[Math.floor(Math.random() * deptNames.length)]}${index+1}`;
        
        // 决定子节点数量
        const childrenCount = Math.min(
          Math.floor(Math.random() * maxChildrenPerNode) + 1,
          remaining
        );
        
        // 决定有多少子部门和多少用户
        const deptCount = Math.floor(Math.random() * childrenCount * 0.3);
        const userCount = childrenCount - deptCount;
        
        // 生成子部门
        const children = [];
        let remainingNodes = remaining - 1; // 减去当前节点
        
        for (let i = 0; i < deptCount && remainingNodes > 0; i++) {
          const child = generateRandomDept(id, level + 1, i, remainingNodes);
          if (child) {
            children.push(child);
            // 减去这个部门及其所有子节点
            const nodeCount = countTreeNodes(child);
            remainingNodes -= nodeCount;
          }
        }
        
        // 生成用户
        for (let i = 0; i < userCount && remainingNodes > 0; i++) {
          children.push(generateRandomUser(id, level + 1, i));
          remainingNodes--;
        }
        
        return {
          id,
          name,
          type: 'department',
          children: children.length > 0 ? children : undefined
        };
      };
      
      // 计算树节点总数
      const countTreeNodes = (node) => {
        if (!node) return 0;
        let count = 1; // 当前节点
        if (node.children) {
          node.children.forEach(child => {
            count += countTreeNodes(child);
          });
        }
        return count;
      };
      
      // 生成根部门
      const rootDepts = [];
      let remaining = size;
      let rootIndex = 0;
      
      while (remaining > 0) {
        const dept = generateRandomDept(null, 0, rootIndex, remaining);
        if (dept) {
          rootDepts.push(dept);
          const nodeCount = countTreeNodes(dept);
          remaining -= nodeCount;
          rootIndex++;
        } else {
          break;
        }
      }
      
      treeData.value = rootDepts;
    } catch (error) {
      console.error('生成数据出错:', error);
    } finally {
      loading.value = false;
    }
  }, 100);
};

// 处理节点检查
const handleCheck = (keys, info) => {
  console.log('勾选节点:', keys, info);
};
</script>

<template>
  <div class="app-container">
    <h1>部门树组件演示</h1>
    
    <div class="demo-controls">
      <el-switch
        v-model="performanceMode"
        active-text="性能模式"
        inactive-text="普通模式"
      />
      <el-button type="primary" @click="generateData">生成测试数据</el-button>
      <el-input-number v-model="dataSize" :min="100" :max="10000" :step="500" />个节点
    </div>
    
    <el-card class="tree-card">
      <template #header>
        <div class="card-header">
          <span>虚拟树组件 ({{ treeData.length ? `${nodeCount}个节点` : '无数据' }})</span>
          <div class="stats" v-if="treeData.length">
            可见节点: {{ visibleNodeCount }} 
          </div>
        </div>
      </template>
      
      <virtual-el-tree
        :tree-data="treeData"
        :height="500"
        :loading="loading"
        :performance-mode="performanceMode"
        show-search
        search-placeholder="请输入部门/人员名称搜索"
        multiple
        checkable
        @select="handleSelect"
        @check="handleCheck"
        @expand="handleExpand"
        @visible-nodes-change="handleVisibleNodesChange"
      />
    </el-card>
    
    <el-card title="部门树Demo" class="department-tree-card">
      <template #header>
        <div class="card-header">
          <span>部门树 Demo</span>
          <div class="controls">
            <el-switch
              v-model="showSearch"
              active-text="搜索"
              inactive-text="隐藏搜索"
              class="ctrl-item"
            />
            <el-switch
              v-model="multiple"
              active-text="多选"
              inactive-text="单选"
              class="ctrl-item"
            />
            <el-switch
              v-model="checkable"
              active-text="复选框"
              inactive-text="无复选框"
              class="ctrl-item"
            />
          </div>
        </div>
      </template>
      
      <div class="demo-container">
        <div class="tree-container">
          <div class="tree-actions">
            <el-button @click="generateLessData" size="small">少量数据</el-button>
            <el-button @click="generateMediumData" size="small" type="info">中等数据</el-button>
            <el-button @click="generateMoreData" size="small" type="primary">大量数据</el-button>
            <span class="stats">
              可见/已选: {{ visibleNodeCount }}/{{ selectedCount }}
            </span>
          </div>

          <virtual-el-tree 
            :tree-data="treeData" 
            :height="500" 
            :loading="loading"
            :performance-mode="performanceMode"
            :show-search="showSearch"
            :multiple="multiple"
            :checkable="checkable"
            @select="handleSelect"
            @expand="handleExpand"
            @visible-nodes-change="handleVisibleNodesChange"
          />
        </div>
        
        <div v-if="selectedUsers.length > 0" class="selected-users">
          <h3>已选人员 ({{ selectedUsers.length }})</h3>
          <el-table :data="selectedUsers" style="width: 100%" max-height="500">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="position" label="职位" width="120" />
            <el-table-column prop="departmentName" label="部门" width="120" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="scope">
                <el-button link type="primary" @click="showUserDetail(scope.row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
    
    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="isDetailDialogVisible"
      title="人员详情"
      width="500px"
    >
      <template v-if="currentUser">
        <div class="user-detail">
          <div class="user-header">
            <div class="user-avatar">{{ currentUser.name.charAt(0) }}</div>
            <div class="user-name">{{ currentUser.name }}</div>
          </div>
          
          <div class="user-info">
            <div class="info-item">
              <div class="label">ID:</div>
              <div class="value">{{ currentUser.id }}</div>
            </div>
            
            <div class="info-item">
              <div class="label">职位:</div>
              <div class="value">{{ currentUser.position }}</div>
            </div>
            
            <div class="info-item">
              <div class="label">部门:</div>
              <div class="value">{{ currentUser.departmentName }}</div>
            </div>
            
            <div class="info-item">
              <div class="label">电话:</div>
              <div class="value">{{ currentUser.phone }}</div>
            </div>
            
            <div class="info-item">
              <div class="label">邮箱:</div>
              <div class="value">{{ currentUser.email }}</div>
            </div>
          </div>
        </div>
      </template>
      
      <template #footer>
        <el-button @click="isDetailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss">
.app-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  
  h1 {
    text-align: center;
    margin-bottom: 20px;
    color: var(--el-color-primary);
  }
}

.demo-controls {
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
  align-items: center;
}

.tree-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats {
  font-size: 14px;
  color: #666;
}

.department-tree-card {
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      
      .ctrl-item {
        margin-left: 15px;
      }
    }
  }
  
  .demo-container {
    display: flex;
    gap: 20px;
    
    .tree-container {
      flex: 1;
      min-width: 0;
    }
    
    .selected-users {
      width: 40%;
      
      h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
        color: var(--el-color-primary);
      }
    }
  }
  
  .tree-actions {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    
    .stats {
      margin-left: auto;
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }
  }
}

.user-detail {
  .user-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    
    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: var(--el-color-primary);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 24px;
      margin-right: 15px;
    }
    
    .user-name {
      font-size: 20px;
      font-weight: bold;
    }
  }
  
  .user-info {
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    padding: 15px;
    
    .info-item {
      display: flex;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .label {
        width: 70px;
        color: var(--el-text-color-secondary);
      }
      
      .value {
        flex: 1;
        color: var(--el-text-color-primary);
      }
    }
  }
}

// 全局的Element Plus样式调整
:root {
  --el-color-primary: #409eff;
}

@media (max-width: 768px) {
  .demo-container {
    flex-direction: column;
    
    .selected-users {
      width: 100%;
    }
  }
}
</style>
