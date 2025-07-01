import React, { useState, useRef, useEffect } from 'react';
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
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">PDF a JPG</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte páginas de documentos PDF a imágenes JPG de alta calidad. Ideal para extraer imágenes o crear versiones visuales de tus documentos.
        </p>
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para convertir a JPG</h3>
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
              Haz clic para seleccionar un archivo PDF
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Selecciona un archivo PDF para convertir sus páginas a imágenes JPG
            </span>
          </button>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />

          {selectedFile && (
            <div className="mt-4 space-y-4">
              <div className="pt-2">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Archivo seleccionado:
                </h4>
                <div className="border border-[#e5e7eb] rounded-lg p-3 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h6"></path>
                    <path d="M9 11h6"></path>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-[#111827]">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1d4ed8]"></div>
                  <span className="ml-3 text-sm text-[#374151]">Cargando miniaturas...</span>
                </div>
              ) : (
                <>
                  {thumbnails.length > 0 && (
                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-[#374151]">
                          Selecciona las páginas a convertir:
                        </h4>
                        <div className="flex space-x-2">
                          <button 
                            onClick={selectAllPages}
                            className="text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                          >
                            Seleccionar todas
                          </button>
                          <button 
                            onClick={deselectAllPages}
                            className="text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                          >
                            Deseleccionar todas
                          </button>
                        </div>
                      </div>
                      
                      <div className="border border-[#e5e7eb] rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2">
                          {thumbnails.map((thumb) => (
                            <div 
                              key={`page_${thumb.pageNumber}`}
                              onClick={() => togglePageSelection(thumb.pageNumber)}
                              className={`relative cursor-pointer rounded-md overflow-hidden transition-all ${
                                selectedPages.includes(thumb.pageNumber) 
                                  ? 'ring-2 ring-[#1d4ed8] ring-offset-1' 
                                  : 'hover:opacity-80 border border-gray-200'
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
                                <div className="absolute top-2 right-2 bg-[#1d4ed8] rounded-full p-1 w-5 h-5 flex items-center justify-center text-white">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        Haz clic en las páginas para seleccionarlas. Solo se convertirán las páginas seleccionadas.
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    <label htmlFor="page-ranges" className="block text-sm font-medium text-[#374151] mb-2">
                      Rangos de páginas:
                  </label>
                      <input
                      id="page-ranges"
                        type="text"
                      value={customRange}
                      onChange={(e) => handleRangeInput(e.target.value)}
                      placeholder="Ejemplo: 1-3,5,7-9"
                        className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-[#6b7280]">
                        Introduce los rangos de páginas separados por comas. Por ejemplo: 1-3,5,7-9
                      </p>
                </div>

                <div>
                  <label htmlFor="image-quality" className="block text-sm font-medium text-[#374151] mb-1">
                    Calidad de imagen:
                  </label>
                  <select
                    id="image-quality"
                    value={imageQuality}
                    onChange={(e) => setImageQuality(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Baja (menor tamaño)</option>
                    <option value="medium">Media (recomendado)</option>
                    <option value="high">Alta (mejor calidad)</option>
                  </select>
                </div>

                <button
                  onClick={convertPdfToJpg}
                    disabled={isProcessing || selectedPages.length === 0}
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      isProcessing || selectedPages.length === 0
                        ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' 
                        : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'
                    }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : 'Convertir a JPG'}
                </button>
                <p className="text-xs text-[#6b7280] mt-2 text-center">
                    Nota: Se generará un archivo ZIP con imágenes JPG (una por cada página seleccionada).
                </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la conversión de PDF a JPG?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La conversión de documentos PDF a imágenes JPG es un proceso que permite transformar cada página
            de un PDF en una imagen independiente. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Renderización de páginas:</span> Cada página del PDF se renderiza 
              como un gráfico de alta calidad, preservando todos los elementos visuales del documento.
            </li>
            <li>
              <span className="font-medium">Ajuste de resolución:</span> Se aplica la resolución seleccionada
              (relacionada con la calidad de imagen) para determinar la densidad de píxeles de la imagen resultante.
            </li>
            <li>
              <span className="font-medium">Conversión a formato JPG:</span> La imagen renderizada se convierte
              al formato JPG, aplicando el nivel de compresión correspondiente a la calidad seleccionada.
            </li>
            <li>
              <span className="font-medium">Generación de archivos:</span> Se genera un archivo JPG separado para
              cada página del PDF original, permitiendo usar estas imágenes en aplicaciones, sitios web o redes sociales.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PdfToJpg; 