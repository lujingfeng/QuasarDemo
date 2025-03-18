declare module 'node-printer' {
  interface PrinterOptions {
    filename: string;
    printer: string;
    success?: (jobID: number) => void;
    error?: (err: Error) => void;
  }

  interface Printer {
    getPrinters(): string[];
    printFile(options: PrinterOptions): void;
  }

  const printer: Printer;
  export = printer;
} 