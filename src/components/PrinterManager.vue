<template>
  <div class="printer-manager">
    <div class="row q-mb-md">
      <div class="col-12">
        <h5 class="q-mt-none q-mb-md">打印机管理2</h5>
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

    <q-btn color="primary" label="主进程实现远程接口调用" @click="fetchRandomUser" />

    <q-btn @click="addData">添加数据</q-btn>
    <q-btn @click="fetchData">获取数据</q-btn>
    <q-btn @click="testTransaction">测试事务回滚</q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import type { PrinterInfo } from '../electron-api';
import { app } from 'electron';

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
    const appPath = app.getAppPath();
    const testPagePath = `${appPath}/class.docx`
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

const fetchRandomUser = async () => {
  const result = await window.electronAPI.fetchRandomUser();
  console.log('随机用户:',result);
  $q.notify({
      type: 'info',
      message: `获取随机用户成功`,
      position: 'top'
    });
};

onMounted(() => {
  void refreshPrinters();
  window.electronAPI.onPrintProgress(handlePrintProgress);
});

onUnmounted(() => {
  // 清理事件监听器
  window.electronAPI.onPrintProgress(() => {});
});


let db: IDBDatabase;
const request = indexedDB.open("TestDB", 1);
request.onupgradeneeded = function(event:Event) {
  db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains("users")) {
    db.createObjectStore("users", { keyPath: "id" });
  }
};
request.onsuccess = function(event:Event) {
  db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains("users")) {
    db.createObjectStore("users", { keyPath: "id" });
  }
};
request.onerror = function(event:Event) {
  console.error("Database error: ", (event.target as IDBOpenDBRequest).error?.message);
};

function addData() {
  const transaction = db.transaction(["users"], "readwrite");
  const store = transaction.objectStore("users");
  const user = { id: Date.now(), name: "User" + Math.floor(Math.random() * 100) };
  store.add(user);
  transaction.oncomplete = () => alert("Data added!");
}

function fetchData() {
  const transaction = db.transaction(["users"], "readonly");
  const store = transaction.objectStore("users");
  const request = store.getAll();
  request.onsuccess = function() {
    $q.notify({
      type: 'info',
      message:  JSON.stringify(request.result, null, 2),
      position: 'top'
    });
  };
}

function testTransaction() {
  const transaction = db.transaction(["users"], "readwrite");
  const store = transaction.objectStore("users");
  store.add({ id: "rollback", name: "Will be rolled back" });
  transaction.abort();
  transaction.onabort = () => {
    $q.notify({
      type: 'info',
      message:  "rolled back",
      position: 'top'
    });
  }
}


</script>

<style scoped>
.printer-manager {
  padding: 20px;
}
</style> 