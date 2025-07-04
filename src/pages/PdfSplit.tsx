import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// PDF.js para renderización pero sin usar react-pdf
import * as pdfjsLib from 'pdfjs-dist';

// Configuración del worker ahora está centralizada en main.tsx

// Declaramos el tipo PdfThumbnail para las miniaturas
interface PdfThumbnail {
  pageNumber: number;
  dataUrl: string;
}

const PdfSplit: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageRanges, setPageRanges] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PdfThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
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

  // Cargar PDF y generar miniaturas
  useEffect(() => {
    if (selectedFile) {
      generatePdfThumbnails(selectedFile);
    }
  }, [selectedFile]);

  // Efecto para actualizar el campo de rangos cuando cambian las páginas seleccionadas
  useEffect(() => {
    if (selectedPages.length > 0) {
      // Convertir array de páginas seleccionadas a formato de rangos
      const ranges: string[] = [];
      let rangeStart = selectedPages[0];
      let rangeEnd = selectedPages[0];

      for (let i = 1; i < selectedPages.length; i++) {
        const currentPage = selectedPages[i];
        const prevPage = selectedPages[i - 1];
        
        // Si las páginas son consecutivas, extender el rango actual
        if (currentPage === prevPage + 1) {
          rangeEnd = currentPage;
        } else {
          // Si no son consecutivas, cerrar el rango actual e iniciar uno nuevo
          ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
          rangeStart = currentPage;
          rangeEnd = currentPage;
        }
      }
      
      // Añadir el último rango
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      
      // Actualizar el campo de rangos
      setPageRanges(ranges.join(','));
    } else {
      setPageRanges('');
    }
  }, [selectedPages]);

  // Función para generar miniaturas del PDF
  const generatePdfThumbnails = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      setThumbnails([]);

      // 1. Obtener los datos del archivo
      const fileArrayBuffer = await file.arrayBuffer();

      // 2. Cargar el PDF con pdf-lib para obtener información
      const pdfDoc = await PDFDocument.load(fileArrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      setNumPages(pageCount);

      // Comentamos esta línea porque ya está configurada en index.html
      // pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

      // 3. Cargar el PDF con PDF.js para renderizar
      const pdfJsDoc = await pdfjsLib.getDocument({data: fileArrayBuffer}).promise;
      
      // Crear array de promesas para generar todas las miniaturas
      const thumbnailPromises: Promise<PdfThumbnail>[] = [];
      
      // Para cada página, generar una miniatura
      for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
        thumbnailPromises.push(generateThumbnail(pdfJsDoc, pageNum));
      }
      
      // Esperar a que todas las miniaturas estén generadas
      const generatedThumbnails = await Promise.all(thumbnailPromises);
      
      setThumbnails(generatedThumbnails);
      setIsLoading(false);
    } catch (err) {
      console.error("Error al generar miniaturas del PDF:", err);
      setError(`Error al procesar el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsLoading(false);
    }
  };

  // Función para generar una miniatura de una página específica
  const generateThumbnail = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<PdfThumbnail> => {
    // Obtener la página
    const page = await pdfDoc.getPage(pageNum);
    
    // Escala para la miniatura (pequeña)
    const scale = 0.5;
    const viewport = page.getViewport({scale});
    
    // Crear canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    if (context) {
      // Renderizar la página en el canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convertir el canvas a URL de datos
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      return {
        pageNumber: pageNum,
        dataUrl
      };
    }
    
    throw new Error('No se pudo obtener el contexto del canvas');
  };

  // Función para manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedFile(null);
        setNumPages(0);
        setSelectedPages([]);
        setThumbnails([]);
      } else {
        setSelectedFile(file);
        setError(null);
        setSelectedPages([]);
      }
    }
  };

  // Función para manejar la selección de páginas
  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages(prev => {
      if (prev.includes(pageNumber)) {
        return prev.filter(p => p !== pageNumber);
      } else {
        const newSelection = [...prev, pageNumber].sort((a, b) => a - b);
        return newSelection;
      }
    });
  };

  // Función para manejar cambios manuales en el campo de rangos
  const handleRangeInput = (value: string) => {
    setPageRanges(value);
    
    try {
      if (!value.trim()) {
        setSelectedPages([]);
        return;
      }
      
      const parsedPages: number[] = [];
      const rangeStrings = value.split(',');
      
      for (const rangeStr of rangeStrings) {
        const trimmed = rangeStr.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          
          if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && end <= numPages) {
            for (let i = start; i <= end; i++) {
              if (!parsedPages.includes(i)) {
                parsedPages.push(i);
              }
            }
          }
        } else {
          const page = parseInt(trimmed, 10);
          if (!isNaN(page) && page > 0 && page <= numPages && !parsedPages.includes(page)) {
            parsedPages.push(page);
          }
        }
      }
      
      parsedPages.sort((a, b) => a - b);
      setSelectedPages(parsedPages);
    } catch (e) {
      // Si hay algún error en el formato, no actualizamos las páginas seleccionadas
      console.error('Error al parsear el rango de páginas:', e);
    }
  };

  // Función para dividir PDF usando el servidor
  const splitPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para dividir');
      return;
    }

    if (!pageRanges.trim() || selectedPages.length === 0) {
      setError('Por favor, seleccione las páginas a extraer');
      return;
    }
    
    if (!serverReady) {
      // No establecemos error aquí, la interfaz ya muestra que el servidor no está disponible
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Preparar los datos para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Determinar el modo de división
      if (selectedPages.length === numPages) {
        // Si están seleccionadas todas las páginas, dividir cada página individualmente
        formData.append('mode', 'all');
      } else {
        // Si solo están seleccionadas algunas páginas, enviar los rangos
        formData.append('mode', 'range');
        
        // Convertir los rangos de páginas a un formato que el servidor pueda entender
        const rangesForServer = [];
        
        // Rangos como "1-3,5,7-9" se convierten a un array de objetos con start y end
        const rangeStrings = pageRanges.split(',');
        for (const rangeStr of rangeStrings) {
          const trimmed = rangeStr.trim();
          if (trimmed.includes('-')) {
            const [startStr, endStr] = trimmed.split('-');
            rangesForServer.push({
              start: parseInt(startStr, 10),
              end: parseInt(endStr, 10)
            });
          } else {
            const page = parseInt(trimmed, 10);
            rangesForServer.push({
              start: page,
              end: page
            });
          }
        }
        
        formData.append('ranges', JSON.stringify(rangesForServer));
      }
      
      // Enviar al servidor
      const response = await fetch(`${config.apiUrl}/split-pdf`, {
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
      
      // Descargar el archivo ZIP con los PDFs divididos
      const blob = await response.blob();
      const filename = `${selectedFile.name.split('.').slice(0, -1).join('.')}_dividido.zip`;
      saveAs(blob, filename);
      
      setSuccess('PDF dividido correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al dividir PDF:', err);
      setError(`Error al dividir el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dividir PDF</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Divide un archivo PDF en múltiples documentos seleccionando las páginas que necesitas.
          Puedes extraer secciones específicas o separar un documento grande en partes más pequeñas.
        </p>

        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">El servidor de conversión no está disponible. Por favor, inténtelo más tarde.</span>
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
            Seleccionar archivo PDF para dividir
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              !serverReady
                ? 'border-muted bg-muted/20 cursor-not-allowed opacity-60'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-2">
                <span className="font-medium">Haz clic para seleccionar</span> un archivo PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona un archivo PDF para dividirlo en múltiples documentos
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={!serverReady}
          />

          {selectedFile && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Archivo seleccionado:
                </h4>
                <div className="border border-border rounded-lg p-3 flex items-center bg-background">
                  <svg className="w-6 h-6 mr-3 text-destructive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h6"></path>
                    <path d="M9 11h6"></path>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <svg className="w-8 h-8 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="ml-3 text-sm text-foreground">Cargando miniaturas...</span>
                </div>
              ) : (
                <>
                  {thumbnails.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-foreground">
                        Selecciona las páginas a extraer:
                      </h4>
                      <div className="border border-border rounded-lg p-4 bg-muted/20">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2">
                          {thumbnails.map((thumb) => (
                            <div
                              key={`page_${thumb.pageNumber}`}
                              onClick={() => togglePageSelection(thumb.pageNumber)}
                              className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
                                selectedPages.includes(thumb.pageNumber)
                                  ? 'ring-2 ring-primary ring-offset-2 shadow-md'
                                  : 'hover:opacity-80 border border-border hover:border-primary/50 shadow-sm'
                              }`}
                            >
                              <img
                                src={thumb.dataUrl}
                                alt={`Página ${thumb.pageNumber}`}
                                className="w-full h-auto object-contain bg-background"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 text-center">
                                Página {thumb.pageNumber}
                              </div>
                              {selectedPages.includes(thumb.pageNumber) && (
                                <div className="absolute top-2 right-2 bg-primary rounded-full p-1 w-5 h-5 flex items-center justify-center text-primary-foreground shadow-sm">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm text-blue-700">
                            <strong>Consejo:</strong> Haz clic en las páginas para seleccionarlas. Las páginas seleccionadas se extraerán al dividir el PDF.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="page-ranges" className="block text-sm font-medium text-foreground">
                      Rangos de páginas:
                    </label>
                    <input
                      id="page-ranges"
                      type="text"
                      value={pageRanges}
                      onChange={(e) => handleRangeInput(e.target.value)}
                      placeholder="Ejemplo: 1-3,5,7-9"
                      className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                    />
                    <p className="text-xs text-muted-foreground">
                      Introduce los rangos de páginas separados por comas. Por ejemplo: 1-3,5,7-9
                    </p>
                  </div>

                  {/* Process Button */}
                  <div className="space-y-4">
                    <button
                      onClick={splitPdf}
                      disabled={isProcessing || !pageRanges.trim() || selectedPages.length === 0 || !serverReady}
                      className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        isProcessing || !pageRanges.trim() || selectedPages.length === 0 || !serverReady
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
                          Dividir PDF
                        </>
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground text-center">
                      Recibirás un archivo ZIP con los PDFs divididos según las páginas seleccionadas.
                    </p>
                  </div>
                </>
              )}
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
            ¿Cómo funciona la división de PDFs?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La división de archivos PDF es un proceso que permite extraer páginas específicas de un documento para
            crear nuevos archivos PDF independientes. El proceso funciona así:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Previsualización</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona un PDF para ver todas sus páginas en miniatura.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Selección visual</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Haz clic en las páginas que deseas extraer, o introduce los rangos manualmente.
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
                    El sistema procesa tu documento y crea nuevos archivos PDF con las páginas seleccionadas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Descarga automática</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Los archivos resultantes se descargan en un ZIP con un PDF por cada rango especificado.
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

export default PdfSplit; 
