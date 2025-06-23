<!-- VirtualTreeNode.vue -->
<template>
  <div
    class="el-tree-node"
    :class="{
      'is-expanded': node.expanded,
      'is-current': node.selected
    }"
    :style="{ paddingLeft: `${node.level * 18}px` }"
  >
    <!-- 展开/折叠图标 -->
    <span
      class="el-tree-node__expand-icon"
    >
      <el-icon><CaretRight /></el-icon>
    </span>

    <!-- 节点内容 -->
    <span class="el-tree-node__label">
      <!-- 文本 -->
      <span class="el-tree-node__label-text">{{ node.name }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { CaretRight } from '@element-plus/icons-vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

// 基础节点组件，暂时简化
</script>

<style scoped>
/* 样式将通过styles.scss引入 */
</style> 