import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import { FaFileAlt, FaHome, FaChevronRight, FaImage, FaDownload, FaCog, FaEye } from 'react-icons/fa';
import config from '../config';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Declaramos el tipo PdfThumbnail para las miniaturas
interface PdfThumbnail {
  pageNumber: number;
  dataUrl: string;
}

const PdfToJpg: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState<string>('all');
  const [customRange, setCustomRange] = useState<string>('');
  const [imageQuality, setImageQuality] = useState<string>('medium');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PdfThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cargar PDF y generar miniaturas cuando se selecciona un archivo
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
      
      // Actualizar el campo de rangos personalizado
      setCustomRange(ranges.join(','));
      
      // Si hay páginas seleccionadas, cambiamos a modo personalizado
      if (selectedPages.length !== numPages) {
        setPageRange('custom');
      } else {
        setPageRange('all');
      }
    } else {
      setCustomRange('');
      setPageRange('all');
    }
  }, [selectedPages, numPages]);

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
      
      // Por defecto, seleccionar todas las páginas
      setSelectedPages(Array.from({length: pageCount}, (_, i) => i + 1));
      
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

  // Handlers para drag & drop
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      handleFileValidation(selectedFile);
    }
  };

  // Función para manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      handleFileValidation(file);
    }
  };

  const handleFileValidation = (file: File) => {
    // Resetear estados
    setError(null);
    setSuccess(null);
    setSelectedPages([]);
    setThumbnails([]);
    setNumPages(0);

    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      setSelectedFile(null);
      return;
    }

    // Validar tamaño (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo no puede superar los 50MB');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Función para manejar la selección de páginas
  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages(prev => {
      if (prev.includes(pageNumber)) {
        // Si la página está seleccionada, la quitamos
        return prev.filter(p => p !== pageNumber);
      } else {
        // Si no está seleccionada, la añadimos y ordenamos el array
        const newSelection = [...prev, pageNumber].sort((a, b) => a - b);
        return newSelection;
      }
    });
  };

  // Función para manejar cambios manuales en el campo de rangos
  const handleRangeInput = (value: string) => {
    setCustomRange(value);
    
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

  // Función para seleccionar todas las páginas
  const selectAllPages = () => {
    setSelectedPages(Array.from({length: numPages}, (_, i) => i + 1));
    setPageRange('all');
  };

  // Función para deseleccionar todas las páginas
  const deselectAllPages = () => {
    setSelectedPages([]);
    setCustomRange('');
    setPageRange('custom');
  };

  // Función para convertir PDF a JPG usando el backend
  const convertPdfToJpg = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para convertir');
      return;
    }

    if (selectedPages.length === 0) {
      setError('Por favor, seleccione al menos una página para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('imageQuality', imageQuality);
      
      // Si el rango es personalizado o no son todas las páginas, añadir el valor
      if (pageRange === 'custom' || selectedPages.length !== numPages) {
        formData.append('pageRange', customRange);
      } else {
        formData.append('pageRange', 'all');
      }
      
      // Realizar la solicitud al servidor
      const response = await fetch(`${config.apiUrl}/pdf-to-jpg`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el PDF');
      }
      
      // Obtener el blob del ZIP con las imágenes
      const blob = await response.blob();
      
      // Generar un nombre de archivo para la descarga
      const filename = `${selectedFile.name.replace('.pdf', '')}_images.zip`;
      
      // Descargar el archivo ZIP
      saveAs(blob, filename);
      
      setSuccess('PDF convertido a JPG correctamente');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Error al convertir PDF a JPG:', err);
      setError(err.message || 'Ocurrió un error al convertir el PDF a JPG');
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">PDF a JPG</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Convierte páginas de documentos PDF a imágenes JPG de alta calidad. Ideal para extraer imágenes o crear versiones visuales de tus documentos.
        </p>
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
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Seleccionar archivo PDF para convertir a JPG
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            } ${error ? 'border-destructive' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept="application/pdf"
            />

            {!selectedFile ? (
              <>
                <div className="text-muted-foreground mb-4">
                  <svg className="mx-auto h-16 w-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-foreground mb-2">
                    <span className="font-medium">Haz clic para seleccionar</span> o arrastra y suelta tu archivo PDF
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF (máximo 50MB)
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <div className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-foreground text-sm font-medium truncate max-w-[250px]">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setThumbnails([]);
                      setSelectedPages([]);
                      setNumPages(0);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-destructive hover:text-destructive/80 transition-colors p-1"
                    title="Eliminar archivo"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Content when file is selected */}
          {selectedFile && (
            <div className="space-y-6">
              {isLoading ? (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Cargando miniaturas del PDF...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Page Selection */}
                  {thumbnails.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium text-foreground">
                          Selecciona las páginas a convertir:
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllPages}
                            className="text-xs py-1 px-2 bg-muted hover:bg-muted/80 rounded-md text-foreground transition-colors"
                          >
                            Seleccionar todas
                          </button>
                          <button
                            onClick={deselectAllPages}
                            className="text-xs py-1 px-2 bg-muted hover:bg-muted/80 rounded-md text-foreground transition-colors"
                          >
                            Deseleccionar todas
                          </button>
                        </div>
                      </div>

                      <div className="border border-border rounded-lg p-4 bg-muted/30">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                          {thumbnails.map((thumb) => (
                            <div
                              key={`page_${thumb.pageNumber}`}
                              onClick={() => togglePageSelection(thumb.pageNumber)}
                              className={`relative cursor-pointer rounded-md overflow-hidden transition-all ${
                                selectedPages.includes(thumb.pageNumber)
                                  ? 'ring-2 ring-primary ring-offset-1'
                                  : 'hover:opacity-80 border border-border'
                              }`}
                            >
                              <img
                                src={thumb.dataUrl}
                                alt={`Página ${thumb.pageNumber}`}
                                className="w-full h-auto object-contain bg-white"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs py-1 text-center">
                                Página {thumb.pageNumber}
                              </div>
                              {selectedPages.includes(thumb.pageNumber) && (
                                <div className="absolute top-2 right-2 bg-primary rounded-full p-1 w-5 h-5 flex items-center justify-center text-primary-foreground">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Haz clic en las páginas para seleccionarlas. Solo se convertirán las páginas seleccionadas.
                      </p>
                    </div>
                  )}

                  {/* Configuration Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="page-ranges" className="block text-sm font-medium text-foreground">
                        Rangos de páginas:
                      </label>
                      <input
                        id="page-ranges"
                        type="text"
                        value={customRange}
                        onChange={(e) => handleRangeInput(e.target.value)}
                        placeholder="Ejemplo: 1-3,5,7-9"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Introduce los rangos de páginas separados por comas. Por ejemplo: 1-3,5,7-9
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="image-quality" className="block text-sm font-medium text-foreground">
                        Calidad de imagen:
                      </label>
                      <select
                        id="image-quality"
                        value={imageQuality}
                        onChange={(e) => setImageQuality(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="low">Baja (menor tamaño)</option>
                        <option value="medium">Media (recomendado)</option>
                        <option value="high">Alta (mejor calidad)</option>
                      </select>
                    </div>
                  </div>

                  {/* Convert Button */}
                  <div className="space-y-4">
                    {isProcessing ? (
                      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="text-sm font-medium text-foreground">Convirtiendo PDF a JPG...</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={convertPdfToJpg}
                        disabled={selectedPages.length === 0}
                        className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                          selectedPages.length === 0
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Convertir a JPG
                      </button>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      Nota: Se generará un archivo ZIP con imágenes JPG (una por cada página seleccionada).
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
            ¿Cómo funciona la conversión de PDF a JPG?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La conversión de PDF a imágenes JPG es un proceso que permite extraer páginas de documentos PDF como archivos
            de imagen independientes. El proceso funciona así:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Análisis del PDF</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    El documento PDF se analiza para determinar el número de páginas y sus características.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Selección de páginas</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes elegir páginas específicas o convertir todo el documento según tus necesidades.
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
                  <h4 className="font-medium text-foreground text-sm">Renderizado a imagen</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada página seleccionada se renderiza como una imagen JPG con la calidad especificada.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Empaquetado final</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Las imágenes se comprimen en un archivo ZIP para facilitar la descarga.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800 text-sm">Nota importante</h4>
                <p className="text-sm text-red-700 mt-1">
                  La calidad de las imágenes resultantes depende de la resolución original del PDF. Para mejores resultados, usa la configuración de calidad "Alta".
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfToJpg; 
