<template>
  <div class="printer-manager">
    <div class="row q-mb-md">
      <div class="col-12">
        <h5 class="q-mt-none q-mb-md">打印机管理</h5>
      </div>
    </div>

    <div class="row q-mb-md">
      <div class="col-12">
        <q-btn color="primary" label="刷新打印机列表" @click="refreshPrinters" />
      </div>
    </div>

    <div class="row q-mb-md" v-if="printers.length">
      <div class="col-12">
        <q-list bordered separator>
          <q-item v-for="printer in printers" :key="printer.name">
            <q-item-section>
              <q-item-label>{{ printer.name }}</q-item-label>
              <q-item-label caption v-if="printer.description">
                {{ printer.description }}
              </q-item-label>
              <q-item-label caption>
                状态: {{ printer.status || '正常' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                color="primary"
                label="打印测试页"
                @click="printTestPage(printer.name)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>

    <div class="row" v-else>
      <div class="col-12 text-center">
        <p>未找到打印机</p>
      </div>
    </div>

    <q-dialog v-model="showProgress">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">打印进度</div>
        </q-card-section>

        <q-card-section>
          {{ progressMessage }}
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="关闭" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import type { PrinterInfo } from '../electron-api';

const $q = useQuasar();
const printers = ref<PrinterInfo[]>([]);
const showProgress = ref(false);
const progressMessage = ref('');

// 刷新打印机列表
const refreshPrinters = async () => {
  try {
    printers.value = await window.electronAPI.getPrinters();

    console.log('打印机列表:',printers.value);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '获取打印机列表失败',
      caption: error instanceof Error ? error.message : String(error)
    });
  }
};

// 打印测试页
const printTestPage = async (printerName: string) => {
  try {
    showProgress.value = true;
    progressMessage.value = '准备打印...';
    
    // 这里应该替换为实际的测试页文件路径
    const testPagePath = '/path/to/test-page.pdf';
    await window.electronAPI.printFile(printerName, testPagePath);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '打印测试页失败',
      caption: error instanceof Error ? error.message : String(error)
    });
  }
};

// 监听打印进度
const handlePrintProgress = (progress: number) => {
  if (progress === 0) {
    progressMessage.value = '打印任务已开始';
  } else if (progress === 100) {
    progressMessage.value = '打印任务已完成';
    showProgress.value = false;
  } else {
    progressMessage.value = `打印进度: ${progress}%`;
  }
};

onMounted(() => {
  void refreshPrinters();
  window.electronAPI.onPrintProgress(handlePrintProgress);
});

onUnmounted(() => {
  // 清理事件监听器
  window.electronAPI.onPrintProgress(() => {});
});
</script>

<style scoped>
.printer-manager {
  padding: 20px;
}
</style> 