<script setup>
import { ref } from 'vue';
import { ElCard } from 'element-plus';
import VirtualElTree from './components/VirtualElTree/index.vue';
import { generateTestTreeData } from './utils/treeUtils';

// 生成测试数据
const treeData = ref(generateTestTreeData(2, 3, 2));
const loading = ref(false);
</script>

<template>
  <div class="app-container">
    <el-card title="部门树Demo" class="department-tree-card">
      <virtual-el-tree 
        :tree-data="treeData" 
        :height="500" 
        :loading="loading" 
      />
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.department-tree-card {
  margin-bottom: 20px;
}
</style>
