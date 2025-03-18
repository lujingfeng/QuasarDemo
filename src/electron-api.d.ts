export interface UpdateInfo {
  version: string;
  files: Array<{
    url: string;
    sha512: string;
    size: number;
    blockMapSize?: number;
  }>;
  path: string;
  sha512: string;
  releaseDate: string;
}

export interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface PrinterInfo {
  name: string;
  description?: string;
  status?: string;
  isDefault?: boolean;
}

export interface ElectronAPI {
  // 打印机相关API
  getPrinters: () => Promise<PrinterInfo[]>;
  printFile: (printerName: string, filePath: string) => Promise<void>;
  onPrintProgress: (callback: (progress: number) => void) => void;

  // 更新相关API
  checkForUpdates: () => Promise<void>;
  quitAndInstall: () => void;
  onUpdateError: (callback: (error: Error) => void) => void;
  onCheckingForUpdate: (callback: () => void) => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (progressObj: ProgressInfo) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 