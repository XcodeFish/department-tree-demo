<template>
  <el-card class="meeting-invitation-card">
    <template #header>
      <div class="card-header">
        <h3>会议邀请</h3>
        <el-button 
          type="primary" 
          :icon="Plus" 
          :disabled="!selectedNodes.length" 
          @click="showInvitationModal"
        >
          发起会议邀请 ({{ selectedNodes.length }})
        </el-button>
      </div>
    </template>

    <div class="meeting-layout">
      <!-- 左侧部门树 -->
      <div class="department-tree-container">
        <div class="tree-header">
          <h4>部门人员列表</h4>
          <div class="tree-actions">
            <el-switch
              v-model="checkStrictly"
              active-text="级联选择"
              inactive-text="严格选择"
              size="small"
            />
          </div>
        </div>
        
        <virtual-el-tree
          ref="treeRef"
          :tree-data="treeData"
          :height="500"
          :loading="loading"
          :performance-mode="true"
          :show-search="true"
          search-placeholder="搜索部门或人员..."
          :multiple="true"
          :checkable="true"
          :check-strictly="checkStrictly"
          @select="handleSelect"
          @check="handleSelect"
          @visible-nodes-change="handleVisibleNodesChange"
        />
      </div>
      
      <!-- 右侧选中人员 -->
      <div class="selected-personnel-container">
        <div class="selected-header">
          <h4>已选人员 ({{ selectedNodes.length }})</h4>
          <div class="selection-actions">
            <el-button 
              type="primary"
              size="small"
              :disabled="!selectedNodes.length" 
              @click="showInvitationModal"
            >
              发起邀请
            </el-button>
            <el-button 
              type="default"
              size="small"
              :disabled="!selectedNodes.length" 
              @click="clearSelection"
            >
              清空选择
            </el-button>
            <el-button 
              type="default"
              size="small"
              :disabled="!hasAvailableNodes"
              @click="invertSelection"
            >
              反选
            </el-button>
          </div>
        </div>
        
        <el-scrollbar height="450px" class="selected-users-scrollbar">
          <div v-if="!selectedNodes.length" class="empty-selected">
            <el-empty description="请从左侧选择参会人员" />
          </div>
          <div v-else class="selected-users-list">
            <el-row :gutter="16">
              <el-col 
                v-for="node in selectedNodes" 
                :key="node.id" 
                :xs="24" 
                :sm="12" 
                :md="8" 
                :lg="8"
              >
                <div class="user-card">
                  <div class="user-avatar">
                    <el-avatar 
                      :size="40" 
                      :src="node.avatar" 
                      :icon="UserFilled"
                    />
                  </div>
                  <div class="user-info">
                    <div class="user-name">{{ node.name }}</div>
                    <div class="user-position">{{ node.position || '无职位信息' }}</div>
                    <div class="user-department">{{ getDepartmentPath(node) }}</div>
                  </div>
                  <div class="user-actions">
                    <el-button 
                      type="danger" 
                      circle
                      size="small"
                      @click="removeUser(node.id)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-scrollbar>
        
        <div class="selection-stats">
          <el-tag type="info" size="small">总节点数: {{ totalNodeCount }}</el-tag>
          <el-tag type="success" size="small">已选择: {{ selectedNodes.length }}</el-tag>
          <el-tag type="warning" size="small">可见节点数: {{ visibleNodeCount }}</el-tag>
        </div>
      </div>
    </div>
    
    <!-- 会议邀请表单弹窗 -->
    <meeting-invitation-form
      :visible="isModalVisible"
      :attendees="selectedNodes"
      @close="isModalVisible = false"
      @submit="handleInvitationSubmit"
    />
  </el-card>
</template>

<script setup>
import { ref, shallowRef, computed, watchEffect, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Delete, UserFilled } from '@element-plus/icons-vue';
import VirtualElTree from './VirtualElTree/index.vue';
import MeetingInvitationForm from './MeetingInvitationForm.vue';
import { generateTestTreeData } from '../utils/treeUtils';

