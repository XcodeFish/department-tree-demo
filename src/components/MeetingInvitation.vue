<template>
  <el-card class="meeting-invitation-card">
    <template #header>
      <div class="card-header">
        <h3>会议邀请</h3>
        <div class="header-actions">
          <!-- 添加测试数据生成下拉框 -->
          <div class="data-generator">
            <el-button type="danger" :icon="Download" class="generate-btn" @click="handleGenerateData">
              测试数据生成
            </el-button>
            <el-select v-model="dataSize" class="data-size-select" size="default">
              <el-option v-for="item in dataSizeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          
          <el-button 
            type="primary" 
            :icon="Plus" 
            :disabled="!selectedNodes.length" 
            @click="showInvitationModal"
          >
            发起会议邀请 ({{ selectedNodes.length }})
          </el-button>
        </div>
      </div>
    </template>

    <div class="meeting-layout">
      <!-- 左侧部门树 -->
      <div class="department-tree-container">
        <div class="tree-header">
          <h4>部门人员列表</h4>
          <div class="tree-actions">
            <el-switch
              v-model="performanceMode"
              active-text="性能模式"
              inactive-text="普通模式"
              size="small"
              @change="handlePerformanceModeChange"
            />
            <el-switch
              v-model="checkStrictly"
              active-text="级联选择"
              inactive-text="严格选择"
              size="small"
              style="margin-left: 10px;"
            />
          </div>
        </div>
        
        <virtual-el-tree
          ref="treeRef"
          v-model:selected-keys="selectedKeys"
          :tree-data="treeData"
          :height="500"
          :loading="loading"
          :performance-mode="performanceMode"
          :show-search="true"
          :multiple="true"
          :checkable="true"
          :check-strictly="checkStrictly"
          @select="handleSelect"
          @check="handleCheck"
          @visible-nodes-change="handleVisibleNodesChange"
        />

        <div class="tree-footer">
          <div class="tree-stats">
            <span>总节点: {{ totalNodeCount }}</span>
            <span>已选择: {{ selectedNodes.length }}</span>
            <span>可见节点: {{ visibleNodeCount }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧选中人员面板 -->
      <div class="selected-users-panel">
        <div class="panel-header">
          <h4>已选择人员 ({{ selectedNodes.length }})</h4>
          <div class="panel-actions">
            <el-button size="small" type="danger" :icon="Delete" @click="clearSelection" :disabled="!selectedNodes.length">
              清空选择
            </el-button>
            <el-button size="small" type="primary" @click="handleReverseSelection" :disabled="!treeData.length">
              反选
            </el-button>
          </div>
        </div>
        
        <el-empty v-if="!selectedNodes.length" description="请从左侧选择参会人员" />
        
        <el-scrollbar v-else height="450px">
          <div class="selected-user-list">
            <div v-for="node in selectedNodes" :key="node.id" class="selected-user-item">
              <div class="user-avatar">
                <el-avatar :icon="UserFilled" :size="36" />
              </div>
              <div class="user-info">
                <div class="user-name">{{ node.name }}</div>
                <div class="user-position">{{ node.position || (node.meta && node.meta.position) || '未知职位' }}</div>
              </div>
              <el-button 
                class="remove-user-btn" 
                :icon="Delete" 
                circle 
                size="small"
                @click="removeSelectedNode(node.id)"
              />
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 性能监控组件 -->
    <div class="performance-monitor">
      <h4>性能监控</h4>
      <div class="monitor-data">
        <div class="monitor-item">
          <span class="label">性能模式:</span>
          <span class="value">{{ performanceMode ? '开启' : '关闭' }}</span>
        </div>
        <div class="monitor-item">
          <span class="label">总节点数:</span>
          <span class="value">{{ totalNodeCount }}</span>
        </div>
        <div class="monitor-item">
          <span class="label">可见节点数:</span>
          <span class="value">{{ visibleNodeCount }}</span>
        </div>
        <div class="monitor-item">
          <span class="label">渲染耗时:</span>
          <span class="value">{{ performanceMetrics.renderTime }}ms</span>
        </div>
        <div class="monitor-item">
          <span class="label">帧率(FPS):</span>
          <span class="value" :class="fpsColorClass">{{ performanceMetrics.fps }}</span>
        </div>
        <div class="monitor-item">
          <span class="label">内存使用:</span>
          <span class="value">{{ performanceMetrics.memory }}MB</span>
        </div>
      </div>
      <div class="comparison-data" v-if="performanceComparison.normal && performanceComparison.performance">
        <h5>性能对比</h5>
        <el-table :data="comparisonTableData" size="small" border style="width: 100%">
          <el-table-column prop="metric" label="指标" width="120" />
          <el-table-column prop="normal" label="普通模式" />
          <el-table-column prop="performance" label="性能模式" />
          <el-table-column prop="improvement" label="提升比例" />
        </el-table>
      </div>
    </div>

    <!-- 会议邀请表单弹窗 -->
    <el-dialog
      v-model="isModalVisible"
      title="发起会议邀请"
      width="700px"
      @closed="handleModalClosed"
    >
      <meeting-invitation-form
        :attendees="selectedNodes"
        @submit="handleFormSubmit"
        @cancel="isModalVisible = false"
      />
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, shallowRef, computed, watchEffect, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Delete, UserFilled, Download } from '@element-plus/icons-vue';
import VirtualElTree from './VirtualElTree/index.vue';
import MeetingInvitationForm from './MeetingInvitationForm.vue';
import { generateTestTreeData } from '../utils/treeUtils';

