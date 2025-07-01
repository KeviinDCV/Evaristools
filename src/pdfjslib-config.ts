// Configuración global para pdfjs-dist
// Este archivo ya no necesita configurar el worker directamente, ya se hace en index.html 

// Definir la interfaz del worker para TypeScript
declare global {
  interface Window {
    __REACT_PDF_WORKER_SRC__?: string;
    pdfjsLib?: any;
  }
}

// Recuperar pdfjsLib desde la variable global preconfigurada en el HTML
export const pdfjsLib = typeof window !== 'undefined' && window.pdfjsLib 
  ? window.pdfjsLib 
  : {}; 