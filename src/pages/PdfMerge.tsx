import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="flex flex-col max-w-7xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a herramientas
        </Link>
      </div>

      {/* Header Section */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Unir PDFs</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Combina múltiples archivos PDF en un único documento. Simplemente selecciona los archivos y ordénalos según tus necesidades.
        </p>

        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">El servidor de conversión no está disponible. Se usará el procesamiento local.</span>
            </div>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Seleccionar archivos PDF para unir
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 border-border hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-2">
                <span className="font-medium">Haz clic para seleccionar</span> archivos PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona múltiples archivos PDF para unir
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            multiple
            className="hidden"
            ref={fileInputRef}
          />

          {pdfFiles.length > 0 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Archivos seleccionados ({pdfFiles.length}):
                </h4>
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto bg-background">
                  {pdfFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className={`flex items-center justify-between px-4 py-3 cursor-move
                        ${draggedIndex === index ? 'opacity-50' : ''}
                        ${dropTargetIndex === index ? 'border-2 border-primary bg-primary/5' : ''}
                        hover:bg-muted/50 transition-colors`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="flex items-center">
                        <div className="text-center mr-2 w-6">
                          <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                        </div>
                        <div className="shrink-0 mr-3 text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <svg className="w-5 h-5 mr-3 text-destructive shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <path d="M9 15h6"></path>
                          <path d="M9 11h6"></path>
                        </svg>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate max-w-xs">
                            {file.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => moveFileUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Mover arriba"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => moveFileDown(index)}
                          disabled={index === pdfFiles.length - 1}
                          className={`p-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors ${index === pdfFiles.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Mover abajo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 rounded-md bg-destructive hover:bg-destructive/80 transition-colors text-destructive-foreground"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {pdfFiles.length >= 2 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-blue-700">
                        <strong>Consejo:</strong> Arrastra y suelta los archivos para reordenarlos, o usa las flechas para moverlos arriba/abajo. Los PDFs se unirán en el orden mostrado.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Process Button */}
              <div className="space-y-4">
                <button
                  onClick={serverReady ? mergePdfs : mergePdfsClientSide}
                  disabled={isProcessing || pdfFiles.length < 2}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    isProcessing || pdfFiles.length < 2
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Unir PDFs
                    </>
                  )}
                </button>

                {pdfFiles.length > 0 && pdfFiles.length < 2 && (
                  <p className="text-xs text-destructive text-center">
                    Se necesitan al menos 2 archivos PDF para unir.
                  </p>
                )}

                {!serverReady && pdfFiles.length >= 2 && (
                  <p className="text-xs text-muted-foreground text-center">
                    La fusión se realizará localmente en el navegador. Los archivos muy grandes pueden tardar más en procesarse.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Information Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Cómo funciona la unión de PDFs?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La unión de archivos PDF es un proceso que permite combinar múltiples documentos PDF en uno solo.
            El proceso funciona así:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Carga de documentos</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos los archivos PDF seleccionados se cargan en memoria para su procesamiento.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Ordenamiento</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes reorganizar el orden arrastrando archivos o usando los botones de flecha.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Extracción de páginas</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se analizan todos los documentos y se extraen sus páginas manteniendo propiedades originales.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Combinación secuencial</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Las páginas se añaden al nuevo PDF respetando el orden establecido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfMerge; 
