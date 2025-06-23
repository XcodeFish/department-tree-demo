<!-- VirtualTreeNode.vue -->
<template>
  <div
    class="el-tree-node"
    :class="{
      'is-expanded': node.expanded,
      'is-current': node.selected,
      'is-matched': node.matched,
      'is-user-node': isUser,
      'is-checked': node.checked,
      'is-indeterminate': node.indeterminate
    }"
    :style="{ paddingLeft: `${node.level * 18}px` }"
    @click="handleNodeClick"
  >
    <!-- 展开/折叠图标 -->
    <span
      class="el-tree-node__expand-icon"
      :class="{
        'expanded': node.expanded && showExpander,
        'is-leaf': !showExpander
      }"
      @click.stop="handleExpanderClick"
    >
      <el-icon v-if="loading"><Loading /></el-icon>
      <el-icon v-else-if="showExpander">
        <CaretRight :class="{ 'expanded': node.expanded }" />
      </el-icon>
    </span>

    <!-- 复选框 -->
    <el-checkbox
      v-if="checkable"
      :model-value="node.checked"
      :indeterminate="node.indeterminate"
      @update:model-value="handleCheckboxClick"
      @click.stop
    />

    <!-- 节点内容 -->
    <span class="el-tree-node__label">
      <!-- 图标 -->
      <span class="el-tree-node__icon">
        <el-avatar v-if="isUser && node.avatar" :size="24" :src="node.avatar" />
        <el-icon v-else-if="isUser"><User /></el-icon>
        <el-icon v-else-if="node.isLeaf"><Document /></el-icon>
        <el-icon v-else-if="node.expanded"><FolderOpened /></el-icon>
        <el-icon v-else><Folder /></el-icon>
      </span>

      <!-- 文本 -->
      <span v-if="node.matched" class="el-tree-node__label-text matched">{{ node.name }}</span>
      <span v-else class="el-tree-node__label-text">{{ node.name }}</span>
      
      <!-- 职位信息 (仅用户节点) -->
      <span v-if="isUser && node.position" class="el-tree-node__position">{{ node.position }}</span>
    </span>
    
    <!-- 右侧附加信息 -->
    <span v-if="isUser && showExtraInfo" class="el-tree-node__extra">
      <span v-if="node.email" class="el-tree-node__email" :title="node.email">{{ node.email }}</span>
      <span v-if="node.phone" class="el-tree-node__phone">{{ node.phone }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  CaretRight,
  Loading,
  Document,
  Folder,
  FolderOpened,
  User
} from '@element-plus/icons-vue';
import { ElIcon, ElCheckbox, ElAvatar } from 'element-plus';

/**
 * 树节点组件 - 支持部门和人员节点的渲染
 * @property {Object} node - 节点数据
 * @property {Boolean} checkable - 是否显示复选框
 */
const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  checkable: {
    type: Boolean,
    default: false
  },
  showExtraInfo: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle', 'select', 'check']);

// 计算属性
const isUser = computed(() => props.node.type === 'user');
const loading = computed(() => props.node.loading);
const hasChildren = computed(() =>
  Array.isArray(props.node.children) && props.node.children.length > 0
);
const showExpander = computed(() =>
  !isUser.value && (hasChildren.value || loading.value || (!props.node.isLeaf && !loading.value))
);

/**
 * 处理展开/折叠图标点击
 */
function handleExpanderClick(e) {
  if (showExpander.value) {
    emit('toggle', props.node.id);
  }
}

/**
 * 处理节点点击选择
 */
function handleNodeClick() {
  // 发送选择事件，由父组件处理
  // 父组件会同步处理节点选中和复选框状态的同步
  emit('select', props.node.id);
}

/**
 * 处理复选框点击
 * @param {Boolean} checked - 选中状态
 */
function handleCheckboxClick(checked) {
  // 发送复选框选中事件，由父组件处理
  // 父组件会同步处理节点选中和复选框状态的同步
  emit('check', props.node.id, checked);
}
</script>

<style lang="scss" scoped>
.el-tree-node {
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  
  &:hover {
    background-color: var(--el-bg-color-hover);
  }
  
  &.is-current {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
  
  &.is-checked {
    background-color: var(--el-color-primary-light-8);
  }
  
  &.is-matched {
    .el-tree-node__label-text {
      color: var(--el-color-danger);
      font-weight: bold;
    }
  }
  
  .el-tree-node__expand-icon {
    padding: 6px;
    cursor: pointer;
    
    &.expanded {
      transform: rotate(90deg);
    }
    
    &.is-leaf {
      opacity: 0;
      cursor: default;
    }
  }
  
  .el-tree-node__label {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 5px;
    overflow: hidden;
    
    .el-tree-node__icon {
      margin-right: 8px;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
    }
    
    .el-tree-node__label-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    
    .el-tree-node__position {
      margin-left: 8px;
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }
  
  .el-tree-node__extra {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
  }
  
  &.is-user-node {
    .el-tree-node__icon {
      .el-avatar {
        margin-right: 5px;
      }
    }
  }
}
</style> 