<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useQuasar } from 'quasar';
import type { UpdateInfo, ProgressInfo } from './electron-api';

const $q = useQuasar();

onMounted(() => {
  if( !window.electronAPI){
    return
  }
  
  // 监听更新错误
  window.electronAPI.onUpdateError((err) => {
    $q.notify({
      type: 'negative',
      message: `更新失败`,
      position: 'top'
    });

    console.error('更新错误log:', err);
  });

  // 监听检查更新状态
  window.electronAPI.onCheckingForUpdate(() => {
    $q.notify({
      type: 'info',
      message: '正在检查更新...',
      position: 'top'
    });
  });

  // 监听有可用更新
  window.electronAPI.onUpdateAvailable((updateInfo: UpdateInfo) => {
    $q.notify({
      type: 'positive',
      message: `发现新版本：${updateInfo.version}`,
      position: 'top',
      actions: [
        {
          label: '立即更新',
          color: 'white',
          handler: () => {
            // 这里可以触发下载更新
          }
        }
      ]
    });
  });

  // 监听更新下载进度
  window.electronAPI.onDownloadProgress((progressObj: ProgressInfo) => {
    $q.notify({
      type: 'ongoing',
      message: `下载更新中：${Math.round(progressObj.percent)}%`,
      position: 'top'
    });
  });

  // 监听更新下载完成
  window.electronAPI.onUpdateDownloaded(() => {
    $q.notify({
      type: 'positive',
      message: '更新已下载完成，是否立即安装？',
      position: 'top',
      timeout: 0,
      actions: [
        {
          label: '立即安装',
          color: 'white',
          handler: () => {
            window.electronAPI.quitAndInstall();
          }
        }
      ]
    });
  });

  // 检查更新
  void window.electronAPI.checkForUpdates();
});
</script>
