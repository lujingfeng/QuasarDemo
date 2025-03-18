import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url'
import pkg from 'electron-updater';

const {autoUpdater} = pkg

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;

// 打印机相关的IPC处理
ipcMain.handle('get-printers', async () => {
  try {
    console.log('开始获取打印机列表...');
    if (!mainWindow) {
      console.error('主窗口未初始化');
      return [];
    }

    const printers = await mainWindow.webContents.getPrintersAsync();
    console.log('获取到的打印机列表:', JSON.stringify(printers, null, 2));
    
    if (!printers || printers.length === 0) {
      console.log('未检测到打印机，尝试检查系统打印机...');
      // 在 macOS 上使用 lpstat 命令检查系统打印机
      if (platform === 'darwin') {
        const { exec } = require('child_process');
        exec('lpstat -p', (error: Error | null, stdout: string) => {
          if (error) {
            console.error('执行 lpstat 命令失败:', error);
            return;
          }
          console.log('系统打印机列表:', stdout);
        });
      }
    }
    
    return printers || [];
  } catch (error) {
    console.error('获取打印机列表失败:', error);
    if (error instanceof Error) {
      console.error('错误名称:', error.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    return [];
  }
});

// 获取打印机驱动信息
ipcMain.handle('get-printer-drivers', async () => {
  try {
    console.log('开始获取打印机驱动信息...');
    if (!mainWindow) {
      console.error('主窗口未初始化');
      return [];
    }

    const printers = await mainWindow.webContents.getPrintersAsync();
    
    // 获取每个打印机的驱动信息
    const printerDrivers = printers.map(printer => ({
      name: printer.name,
      displayName: printer.displayName,
      description: printer.description,
      status: printer.status,
      isDefault: printer.isDefault,
      options: printer.options || {}
    }));

    console.log('打印机驱动信息:', JSON.stringify(printerDrivers, null, 2));
    return printerDrivers;
  } catch (error) {
    console.error('获取打印机驱动信息失败:', error);
    return [];
  }
});

// 打印文件
ipcMain.handle('print-file', async (_event, { printerName, filePath, options = {} }) => {
  if (!mainWindow) {
    throw new Error('主窗口未初始化');
  }

  try {
    const defaultOptions = {
      silent: false,
      printBackground: true,
      deviceWidth: '210mm', // A4 宽度
      deviceHeight: '297mm', // A4 高度
      marginType: 0, // 0 = 默认边距
      copies: 1,
      printerName: printerName,
      pageSize: 'A4' as const,
      showPrintDialog: true,
      color: true,
      marginsType: 0,
      landscape: false,
      scaleFactor: 100,
      pagesPerSheet: 1,
      collate: false,
      duplex: 0,
      dpi: { horizontal: 300, vertical: 300 },
      headerFooterEnabled: false,
      pageRanges: [{ from: 1, to: 1 }]
    };

    // 合并默认选项和用户选项
    const printOptions = { ...defaultOptions, ...options };

    // 如果有文件路径，先加载文件
    if (filePath) {
      await mainWindow.webContents.loadFile(filePath);
    }

    // 执行打印
    mainWindow.webContents.print(printOptions, (success, errorType) => {
      if (success) {
        console.log('打印成功');
        mainWindow?.webContents.send('print-progress', 100);
      } else {
        console.error('打印失败:', errorType);
        mainWindow?.webContents.send('print-progress', 0);
      }
    });

    return true;
  } catch (error) {
    console.error('创建打印任务失败:', error);
    throw new Error('创建打印任务失败');
  }
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
ipcMain.handle('check-for-updates', () => {
  if (process.env.DEV) {
    console.log('开发环境不检查更新');
    return;
  }
  return autoUpdater.checkForUpdates();
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
