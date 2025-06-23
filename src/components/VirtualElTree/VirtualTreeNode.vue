<!-- VirtualTreeNode.vue -->
<template>
  <div
    class="el-tree-node"
    :class="{
      'is-expanded': node.expanded,
      'is-current': node.selected,
      'is-matched': node.matched,
      'is-user-node': isUser
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
        <CaretRight :class="{ 'is-expanded': node.expanded }" />
      </el-icon>
    </span>

    <!-- 复选框 -->
    <el-checkbox
      v-if="checkable"
      :model-value="node.checked"
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
        <el-icon v-else-if="node.expanded"><Folder /></el-icon>
        <el-icon v-else><FolderOpened /></el-icon>
      </span>

      <!-- 文本 -->
      <span v-if="node.matched" class="el-tree-node__label-text matched">{{ node.name }}</span>
      <span v-else class="el-tree-node__label-text">{{ node.name }}</span>

      <!-- 用户附加信息 -->
      <span v-if="isUser && node.position" class="el-tree-node__extra-info">{{ node.position }}</span>
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
 * 树节点组件props定义
 */
const props = defineProps({
  /**
   * 节点数据
   */
  node: {
    type: Object,
    required: true
  },
  /**
   * 是否可选中
   */
  checkable: {
    type: Boolean,
    default: false
  },
  /**
   * 是否处于加载状态
   */
  loading: {
    type: Boolean,
    default: false
  }
});

/**
 * 定义事件
 */
const emit = defineEmits(['toggle', 'select', 'check']);

/**
 * 判断是否为用户节点
 */
const isUser = computed(() => props.node.type === 'user');

/**
 * 是否显示展开图标
 */
const showExpander = computed(() => {
  if (isUser.value) return false;
  return Array.isArray(props.node.children) && props.node.children.length > 0;
});

/**
 * 处理展开/折叠图标点击
 */
function handleExpanderClick(e) {
  if (showExpander.value) {
    emit('toggle', props.node.id);
  }
}

/**
 * 处理节点点击
 */
function handleNodeClick() {
  emit('select', props.node.id);
}

/**
 * 处理复选框点击
 */
function handleCheckboxClick(checked) {
  emit('check', props.node.id, checked);
}
</script>

<style lang="scss" scoped>
.el-tree-node {
  display: flex;
  align-items: center;
  padding: 0 3px;
  height: 100%;
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  
  &:hover {
    background-color: var(--el-fill-color-light);
  }
  
  &.is-current {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &.is-matched {
    .matched {
      color: var(--el-color-danger);
      font-weight: bold;
    }
  }

  &.is-user-node {
    padding-right: 8px;
  }
  
  .el-tree-node__expand-icon {
    padding: 6px;
    cursor: pointer;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    transform: rotate(0deg);
    transition: transform 0.3s ease-in-out;
    
    &.expanded {
      transform: rotate(90deg);
    }
    
    &.is-leaf {
      visibility: hidden;
      cursor: default;
    }

    .is-expanded {
      transform: rotate(90deg);
    }
  }
  
  .el-tree-node__label {
    flex: 1;
    display: flex;
    align-items: center;
    
    .el-tree-node__icon {
      margin-right: 8px;
      color: var(--el-text-color-secondary);
    }
    
    .el-tree-node__label-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .el-tree-node__extra-info {
      margin-left: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style> 