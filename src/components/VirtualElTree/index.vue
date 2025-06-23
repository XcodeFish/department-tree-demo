<!-- VirtualElTree/index.vue -->
<template>
  <div class="virtual-el-tree-container">
    <!-- 树内容 -->
    <div v-if="loading" class="virtual-el-tree-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>
    <div v-else class="el-tree virtual-el-tree-content" 
      :style="{ height: `${height}px`, overflow: 'auto' }">
      <p>虚拟树组件 - 准备中</p>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef } from 'vue';
import { Loading } from '@element-plus/icons-vue';

const props = defineProps({
  treeData: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 600
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// 状态定义
const visibleNodes = shallowRef([]);

// 暂时使用空数据，后续实现真实逻辑
</script>

<style lang="scss" scoped>
.virtual-el-tree-container {
  width: 100%;

  .virtual-el-tree-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    
    .is-loading {
      font-size: 24px;
      animation: rotating 2s linear infinite;
    }
  }

  .virtual-el-tree-content {
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    padding: 10px;
  }
}

@keyframes rotating {
  0% {
    transform: rotateZ(0deg);
  }
  100% {
    transform: rotateZ(360deg);
  }
}
</style> 