// 状态定义
const treeRef = ref(null);
const treeData = shallowRef([]);
const loading = ref(false);
const selectedKeys = ref([]);
const selectedNodes = ref([]);
const totalNodeCount = ref(0);
const visibleNodeCount = ref(0);
const isModalVisible = ref(false);
const checkStrictly = ref(false); // 默认使用级联选择
const performanceMode = ref(true); // 默认启用性能模式

// 测试数据生成相关
const dataSize = ref(1000); // 默认生成1000个节点
const dataSizeOptions = [
  { value: 100, label: '100条' },
  { value: 300, label: '300条' },
  { value: 500, label: '500条' },
  { value: 1000, label: '1000条' },
  { value: 1500, label: '1500条' },
  { value: 2000, label: '2000条' },
  { value: 3000, label: '3000条' },
  { value: 4000, label: '4000条' },
  { value: 5000, label: '5000条' },
  { value: 8000, label: '8000条' },
];

// 性能监控数据
const performanceMetrics = ref({
  fps: 0,
  renderTime: 0,
  memory: 0,
  startTime: 0
});

// 性能模式对比数据
const performanceComparison = ref({
  normal: null,
  performance: null
});

// 计算性能对比表格数据
const comparisonTableData = computed(() => {
  if (!performanceComparison.value.normal || !performanceComparison.value.performance) {
    return [];
  }
  
  const normal = performanceComparison.value.normal;
  const perf = performanceComparison.value.performance;
  
  return [
    {
      metric: '渲染时间',
      normal: `${normal.renderTime}ms`,
      performance: `${perf.renderTime}ms`,
      improvement: `${Math.round((normal.renderTime - perf.renderTime) / normal.renderTime * 100)}%`
    },
    {
      metric: '帧率(FPS)',
      normal: normal.fps,
      performance: perf.fps,
      improvement: `${Math.round((perf.fps - normal.fps) / normal.fps * 100)}%`
    },
    {
      metric: '内存占用',
      normal: `${normal.memory}MB`,
      performance: `${perf.memory}MB`,
      improvement: `${Math.round((normal.memory - perf.memory) / normal.memory * 100)}%`
    }
  ];
});

// 根据FPS设置颜色样式
const fpsColorClass = computed(() => {
  const fps = performanceMetrics.value.fps;
  if (fps >= 55) return 'fps-excellent';
  if (fps >= 45) return 'fps-good';
  if (fps >= 30) return 'fps-average';
  return 'fps-poor';
});

// 加载数据
onMounted(async () => {
  try {
    // 生成测试数据
    loading.value = true;
    await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
    
    // 使用工具生成测试数据 - 使用默认数据量
    generateTestDataWithSize(dataSize.value);
    
    // 初始化性能监控
    startPerformanceMonitoring();
  } catch (error) {
    ElMessage.error('加载部门数据失败');
  } finally {
    loading.value = false;
  }
});

