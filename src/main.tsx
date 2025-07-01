import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

// Configurar PDF.js Worker a nivel global
import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from 'react-pdf';

// Asegurar que estamos usando la misma versión de worker que la API
// Usar la versión del paquete directamente
const pdfjsVersion = pdfjsLib.version;
const WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
console.log(`Configurando PDF.js worker versión ${pdfjsVersion}`);

// Aplicar la configuración a ambas instancias
pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
); 