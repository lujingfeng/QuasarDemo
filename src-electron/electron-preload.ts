/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.ts you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { UpdateInfo, ProgressInfo } from '../src/electron-api';
import type { PrinterInfo } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  // 退出并安装更新
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  // 更新事件监听器
  onUpdateError: (callback: (error: Error) => void) => 
    ipcRenderer.on('update-error', (_event, error) => callback(error)),
  onCheckingForUpdate: (callback: () => void) => 
    ipcRenderer.on('checking-for-update', () => callback()),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => 
    ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => 
    ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
  onDownloadProgress: (callback: (progressObj: ProgressInfo) => void) => 
    ipcRenderer.on('download-progress', (_event, progressObj) => callback(progressObj)),
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => 
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
  // 打印机相关API
  getPrinters: () => ipcRenderer.invoke('get-printers') as Promise<PrinterInfo[]>,
  printFile: (printerName: string, filePath: string) => 
    ipcRenderer.invoke('print-file', { printerName, filePath }),
  onPrintProgress: (callback: (progress: number) => void) =>
    ipcRenderer.on('print-progress', (_event, progress) => callback(progress)),
});