// 状态定义
const treeRef = ref(null);
const treeData = shallowRef([]);
const loading = ref(true);
const selectedKeys = ref([]);
const selectedNodes = ref([]);
const totalNodeCount = ref(0);
const visibleNodeCount = ref(0);
const isModalVisible = ref(false);
const checkStrictly = ref(false); // 默认使用级联选择

// 加载数据
onMounted(async () => {
  try {
    // 生成测试数据
    loading.value = true;
    await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
    
    // 使用工具生成测试数据 - 较大规模
    treeData.value = generateTestTreeData(3, 4, 3); // 深度3，每节点4个子节点，每个末级部门3个用户
    countNodes(treeData.value);
    
    loading.value = false;
    ElMessage.success(`成功生成 ${totalNodeCount.value} 个节点的测试数据`);
  } catch (error) {
    loading.value = false;
    ElMessage.error('加载部门数据失败');
  }
});

// 监听树数据变化，计算总节点数
watchEffect(() => {
  if (treeData.value && treeData.value.length) {
    countNodes(treeData.value);
  }
});

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
  totalNodeCount.value = count;
};

// 处理节点选择
const handleSelect = (keys, info) => {
  selectedKeys.value = keys;
  
  // 使用Tree组件提供的方法获取最新的选中键
  if (treeRef.value) {
    selectedKeys.value = treeRef.value.getSelectedKeys();
    
    // 只有在非严格模式下，才需要调用getCheckedKeys获取复选框状态
    if (!checkStrictly.value) {
      const checkedKeys = treeRef.value.getCheckedKeys();
      selectedKeys.value = [...new Set([...selectedKeys.value, ...checkedKeys])];
    }
  }
  
  // 过滤出用户节点 - 用户节点可以通过以下特征识别:
  // 1. 没有children属性或children为空数组
  // 2. 具有position属性
  // 3. node.type === 'user'（如果存在）
  const userNodes = selectedKeys.value.map(key => {
    return findNodeById(treeData.value, key);
  }).filter(node => {
    if (!node) return false;
    
    // 通过多种判断方式识别用户节点
    const isUserByType = node.type === 'user';
    const isUserByNoChildren = !node.children || node.children.length === 0;
    const isUserByPosition = node.position || (node.meta && node.meta.position);
    
    const isUser = isUserByType || isUserByPosition || isUserByNoChildren;
    
    return isUser;
  });
  
  selectedNodes.value = userNodes;
};

// 处理可见节点变化
const handleVisibleNodesChange = (count) => {
  visibleNodeCount.value = count;
};

// 显示会议邀请表单
const showInvitationModal = () => {
  if (selectedNodes.value.length === 0) {
    ElMessage.warning('请先选择参会人员');
    return;
  }
  
  isModalVisible.value = true;
};

// 提交会议邀请
const handleInvitationSubmit = async (formData) => {
  try {
    // 这里可以添加实际的提交逻辑
    ElMessage.success(`已成功邀请${selectedNodes.value.length}人参加会议`);
    isModalVisible.value = false;
  } catch (error) {
    ElMessage.error('提交会议邀请失败');
  }
};

// 递归查找节点
const findNodeById = (nodes, id) => {
  if (!nodes || !Array.isArray(nodes)) return null;
  
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    
    if (node.children && Array.isArray(node.children)) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  
  return null;
};

// 获取部门路径
const getDepartmentPath = (node) => {
  if (!node || !node.parentId) return '';
  
  // 递归查找父节点，构建路径
  const path = [];
  let currentId = node.parentId;
  
  while (currentId) {
    const parent = findNodeById(treeData.value, currentId);
    if (parent) {
      path.unshift(parent.name || parent.label || '');
      currentId = parent.parentId;
    } else {
      break;
    }
  }
  
  return path.join(' / ');
};

