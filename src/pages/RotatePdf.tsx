import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

// Declaramos el tipo PdfThumbnail para las miniaturas
interface PdfThumbnail {
  pageNumber: number;
  dataUrl: string;
  isRotated?: boolean;
}

const RotatePdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [rotateAllPages, setRotateAllPages] = useState<boolean>(true);
  const [pageRange, setPageRange] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PdfThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [serverReady, setServerReady] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar conexión al servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/system-info`);
        if (!response.ok) {
          setServerReady(false);
        }
      } catch (err) {
        console.error('Error al verificar el servidor:', err);
        setServerReady(false);
      }
    };
    
    checkServer();
  }, []);

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
      
      // Actualizar el campo de rangos
      setPageRange(ranges.join(','));
      setRotateAllPages(false);
    } else {
      setPageRange('');
      setRotateAllPages(true);
    }
  }, [selectedPages]);

  // Efecto para generar una vista previa cuando cambia el ángulo o las páginas seleccionadas
  useEffect(() => {
    if (selectedFile && previewMode && thumbnails.length > 0) {
      generateRotationPreview();
    }
  }, [rotationAngle, selectedPages, previewMode]);

  // Función para generar miniaturas del PDF
  const generatePdfThumbnails = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      setThumbnails([]);
      setSelectedPages([]);
      setPreviewMode(false);  // Resetear el modo vista previa

      // Usar el nuevo endpoint del servidor para generar miniaturas
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${config.apiUrl}/get-pdf-thumbnails`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Error al generar miniaturas';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseErr) {
          errorMessage = `Error en el servidor (código ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Convertir las miniaturas del servidor al formato que usamos
      const formattedThumbnails: PdfThumbnail[] = data.thumbnails.map((thumb: any) => ({
        pageNumber: thumb.page_num,
        dataUrl: thumb.thumbnail,
        isRotated: false
      }));

      setThumbnails(formattedThumbnails);
      setNumPages(data.page_count);
      setIsLoading(false);
    } catch (err) {
      console.error("Error al generar miniaturas del PDF:", err);
      setError(`Error al procesar el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsLoading(false);
    }
  };

  // Función para generar una vista previa de la rotación
  const generateRotationPreview = async () => {
    if (!selectedFile) return;
    
    try {
      setIsLoading(true);
      
      // Preparar los datos para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('rotationAngle', rotationAngle.toString());
      
      // Determinar qué páginas rotar
      // Ahora enviamos "all" como cadena en lugar de array vacío cuando queremos rotar todas
      if (rotateAllPages) {
        formData.append('pagesToRotate', "all");
        console.log("Páginas a rotar: Todas (usando indicador 'all')");
      } else {
        formData.append('pagesToRotate', JSON.stringify(selectedPages));
        console.log("Páginas a rotar:", selectedPages);
      }
      
      console.log("Enviando solicitud de vista previa con ángulo:", rotationAngle);
      console.log("Páginas a rotar:", rotateAllPages ? "Todas" : selectedPages);
      
      // Enviar al endpoint de vista previa
      const response = await fetch(`${config.apiUrl}/preview-rotated-pdf`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        let errorMessage = 'Error al generar vista previa';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseErr) {
          errorMessage = `Error en el servidor (código ${response.status})`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("Respuesta del servidor para vista previa:", data);
      
      // Verificar si tenemos información extra de rotación en la respuesta
      if (data.rotated_pages_count !== undefined) {
        console.log(`El servidor indica que rotó ${data.rotated_pages_count} páginas de ${data.page_count}`);
      }
      
      // Verificar que las miniaturas contengan información de rotación
      if (data.thumbnails && data.thumbnails.length > 0) {
        // Verificar si hay miniaturas marcadas como rotadas
        const hasRotatedPages = data.thumbnails.some((thumb: any) => thumb.is_rotated);
        console.log("¿Hay páginas rotadas en la respuesta?", hasRotatedPages);
        
        if (!hasRotatedPages && (rotateAllPages || selectedPages.length > 0)) {
          console.warn("No se detectaron páginas rotadas en la respuesta aunque se solicitó rotación");
          // En este caso, forzaremos la rotación en el cliente para mayor consistencia visual
        }
      }
      
      // Actualizar las miniaturas con la vista previa rotada
      const previewThumbnails: PdfThumbnail[] = data.thumbnails.map((thumb: any) => {
        // Determinar si la página debe estar rotada basado en la selección del usuario
        const shouldBeRotated = rotateAllPages || selectedPages.includes(thumb.page_num);
        
        // Usar la indicación del servidor O la selección del usuario
        // Esto garantiza que siempre se muestre como rotada si se solicitó
        const isRotated = thumb.is_rotated || shouldBeRotated;
        
        return {
          pageNumber: thumb.page_num,
          dataUrl: thumb.thumbnail,
          isRotated: isRotated
        };
      });
      
      console.log("Miniaturas procesadas para vista previa:", 
        previewThumbnails.map(t => ({ 
          page: t.pageNumber, 
          rotated: t.isRotated 
        }))
      );
      
      setThumbnails(previewThumbnails);
      setIsLoading(false);
    } catch (err) {
      console.error("Error al generar vista previa de rotación:", err);
      setError(`Error al generar vista previa: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsLoading(false);
    }
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
        setPreviewMode(false);
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
    setPageRange(value);
    
    try {
      if (!value.trim()) {
        setSelectedPages([]);
        setRotateAllPages(true);
        return;
      }
      
      setRotateAllPages(false);
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

  // Función para activar/desactivar la vista previa
  const togglePreviewMode = () => {
    if (!previewMode && selectedFile) {
      setPreviewMode(true);
      setSuccess(null);
      setError(null);
      generateRotationPreview();
    } else {
      setPreviewMode(false);
      // Volver a las miniaturas originales
      if (selectedFile) {
        generatePdfThumbnails(selectedFile);
      }
    }
  };

  // Función para rotar las páginas del PDF
  const rotatePdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para rotar');
      return;
    }

    if (!rotateAllPages && !pageRange.trim()) {
      setError('Por favor, especifique un rango de páginas para rotar');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('rotationAngle', rotationAngle.toString());
      formData.append('rotateAllPages', rotateAllPages.toString());
      
      console.log("Ejecutando rotación real con ángulo:", rotationAngle);
      console.log("Rotar todas las páginas:", rotateAllPages);
      
      if (!rotateAllPages) {
        formData.append('pageRange', pageRange);
        console.log("Rango de páginas:", pageRange);
      }
      
      // Enviar datos al servidor
      const response = await fetch(`${config.apiUrl}/rotate-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Si el servidor responde con un error, obtener el mensaje
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
      
      // Obtener el PDF rotado
      const blob = await response.blob();
      const filename = `rotado_${selectedFile.name}`;
      
      // Descargar el archivo
      saveAs(blob, filename);
      
      setSuccess('PDF rotado correctamente');
      setIsProcessing(false);
      
      // Desactivar el modo de vista previa después de la rotación
      setPreviewMode(false);
      
      // Recargar miniaturas para mostrar el estado original
      generatePdfThumbnails(selectedFile);
    } catch (err) {
      console.error('Error al rotar el PDF:', err);
      setError((err as Error).message || 'Ocurrió un error al rotar el PDF');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Rotar PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Rota las páginas de tus documentos PDF. Ajusta el ángulo de rotación y selecciona las páginas a rotar.
        </p>
        
        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            El servidor de conversión no está disponible. Por favor, inténtelo más tarde.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para rotar</h3>
        </div>
        <div className="p-6 flex flex-col space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!serverReady}
            className={`relative w-full bg-[#f9fafb] border border-dashed border-[#d1d5db] rounded-lg py-12 flex flex-col items-center justify-center ${!serverReady ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#f3f4f6] transition-colors'}`}
          >
            <svg className="w-10 h-10 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span className="mt-2 text-sm font-medium text-[#6b7280]">
              Haz clic para seleccionar un archivo PDF
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Selecciona un archivo PDF para rotar sus páginas
            </span>
          </button>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={!serverReady}
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

              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Ángulo de rotación:
                </h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="90"
                      checked={rotationAngle === 90}
                      onChange={() => {
                        setRotationAngle(90);
                        console.log("Ángulo cambiado a 90 grados");
                      }}
                    />
                    <span className="ml-2 text-sm text-[#374151]">90° (sentido horario)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="180"
                      checked={rotationAngle === 180}
                      onChange={() => {
                        setRotationAngle(180);
                        console.log("Ángulo cambiado a 180 grados");
                      }}
                    />
                    <span className="ml-2 text-sm text-[#374151]">180°</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="270"
                      checked={rotationAngle === 270}
                      onChange={() => {
                        setRotationAngle(270);
                        console.log("Ángulo cambiado a 270 grados");
                      }}
                    />
                    <span className="ml-2 text-sm text-[#374151]">270° (sentido antihorario)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Páginas a rotar:
                </h4>
                <div className="flex items-center mb-2">
                  <input
                    id="rotate-all"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={rotateAllPages}
                    onChange={(e) => {
                      setRotateAllPages(e.target.checked);
                      if (e.target.checked) {
                        setSelectedPages([]);
                        setPageRange('');
                      }
                    }}
                  />
                  <label htmlFor="rotate-all" className="ml-2 text-sm text-[#374151]">
                    Rotar todas las páginas
                  </label>
                </div>

                {!rotateAllPages && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => handleRangeInput(e.target.value)}
                      placeholder="Ej: 1-3,5,7-9"
                      className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-[#6b7280]">
                      Introduce los rangos de páginas separados por comas. Por ejemplo: 1-3,5,7-9
                    </p>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1d4ed8]"></div>
                  <span className="ml-3 text-sm text-[#374151]">
                    {previewMode ? 'Generando vista previa...' : 'Cargando miniaturas...'}
                  </span>
                </div>
              ) : (
                <>
                  {thumbnails.length > 0 && (
                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-[#374151]">
                          {previewMode ? 'Vista previa de rotación:' : 'Selecciona las páginas a rotar:'}
                        </h4>
                        <button
                          onClick={() => {
                            console.log("Botón de vista previa presionado, estado actual:", !previewMode);
                            togglePreviewMode();
                          }}
                          className="px-3 py-1 text-sm rounded-md bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors flex items-center"
                        >
                          {previewMode ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Desactivar vista previa
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver vista previa
                            </>
                          )}
                        </button>
                      </div>
                      
                      {previewMode && (
                        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 rounded-md mb-3 text-sm flex items-center">
                          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Vista previa con rotación de <strong>{rotationAngle}°</strong>. 
                            {rotateAllPages 
                              ? " Todas las páginas serán rotadas." 
                              : selectedPages.length > 0 
                                ? ` ${selectedPages.length} páginas seleccionadas serán rotadas.`
                                : " Ninguna página seleccionada para rotar."}
                          </span>
                        </div>
                      )}
                      
                      <div className="border border-[#e5e7eb] rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2">
                          {thumbnails.map((thumb) => (
                            <div 
                              key={`page_${thumb.pageNumber}`}
                              onClick={() => {
                                if (!previewMode) {
                                  console.log("Seleccionando/deseleccionando página:", thumb.pageNumber);
                                  togglePageSelection(thumb.pageNumber);
                                }
                              }}
                              className={`relative cursor-pointer rounded-md overflow-hidden transition-all ${
                                previewMode
                                  ? thumb.isRotated ? 'ring-2 ring-orange-500 ring-offset-2 shadow-md transform scale-105' : 'border border-gray-200'
                                  : selectedPages.includes(thumb.pageNumber) 
                                    ? 'ring-2 ring-[#1d4ed8] ring-offset-1' 
                                    : 'hover:opacity-80 border border-gray-200'
                              }`}
                            >
                              <img 
                                src={thumb.dataUrl} 
                                alt={`Página ${thumb.pageNumber}`}
                                className="w-full h-auto object-contain bg-white"
                              />
                              <div className={`absolute bottom-0 left-0 right-0 ${
                                previewMode && thumb.isRotated 
                                  ? 'bg-orange-600' 
                                  : previewMode 
                                    ? 'bg-gray-700' 
                                    : 'bg-black'
                              } bg-opacity-70 text-white text-xs py-1 text-center`}>
                                Página {thumb.pageNumber}
                                {previewMode && thumb.isRotated && ` (Rotada ${rotationAngle}°)`}
                              </div>
                              {!previewMode && selectedPages.includes(thumb.pageNumber) && (
                                <div className="absolute top-2 right-2 bg-[#1d4ed8] rounded-full p-1 w-5 h-5 flex items-center justify-center text-white">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {previewMode && thumb.isRotated && (
                                <div className="absolute top-2 right-2 bg-orange-500 rounded-full p-1 w-7 h-7 flex items-center justify-center text-white text-xs font-bold">
                                  {rotationAngle}°
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {previewMode 
                          ? 'Las páginas con borde naranja y el ángulo de rotación mostrado indican cómo se verán después de aplicar los cambios.' 
                          : 'Haz clic en las páginas para seleccionarlas. Las páginas seleccionadas se rotarán según el ángulo elegido.'}
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={rotatePdf}
                      disabled={isProcessing || !serverReady}
                      className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || !serverReady ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Procesando...
                        </div>
                      ) : 'Rotar PDF'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la rotación de PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La rotación de páginas en documentos PDF te permite ajustar la orientación de páginas
            individuales o de todo el documento. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Selección de ángulo:</span> Eliges el ángulo de rotación
              deseado para las páginas de tu documento.
            </li>
            <li>
              <span className="font-medium">Selección de páginas:</span> Decides si quieres rotar todo
              el documento o solo páginas específicas.
            </li>
            <li>
              <span className="font-medium">Vista previa:</span> Puedes ver cómo quedarán las páginas
              rotadas antes de aplicar los cambios definitivamente.
            </li>
            <li>
              <span className="font-medium">Aplicación de la rotación:</span> La herramienta procesa el documento
              y aplica la rotación a las páginas seleccionadas.
            </li>
            <li>
              <span className="font-medium">Finalización:</span> Se genera un nuevo documento PDF con las páginas
              rotadas según tus especificaciones, manteniendo la calidad original del documento.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RotatePdf; 