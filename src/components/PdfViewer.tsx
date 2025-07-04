import React from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Configuración del worker ahora está centralizada en main.tsx

interface PdfViewerProps {
  file: string | File | null;
  pageNumber?: number;
  width?: number;
  onLoadSuccess?: (pdf: { numPages: number }) => void;
  renderTextLayer?: boolean;
  renderAnnotationLayer?: boolean;
  scale?: number;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  pageNumber = 1,
  width = 300,
  onLoadSuccess,
  renderTextLayer = true,
  renderAnnotationLayer = true,
  scale = 1.0
}) => {
  // Ya no necesitamos configurar el worker aquí, se hace globalmente en el HTML

  if (!file) return null;

  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      loading={<div className="flex justify-center py-5">Cargando PDF...</div>}
      error={<div className="text-red-500">Error al cargar el PDF</div>}
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        renderTextLayer={renderTextLayer}
        renderAnnotationLayer={renderAnnotationLayer}
        scale={scale}
      />
    </Document>
  );
};

export default PdfViewer; 