// 移除单个用户
const removeUser = (userId) => {
  if (treeRef.value) {
    // 从树组件中取消选中
    const currentSelected = [...selectedKeys.value];
    const index = currentSelected.indexOf(userId);
    
    if (index > -1) {
      currentSelected.splice(index, 1);
      
      // 更新组件状态
      treeRef.value.setSelectedKeys(currentSelected);
      treeRef.value.setCheckedKeys(currentSelected);
      
      // 更新本地状态
      selectedKeys.value = currentSelected;
      
      // 移除用户
      selectedNodes.value = selectedNodes.value.filter(node => node.id !== userId);
      
      ElMessage.success('已移除该用户');
    }
  }
};

// 是否全选
const isAllSelected = computed(() => {
  // 统计所有类型为user的节点数量
  let userNodesCount = 0;
  const countUserNodes = (nodes) => {
    if (!nodes) return;
    nodes.forEach(node => {
      if (node.type === 'user' || (!node.children && node.position)) userNodesCount++;
      if (node.children) countUserNodes(node.children);
    });
  };
  
  countUserNodes(treeData.value);
  
  return userNodesCount > 0 && selectedNodes.value.length === userNodesCount;
});

// 是否有可用的未选择节点
const hasAvailableNodes = computed(() => {
  // 如果已全选，则无法反选
  if (isAllSelected.value) return false;
  
  // 如果当前有选择或有未选择的节点，则可以反选
  return selectedNodes.value.length > 0 || totalNodeCount.value > 0;
});

// 清空选择
const clearSelection = () => {
  if (treeRef.value) {
    treeRef.value.clearSelection();
    treeRef.value.clearChecked();
    selectedKeys.value = [];
    selectedNodes.value = [];
    ElMessage.info('已清空选择');
  }
};

// 反选
const invertSelection = () => {
  if (!treeRef.value) return;
  
  // 获取所有用户节点
  const allUserNodes = [];
  
  const findAllUserNodes = (nodes) => {
    if (!nodes) return;
    nodes.forEach(node => {
      if (node.type === 'user' || (!node.children && node.position)) allUserNodes.push(node.id);
      if (node.children) findAllUserNodes(node.children);
    });
  };
  
  findAllUserNodes(treeData.value);
  
  // 计算未选择的节点
  const unselectedNodes = allUserNodes.filter(id => !selectedKeys.value.includes(id));
  
  // 清空当前选择，然后选择之前未选择的节点
  treeRef.value.clearSelection();
  treeRef.value.clearChecked();
  
  // 设置新的选择
  treeRef.value.setSelectedKeys(unselectedNodes);
  treeRef.value.setCheckedKeys(unselectedNodes);
  
  // 更新本地状态
  selectedKeys.value = unselectedNodes;
  
  // 更新选中的用户节点
  const userNodes = unselectedNodes.map(key => {
    return findNodeById(treeData.value, key);
  }).filter(node => node && (node.type === 'user' || (!node.children && node.position)));
  
  selectedNodes.value = userNodes;
  ElMessage.success(`已反选，当前选择 ${selectedNodes.value.length} 人`);
};
</script>

<style lang="scss" scoped>
.meeting-invitation-card {
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
    }
  }
}

// 左右两栏布局
.meeting-layout {
  display: flex;
  gap: 20px;
  
  .department-tree-container {
    flex: 1;
    min-width: 0; // 防止flex子项溢出
    
    .tree-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      
      h4 {
        margin: 0;
      }
    }
  }
  
  .selected-personnel-container {
    flex: 1.2;
    min-width: 0; // 防止flex子项溢出
    display: flex;
    flex-direction: column;
    
    .selected-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      
      h4 {
        margin: 0;
      }
      
      .selection-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.selected-users-scrollbar {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
}

.selected-users-list {
  padding-right: 8px;
}

.empty-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 4px;
  background-color: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s;
  
  &:hover {
    background-color: var(--el-color-primary-light-9);
    transform: translateY(-2px);
  }
  
  .user-avatar {
    margin-right: 12px;
  }
  
  .user-info {
    flex: 1;
    min-width: 0;
    
    .user-name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .user-position, .user-department {
      color: var(--el-text-color-secondary);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.selection-stats {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}
</style> 