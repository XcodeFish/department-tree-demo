<script setup>
import { ref, onMounted } from 'vue';
import { ElConfigProvider } from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import MeetingInvitation from './components/MeetingInvitation.vue';

// Element Plus语言设置
const locale = zhCn;
</script>

<template>
  <div class="app-container">
    <el-config-provider :locale="locale">
      <!-- 会议邀请组件 -->
      <meeting-invitation />
    </el-config-provider>
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