// 生成测试数据
const generateTestDataWithSize = (size) => {
  // 调整部门深度和每个部门的子节点数量，以达到目标数据量
  let depth = 2;
  let childrenPerNode = 3;
  let userCount = 2;

  if (size <= 100) {
    depth = 2;
    childrenPerNode = 2; 
    userCount = 2;
  } else if (size <= 300) {
    depth = 3;
    childrenPerNode = 2;
    userCount = 2;
  } else if (size <= 500) {
    depth = 3;
    childrenPerNode = 3;
    userCount = 2;
  } else if (size <= 1000) {
    depth = 4;
    childrenPerNode = 3;
    userCount = 3;
  } else if (size <= 2000) {
    depth = 4;
    childrenPerNode = 4;
    userCount = 4;
  } else if (size <= 3000) {
    depth = 5;
    childrenPerNode = 3;
    userCount = 4;
  } else if (size <= 4000) {
    depth = 5;
    childrenPerNode = 4;
    userCount = 4;
  } else if (size <= 5000) {
    depth = 6;
    childrenPerNode = 3;
    userCount = 4;
  } else {
    // 8000+
    depth = 6;
    childrenPerNode = 4;
    userCount = 5;
  }

  // 执行数据生成
  const { data, count } = generateTestTreeData(depth, childrenPerNode, userCount);
  treeData.value = data;
  totalNodeCount.value = count;
    
  // 清空选择
  clearSelection();
  
  ElMessage.success(`成功生成测试数据，共 ${count} 个节点`);
};

// 处理测试数据生成
const handleGenerateData = () => {
  try {
    loading.value = true;
    // 延迟一下以显示加载状态
    setTimeout(() => {
      generateTestDataWithSize(dataSize.value);
      loading.value = false;
    }, 300);
  } catch (error) {
    ElMessage.error('生成测试数据失败');
    loading.value = false;
  }
};

// 清理性能监控
onUnmounted(() => {
  stopPerformanceMonitoring();
});

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

// 处理复选框选择
const handleCheck = (keys) => {
  handleSelect(keys);
};

// 清空选择
const clearSelection = () => {
  if (treeRef.value) {
    treeRef.value.clearSelection();
    treeRef.value.clearChecked();
  }
  selectedKeys.value = [];
  selectedNodes.value = [];
};

// 反选
const handleReverseSelection = () => {
  // 实现反选逻辑
  if (treeRef.value) {
    // 获取所有可选节点
    const allSelectableNodes = getAllSelectableNodes(treeData.value);
    const currentSelectedKeys = new Set(selectedKeys.value);
    
    // 反选 - 当前未选中的变为选中，当前选中的变为未选中
    const newSelectedKeys = allSelectableNodes
      .filter(node => !currentSelectedKeys.has(node.id))
      .map(node => node.id);
    
    // 更新选中状态
    treeRef.value.setSelectedKeys(newSelectedKeys);
    treeRef.value.setCheckedKeys(newSelectedKeys);
    
    // 触发选中事件以更新右侧面板
    handleSelect(newSelectedKeys);
  }
};

// 获取所有可选择的节点（用户节点）
const getAllSelectableNodes = (nodes, result = []) => {
  if (!nodes) return result;
  
  for (const node of nodes) {
    // 判断是否为用户节点
    const isUserByType = node.type === 'user';
    const isUserByNoChildren = !node.children || node.children.length === 0;
    const isUserByPosition = node.position || (node.meta && node.meta.position);
    
    if (isUserByType || isUserByPosition || isUserByNoChildren) {
      result.push(node);
    }
    
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      getAllSelectableNodes(node.children, result);
    }
  }
  
  return result;
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

// 移除单个选中的节点
const removeSelectedNode = (nodeId) => {
  // 从选中键中移除
  const index = selectedKeys.value.indexOf(nodeId);
  if (index > -1) {
    selectedKeys.value.splice(index, 1);
  }
  
  // 从选中节点中移除
  selectedNodes.value = selectedNodes.value.filter(node => node.id !== nodeId);
  
  // 更新树组件选中状态
  if (treeRef.value) {
    treeRef.value.setSelectedKeys(selectedKeys.value);
    treeRef.value.setCheckedKeys(selectedKeys.value);
  }
};

// 处理可见节点变化
const handleVisibleNodesChange = (count) => {
  visibleNodeCount.value = count;
};

// 显示会议邀请表单
const showInvitationModal = () => {
  isModalVisible.value = true;
};

// 提交会议邀请
const handleFormSubmit = (formData) => {
  ElMessage.success(`已成功邀请${selectedNodes.value.length}人参加会议: ${formData.title}`);
  isModalVisible.value = false;
};

// 关闭弹窗后处理
const handleModalClosed = () => {
  // 可以添加一些清理逻辑
};

// 性能监控相关方法
let rafId = null;
let lastFrameTime = 0;
let frameCount = 0;

