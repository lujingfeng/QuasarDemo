
declare module 'electron' {
  interface PrinterInfo {
    name: string;
    description: string;
    status: number;
    isDefault: boolean;
    options?: {
      'printer-make-and-model': string;
      'printer-location': string;
      [key: string]: string | undefined;
    };
  }

  interface WebContents {
    getPrinters(): PrinterInfo[];
    getPrintersAsync(): PrinterInfo[];
  }
} 