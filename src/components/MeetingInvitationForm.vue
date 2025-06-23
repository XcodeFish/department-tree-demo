<template>
  <el-dialog
    v-model="isVisible"
    title="会议邀请"
    width="600px"
    destroy-on-close
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="invitation-form"
    >
      <el-form-item label="会议主题" prop="title">
        <el-input v-model="form.title" placeholder="请输入会议主题" />
      </el-form-item>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="form.startTime"
              type="datetime"
              placeholder="选择开始时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :default-time="new Date(2000, 1, 1, 9, 0, 0)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="form.endTime"
              type="datetime"
              placeholder="选择结束时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :default-time="new Date(2000, 1, 1, 10, 0, 0)"
            />
          </el-form-item>
        </el-col>
      </el-row>
      
      <el-form-item label="会议地点" prop="location">
        <el-input v-model="form.location" placeholder="请输入会议地点" />
      </el-form-item>
      
      <el-form-item label="会议类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio label="online">线上会议</el-radio>
          <el-radio label="offline">线下会议</el-radio>
          <el-radio label="hybrid">混合会议</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item label="已选择参会人员">
        <div class="selected-attendees">
          <el-empty v-if="!attendees.length" description="未选择参会人员" />
          <el-scrollbar v-else height="200px">
            <el-table
              :data="attendees"
              style="width: 100%"
              size="small"
              border
            >
              <el-table-column prop="name" label="姓名" width="100" />
              <el-table-column prop="position" label="职位" width="120" />
              <el-table-column prop="departmentName" label="部门" width="140" />
              <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
            </el-table>
          </el-scrollbar>
        </div>
      </el-form-item>
      
      <el-form-item label="会议说明" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          placeholder="请输入会议说明"
          :rows="3"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit">
          发送邀请
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

// 接收props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  attendees: {
    type: Array,
    default: () => []
  }
});

// 定义事件
const emit = defineEmits(['close', 'submit']);

// 对话框显示状态
const isVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) {
      emit('close');
    }
  }
});

// 表单引用
const formRef = ref(null);

// 表单数据
const form = ref({
  title: '',
  startTime: dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm'),
  endTime: dayjs().add(2, 'hour').format('YYYY-MM-DD HH:mm'),
  location: '',
  type: 'online',
  description: ''
});

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入会议主题', trigger: 'blur' }
  ],
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    { 
      validator: (rule, value, callback) => {
        if (value && form.value.startTime && dayjs(value).isBefore(dayjs(form.value.startTime))) {
          callback(new Error('结束时间必须晚于开始时间'));
        } else {
          callback();
        }
      }, 
      trigger: 'change' 
    }
  ],
  location: [
    { required: true, message: '请输入会议地点', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择会议类型', trigger: 'change' }
  ]
};

// 监听开始时间变化，自动调整结束时间
watch(() => form.value.startTime, (newStartTime) => {
  if (newStartTime && (!form.value.endTime || dayjs(form.value.endTime).isBefore(dayjs(newStartTime)))) {
    form.value.endTime = dayjs(newStartTime).add(1, 'hour').format('YYYY-MM-DD HH:mm');
  }
});

// 关闭对话框
const handleClose = () => {
  emit('close');
  resetForm();
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    
    // 如果有参会人员才允许提交
    if (props.attendees.length === 0) {
      ElMessage.warning('请先选择参会人员');
      return;
    }
    
    const formData = {
      ...form.value,
      attendees: props.attendees.map(attendee => ({
        id: attendee.id,
        name: attendee.name,
        position: attendee.position || '无职位',
        department: attendee.departmentName || '未知部门',
        email: attendee.email || `${attendee.id}@example.com`
      }))
    };
    
    emit('submit', formData);
  } catch (error) {
    // 表单验证失败，由Element Plus表单自动显示错误信息
  }
};
</script>

<style lang="scss" scoped>
.invitation-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 10px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 3px;
  }
}

.selected-attendees {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  min-height: 200px;
}

.dialog-footer {
  padding-top: 20px;
  text-align: right;
}
</style> 