// 启动性能监控
const startPerformanceMonitoring = () => {
  lastFrameTime = performance.now();
  frameCount = 0;
  
  const measurePerformance = () => {
    const now = performance.now();
    frameCount++;
    
    // 每秒更新一次性能指标
    if (now - lastFrameTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
      
      // 获取内存使用情况（如果可用）
      let memory = 0;
      if (performance.memory) {
        memory = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      }
      
      performanceMetrics.value = {
        fps,
        renderTime: Math.round(now - lastFrameTime) / frameCount,
        memory,
        timestamp: now
      };
      
      // 记录当前性能模式的数据用于比较
      if (performanceMode.value && !performanceComparison.value.performance) {
        performanceComparison.value.performance = { ...performanceMetrics.value };
      } else if (!performanceMode.value && !performanceComparison.value.normal) {
        performanceComparison.value.normal = { ...performanceMetrics.value };
      }
      
      lastFrameTime = now;
      frameCount = 0;
    }
    
    rafId = requestAnimationFrame(measurePerformance);
  };
  
  rafId = requestAnimationFrame(measurePerformance);
};

// 停止性能监控
const stopPerformanceMonitoring = () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

// 处理性能模式切换
const handlePerformanceModeChange = (value) => {
  // 保存当前模式下的性能数据
  if (value) {
    // 切换到性能模式
    setTimeout(() => {
      performanceComparison.value.performance = { ...performanceMetrics.value };
    }, 1000); // 等待1秒让性能数据稳定
  } else {
    // 切换到普通模式
    setTimeout(() => {
      performanceComparison.value.normal = { ...performanceMetrics.value };
    }, 1000); // 等待1秒让性能数据稳定
  }
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
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .data-generator {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .data-size-select {
          width: 120px;
        }
        
        .generate-btn {
          white-space: nowrap;
        }
      }
    }
  }
  
  .meeting-layout {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    
    .department-tree-container {
      flex: 1;
      border: 1px solid var(--el-border-color-light);
      border-radius: 4px;
      
      .tree-header {
        padding: 10px;
        border-bottom: 1px solid var(--el-border-color-light);
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        h4 {
          margin: 0;
        }
        
        .tree-actions {
          display: flex;
          align-items: center;
        }
      }
      
      .tree-footer {
        padding: 10px;
        border-top: 1px solid var(--el-border-color-light);
        
        .tree-stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }
    
    .selected-users-panel {
      width: 300px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 4px;
      
      .panel-header {
        padding: 10px;
        border-bottom: 1px solid var(--el-border-color-light);
        display: flex;
        flex-direction: column;
        
        h4 {
          margin: 0 0 10px 0;
        }
        
        .panel-actions {
          display: flex;
          gap: 10px;
        }
      }
      
      .el-empty {
        margin: 30px 0;
      }
      
      .selected-user-list {
        padding: 10px;
        
        .selected-user-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid var(--el-border-color-lighter);
          position: relative;
          
          &:last-child {
            border-bottom: none;
          }
          
          .user-avatar {
            margin-right: 10px;
          }
          
          .user-info {
            flex: 1;
            
            .user-name {
              font-weight: bold;
            }
            
            .user-position {
              font-size: 12px;
              color: var(--el-text-color-secondary);
            }
          }
          
          .remove-user-btn {
            opacity: 0.7;
            
            &:hover {
              opacity: 1;
            }
          }
        }
      }
    }
  }
  
  .performance-monitor {
    border-top: 1px solid var(--el-border-color-light);
    padding-top: 15px;
    
    h4 {
      margin: 0 0 10px 0;
    }
    
    .monitor-data {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 15px;
      
      .monitor-item {
        border: 1px solid var(--el-border-color-light);
        padding: 8px 12px;
        border-radius: 4px;
        min-width: 120px;
        
        .label {
          display: block;
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
        
        .value {
          font-weight: bold;
          
          &.fps-excellent {
            color: var(--el-color-success);
          }
          
          &.fps-good {
            color: var(--el-color-primary);
          }
          
          &.fps-average {
            color: var(--el-color-warning);
          }
          
          &.fps-poor {
            color: var(--el-color-danger);
          }
        }
      }
    }
    
    .comparison-data {
      border: 1px solid var(--el-border-color-light);
      border-radius: 4px;
      padding: 10px;
      
      h5 {
        margin: 0 0 10px 0;
      }
    }
  }
}
</style> 