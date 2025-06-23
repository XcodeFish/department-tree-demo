<!-- VirtualTreeNode.vue -->
<template>
  <div
    class="el-tree-node"
    :class="{
      'is-expanded': node.expanded,
      'is-current': node.selected,
      'is-matched': node.matched,
      'is-user-node': isUser,
      'is-checked': node.checked
    }"
    :style="{ paddingLeft: `${node.level * 18}px` }"
    @click="handleNodeClick"
  >
    <!-- 展开/折叠图标 -->
    <span
      class="el-tree-node__expand-icon"
      :class="{
        'is-expanded': node.expanded && showExpander,
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
        <el-icon v-else-if="node.expanded"><FolderOpened /></el-icon>
        <el-icon v-else><Folder /></el-icon>
      </span>

      <!-- 文本 -->
      <span v-if="node.matched" class="el-tree-node__label-text matched">{{ node.name || node.label }}</span>
      <span v-else class="el-tree-node__label-text">{{ node.name || node.label }}</span>

      <!-- 人员节点附加信息 -->
      <span v-if="isUser && node.position" class="el-tree-node__extra">
        {{ node.position }}
      </span>
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
  emit('select', props.node.id);
}

/**
 * 处理复选框点击
 * @param {Boolean} checked - 选中状态
 */
function handleCheckboxClick(checked) {
  emit('check', props.node.id, checked);
}
</script>

<style lang="scss" scoped>
.el-tree-node {
  padding: 0;
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;

  &:hover {
    background-color: var(--el-bg-color-hover);
  }

  &.is-current {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &.is-checked {
    font-weight: bold;
  }

  &.is-matched {
    .el-tree-node__label-text {
      color: var(--el-color-danger);
      font-weight: bold;
    }
  }

  &.is-user-node {
    .el-tree-node__icon {
      .el-icon {
        color: var(--el-color-info);
      }
    }

    .el-tree-node__extra {
      margin-left: 8px;
      color: var(--el-color-info);
      font-size: 12px;
    }
  }

  .el-tree-node__expand-icon {
    padding: 6px;
    cursor: pointer;
    transform: rotate(0deg);
    transition: transform .3s ease-in-out;

    &.is-expanded {
      transform: rotate(90deg);
    }

    &.is-leaf {
      visibility: hidden;
      cursor: default;
    }

    .el-icon {
      font-size: 14px;
      vertical-align: middle;
    }
  }

  .el-tree-node__label {
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
    padding: 0 5px;
    overflow: hidden;

    .el-tree-node__icon {
      margin-right: 8px;
      font-size: 16px;
      display: inline-flex;
      align-items: center;

      .el-avatar {
        vertical-align: middle;
        margin-right: 5px;
        background-color: var(--el-color-primary-light-7);
      }
    }

    .el-tree-node__label-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style> 