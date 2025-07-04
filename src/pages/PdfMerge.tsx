import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

const PdfMerge: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [serverReady, setServerReady] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar conexión al servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/system-info`);
        if (!response.ok) {
          setServerReady(false);
          // No establecemos mensaje de error aquí, se mostrará en la interfaz
        }
      } catch (err) {
        console.error('Error al verificar el servidor:', err);
        setServerReady(false);
        // No establecemos mensaje de error aquí, se mostrará en la interfaz
      }
    };
    
    checkServer();
  }, []);

  // Función para manipular archivos PDF para unir
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const pdfFilesOnly = newFiles.filter(file => file.type === 'application/pdf');
      
      if (newFiles.length !== pdfFilesOnly.length) {
        setError('Solo se permiten archivos PDF');
      } else {
        setPdfFiles(prev => [...prev, ...pdfFilesOnly]);
        setError(null);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Funciones para reordenar los PDFs
  const moveFileUp = (index: number) => {
    if (index <= 0) return; // No se puede mover más arriba del primer elemento
    
    setPdfFiles(prev => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]]; // Intercambiar posiciones
      return newFiles;
    });
  };

  const moveFileDown = (index: number) => {
    if (index >= pdfFiles.length - 1) return; // No se puede mover más abajo del último elemento
    
    setPdfFiles(prev => {
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]]; // Intercambiar posiciones
      return newFiles;
    });
  };

  // Funciones para drag and drop
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    
    // Necesario para que el drag & drop funcione en Firefox
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    }
    
    // Añadir estilo al elemento arrastrado
    if (e.currentTarget) {
      setTimeout(() => {
        if (e.currentTarget) {
          e.currentTarget.classList.add('opacity-50');
        }
      }, 0);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    
    // Restaurar estilo
    if (e.currentTarget) {
      e.currentTarget.classList.remove('opacity-50');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null) return;
    if (draggedIndex === index) return;
    
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null) return;
    if (draggedIndex === index) return;
    
    // Reordenar los archivos
    setPdfFiles(prev => {
      const newFiles = [...prev];
      const draggedFile = newFiles[draggedIndex];
      
      // Eliminar el archivo arrastrado de su posición original
      newFiles.splice(draggedIndex, 1);
      
      // Insertar el archivo en la nueva posición
      newFiles.splice(index, 0, draggedFile);
      
      return newFiles;
    });
    
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Función para unir PDFs usando el servidor
  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      setError('Se necesitan al menos 2 archivos PDF para unir');
      return;
    }
    
    if (!serverReady) {
      return; // No hay necesidad de establecer error, ya se muestra en la interfaz
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear un FormData para enviar los archivos
      const formData = new FormData();
      
      // Añadir cada archivo al formData en el orden correcto
      pdfFiles.forEach(file => {
        formData.append('files[]', file);
      });
      
      // Enviar los archivos al servidor para la fusión
      const response = await fetch(`${config.apiUrl}/merge-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Si el servidor responde con un error, obtener el mensaje de error
        let errorMessage = 'Error en el servidor';
        
        try {
          // Intentar obtener el mensaje de error JSON
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseErr) {
          // Si no puede analizar JSON, usar mensaje genérico con código de estado
          errorMessage = `Error en el servidor (código ${response.status})`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Descargar el archivo PDF fusionado
      const blob = await response.blob();
      saveAs(blob, 'documentos_fusionados.pdf');
      
      setSuccess('PDFs unidos correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al unir PDFs:', err);
      setError('Ocurrió un error al unir los PDFs: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      setIsProcessing(false);
    }
  };

  // Función fallback para unir PDFs en el cliente (si el servidor no está disponible)
  const mergePdfsClientSide = async () => {
    if (pdfFiles.length < 2) {
      setError('Se necesitan al menos 2 archivos PDF para unir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const mergedPdf = await PDFDocument.create();
      
      for (const file of pdfFiles) {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      
      // Crear un enlace para descargar
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, 'documentos_unidos.pdf');
      
      setSuccess('PDFs unidos correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al unir PDFs:', err);
      setError('Ocurrió un error al unir los PDFs: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Unir PDFs</h1>
        <p className="text-[#5c728a] text-sm">
          Combina múltiples archivos PDF en un único documento. Simplemente selecciona los archivos y ordénalos según tus necesidades.
        </p>
        
        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            El servidor de conversión no está disponible. Se usará el procesamiento local.
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">Seleccionar archivos PDF para unir</h3>
        </div>
        <div className="p-6 flex flex-col space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full bg-[#f9fafb] border border-dashed border-[#d1d5db] rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[#f3f4f6] transition-colors"
          >
            <svg className="w-10 h-10 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span className="mt-2 text-sm font-medium text-[#6b7280]">
              Haz clic para seleccionar archivos PDF
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Selecciona múltiples archivos PDF para unir
            </span>
          </button>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            multiple
            className="hidden"
            ref={fileInputRef}
          />

          {pdfFiles.length > 0 && (
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Archivos seleccionados ({pdfFiles.length}):
                </h4>
                <div className="border border-[#e5e7eb] rounded-lg divide-y divide-[#e5e7eb] max-h-64 overflow-y-auto">
                  {pdfFiles.map((file, index) => (
                    <div 
                      key={`${file.name}-${index}`}
                      className={`flex items-center justify-between px-4 py-3 cursor-move
                        ${draggedIndex === index ? 'opacity-50' : ''}
                        ${dropTargetIndex === index ? 'border-2 border-blue-400 bg-blue-50' : ''}
                        hover:bg-gray-50 transition-colors`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="flex items-center">
                        <div className="text-center mr-2 w-6">
                          <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                        </div>
                        <div className="shrink-0 mr-3 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <svg className="w-5 h-5 mr-3 text-red-600 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <path d="M9 15h6"></path>
                          <path d="M9 11h6"></path>
                        </svg>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#111827] truncate max-w-xs">
                            {file.name}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => moveFileUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded-sm bg-slate-700 hover:bg-slate-600 ${index === 0 ? 'opacity-50' : ''}`}
                          title="Mover arriba"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => moveFileDown(index)}
                          disabled={index === pdfFiles.length - 1}
                          className={`p-1 rounded-sm bg-slate-700 hover:bg-slate-600 ${index === pdfFiles.length - 1 ? 'opacity-50' : ''}`}
                          title="Mover abajo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 rounded-sm bg-red-600 hover:bg-red-700"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {pdfFiles.length >= 2 && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-xs">
                    Consejo: Arrastra y suelta los archivos para reordenarlos, o usa las flechas para moverlos arriba/abajo. Los PDFs se unirán en el orden mostrado.
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  onClick={serverReady ? mergePdfs : mergePdfsClientSide}
                  disabled={isProcessing || pdfFiles.length < 2}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || pdfFiles.length < 2 ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : 'Unir PDFs'}
                </button>
                
                {pdfFiles.length > 0 && pdfFiles.length < 2 && (
                  <p className="text-xs text-[#ef4444] mt-2">
                    Se necesitan al menos 2 archivos PDF para unir.
                  </p>
                )}
                
                {!serverReady && pdfFiles.length >= 2 && (
                  <p className="text-xs text-[#6b7280] mt-2 text-center">
                    La fusión se realizará localmente en el navegador. Los archivos muy grandes pueden tardar más en procesarse.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la unión de PDFs?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La unión de archivos PDF es un proceso que permite combinar múltiples documentos PDF en uno solo.
            El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Carga de documentos:</span> Todos los archivos PDF seleccionados se cargan 
              en memoria para su procesamiento.
            </li>
            <li>
              <span className="font-medium">Ordenamiento:</span> Puedes reorganizar el orden de los archivos arrastrándolos 
              y soltándolos en la posición deseada, o usando los botones de flecha según tus necesidades.
            </li>
            <li>
              <span className="font-medium">Extracción de páginas:</span> Se analizan todos los documentos y se extraen 
              sus páginas manteniendo sus propiedades originales.
            </li>
            <li>
              <span className="font-medium">Combinación secuencial:</span> Las páginas de cada documento se añaden 
              al nuevo PDF, respetando el orden que has establecido para los archivos.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PdfMerge; 
