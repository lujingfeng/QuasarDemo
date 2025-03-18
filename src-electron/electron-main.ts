import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url'
import { autoUpdater } from 'electron-updater';
import printer from 'node-printer';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;

// 打印机相关的IPC处理
ipcMain.handle('get-printers', () => {
  return printer.getPrinters();
});

ipcMain.handle('print-file', async (_event, { printerName, filePath }) => {
  return new Promise<void>((resolve, reject) => {
    void printer.printFile({
      filename: filePath,
      printer: printerName,
      success: (jobID: number) => {
        console.log('打印任务已创建，ID:', jobID);
        mainWindow?.webContents.send('print-progress', 0);
        resolve();
      },
      error: (err: Error) => {
        console.error('打印错误:', err);
        mainWindow?.webContents.send('print-progress', 100);
        reject(err);
      }
    });
  });
});

// 配置自动更新
function configureAutoUpdater() {
  // 设置更新服务器地址
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://lujingfeng.oss-cn-beijing.aliyuncs.com/updates'
  });

  // 检查更新错误
  autoUpdater.on('error', (err) => {
    console.log('更新错误: ', err);
    mainWindow?.webContents.send('update-error', err);
  });

  // 检查是否有更新
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...');
    mainWindow?.webContents.send('checking-for-update');
  });

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('有可用更新: ', info);
    mainWindow?.webContents.send('update-available', info);
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log('没有可用更新: ', info);
    mainWindow?.webContents.send('update-not-available', info);
  });

  // 更新下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    console.log('下载进度: ', progressObj);
    mainWindow?.webContents.send('download-progress', progressObj);
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新已下载: ', info);
    mainWindow?.webContents.send('update-downloaded', info);
  });
}

// 处理来自渲染进程的更新请求
ipcMain.handle('check-for-updates', async () => {
  if (process.env.DEV) {
    console.log('开发环境不检查更新');
    return;
  }
  await autoUpdater.checkForUpdates();
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || '', 'electron-preload' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || ''))
      ),
    },
  });

  try {
    if (process.env.DEV) {
      await mainWindow.loadURL(process.env.APP_URL || '');
    } else {
      await mainWindow.loadFile('index.html');
    }

    if (process.env.DEBUGGING) {
      // if on DEV or Production with debug enabled
      mainWindow.webContents.openDevTools();
    } else {
      // we're on production; no access to devtools pls
      mainWindow.webContents.on('devtools-opened', () => {
        mainWindow?.webContents.closeDevTools();
      });
    }

    mainWindow.on('closed', () => {
      mainWindow = undefined;
    });

    // 初始化自动更新
    configureAutoUpdater();
    
    // 在生产环境下自动检查更新
    if (!process.env.DEV) {
      await autoUpdater.checkForUpdates();
    }
  } catch (error) {
    console.error('创建窗口时出错:', error);
  }
}

void app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow();
  }
});
