declare module 'node-printer' {
  interface PrinterInfo {
    name: string;
    description?: string;
    status?: string;
    isDefault?: boolean;
  }

  interface PrintOptions {
    filename: string;
    printer: string;
    success?: (jobID: number) => void;
    error?: (error: Error) => void;
  }

  interface PrintJob {
    id: number;
    status: string;
  }

  function getPrinters(): PrinterInfo[];
  function printFile(options: PrintOptions): Promise<PrintJob>;

  export = {
    getPrinters,
    printFile
  };
} 