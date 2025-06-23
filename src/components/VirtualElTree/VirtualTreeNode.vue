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
        <CaretRight :class="{ 'expanded': node.expanded }" />
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
      <!-- 图标/头像 -->
      <span class="el-tree-node__icon">
        <el-avatar 
          v-if="isUser"
          :size="24"
          :src="node.avatar"
          :class="{'default-avatar': !node.avatar}"
        >
          {{ node.name.charAt(0) }}
        </el-avatar>
        <el-icon v-else-if="node.isLeaf"><Document /></el-icon>
        <el-icon v-else-if="node.expanded"><Folder /></el-icon>
        <el-icon v-else><FolderOpened /></el-icon>
      </span>

      <!-- 主要信息 -->
      <span class="el-tree-node__content">
        <!-- 文本 -->
        <span 
          v-if="node.matched" 
          class="el-tree-node__label-text matched"
        >
          {{ node.name }}
        </span>
        <span v-else class="el-tree-node__label-text">{{ node.name }}</span>
        
        <!-- 用户附加信息 -->
        <template v-if="isUser">
          <span class="el-tree-node__user-info">
            <el-tag size="small" effect="plain">{{ node.position }}</el-tag>
            <span class="user-department">{{ node.departmentName }}</span>
          </span>
        </template>
        
        <!-- 部门计数 -->
        <template v-else-if="!node.isLeaf">
          <span class="el-tree-node__dept-count">
            <el-tag 
              size="small" 
              type="info" 
              effect="plain"
              :class="{'dept-tag': true}"
            >
              {{ getChildrenCount(node) }}
            </el-tag>
          </span>
        </template>
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
import { ElCheckbox, ElAvatar, ElTag } from 'element-plus';

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

const isUser = computed(() => props.node.type === 'user');
const loading = computed(() => props.node.loading);
const hasChildren = computed(() =>
  Array.isArray(props.node.children) && props.node.children.length > 0
);
const showExpander = computed(() =>
  !isUser.value && (hasChildren.value || loading.value || (!props.node.isLeaf && !loading.value))
);

// 获取子节点数量（用于显示部门人员计数）
const getChildrenCount = (node) => {
  return node.children?.length || 0;
};

// 处理点击展开/折叠图标
function handleExpanderClick(e) {
  if (showExpander.value) {
    emit('toggle', props.node.id);
  }
}

// 处理点击节点选择
function handleNodeClick() {
  emit('select', props.node.id);
}

// 处理复选框点击
function handleCheckboxClick(checked) {
  emit('check', props.node.id, checked);
}
</script>

<style lang="scss" scoped>
.el-tree-node {
  padding: 4px 0;
  
  &.is-user-node {
    .el-tree-node__icon {
      .el-avatar {
        vertical-align: middle;
        margin-right: 5px;
        background-color: var(--el-color-primary);
        
        &.default-avatar {
          color: #fff;
        }
      }
    }
    
    .el-tree-node__user-info {
      margin-left: 8px;
      display: flex;
      align-items: center;
      
      .el-tag {
        margin-right: 8px;
        font-size: 12px;
      }
      
      .user-department {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
  
  &.is-matched {
    background-color: var(--el-color-warning-light-9);
    
    .el-tree-node__label-text.matched {
      color: var(--el-color-danger);
      font-weight: bold;
    }
  }
  
  .el-tree-node__label {
    display: flex;
    align-items: center;
    
    .el-tree-node__content {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }
    
    .el-tree-node__dept-count {
      margin-left: 8px;
      
      .dept-tag {
        font-size: 11px;
      }
    }
  }
  
  .el-tree-node__expand-icon {
    .expanded {
      transform: rotate(90deg);
    }
  }
  
  &.is-current {
    background-color: var(--el-color-primary-light-9);
  }
}
</style> 