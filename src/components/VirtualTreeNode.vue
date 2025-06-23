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
      <!-- 图标或头像 -->
      <span class="el-tree-node__icon">
        <el-avatar v-if="isUser && node.avatar" :size="24" :src="node.avatar" />
        <el-icon v-else-if="isUser"><User /></el-icon>
        <el-icon v-else-if="node.isLeaf"><Document /></el-icon>
        <el-icon v-else-if="node.expanded"><FolderOpened /></el-icon>
        <el-icon v-else><Folder /></el-icon>
      </span>

      <!-- 文本内容 -->
      <div class="el-tree-node__content">
        <!-- 名称 -->
        <span v-if="node.matched" class="el-tree-node__label-text matched">{{ node.name }}</span>
        <span v-else class="el-tree-node__label-text">{{ node.name }}</span>
        
        <!-- 用户节点额外信息 -->
        <template v-if="isUser">
          <span class="el-tree-node__position">{{ node.position }}</span>
          <div class="el-tree-node__details" v-if="node.selected || node.expanded">
            <div v-if="node.phone" class="el-tree-node__detail-item">
              <el-icon><Phone /></el-icon>
              <span>{{ node.phone }}</span>
            </div>
            <div v-if="node.email" class="el-tree-node__detail-item">
              <el-icon><Message /></el-icon>
              <span>{{ node.email }}</span>
            </div>
            <div v-if="node.departmentName" class="el-tree-node__detail-item">
              <el-icon><OfficeBuilding /></el-icon>
              <span>{{ node.departmentName }}</span>
            </div>
            <div v-if="node.status" class="el-tree-node__detail-item">
              <el-icon><User /></el-icon>
              <span>{{ node.status }}</span>
            </div>
          </div>
        </template>
        
        <!-- 部门节点额外信息 -->
        <template v-else-if="node.expanded">
          <div class="el-tree-node__details" v-if="node.manager || node.code">
            <div v-if="node.manager" class="el-tree-node__detail-item">
              <el-icon><UserFilled /></el-icon>
              <span>负责人: {{ node.manager }}</span>
            </div>
            <div v-if="node.code" class="el-tree-node__detail-item">
              <el-icon><Ticket /></el-icon>
              <span>编码: {{ node.code }}</span>
            </div>
          </div>
        </template>
      </div>
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
  User,
  UserFilled,
  Phone,
  Message,
  OfficeBuilding,
  Ticket
} from '@element-plus/icons-vue';
import { ElIcon, ElCheckbox, ElAvatar } from 'element-plus';

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
  &.is-user-node {
    .el-tree-node__icon {
      .el-avatar {
        vertical-align: middle;
        margin-right: 5px;
      }
    }
  }
  
  .el-tree-node__label {
    display: flex;
    align-items: flex-start;
    
    .el-tree-node__content {
      display: flex;
      flex-direction: column;
      
      .el-tree-node__label-text {
        font-weight: 500;
        
        &.matched {
          color: var(--el-color-danger);
          font-weight: bold;
        }
      }
      
      .el-tree-node__position {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 2px;
      }
      
      .el-tree-node__details {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 4px;
        padding-left: 2px;
        
        .el-tree-node__detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 2px;
          
          .el-icon {
            margin-right: 4px;
            font-size: 12px;
          }
        }
      }
    }
  }
  
  &.is-current {
    .el-tree-node__label-text {
      color: var(--el-color-primary);
    }
  }
}
</style> 