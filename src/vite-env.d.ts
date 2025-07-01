/// <reference types="vite/client" />

// Declaración de módulos para tipos que faltan
declare module 'tesseract.js' {
  export interface ProgressPacket {
    status: string;
    progress: number;
    [key: string]: any;
  }

  export interface RecognizeResult {
    data: {
      text: string;
      hocr?: string;
      tsv?: string;
      pdf?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface RecognizeOptions {
    langPath?: string;
    gzip?: boolean;
    logger?: (packet: ProgressPacket) => void;
    [key: string]: any;
  }

  function recognize(
    image: File | Blob | ImageData | HTMLImageElement | HTMLCanvasElement | string,
    lang?: string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult>;

  export default {
    recognize
  };
}
