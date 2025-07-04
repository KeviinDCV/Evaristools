import React, { useState, useRef } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const SortPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pages, setPages] = useState<{index: number, selected: boolean}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para manejar la selección de archivo
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedFile(null);
        setPages([]);
        setThumbnails([]);
      } else {
        setSelectedFile(file);
        setError(null);
        setIsLoading(true);
        
        try {
          // Primero, intentar obtener miniaturas
          const formData = new FormData();
          formData.append('file', file);
          
          // Solicitar miniaturas
          const thumbnailResponse = await fetch(`${config.apiUrl}/get-pdf-thumbnails`, {
            method: 'POST',
            body: formData
          });
          
          if (thumbnailResponse.ok) {
            const thumbnailData = await thumbnailResponse.json();
            const pageCount = thumbnailData.page_count || 1;
            
            // Guardar miniaturas
            setThumbnails(thumbnailData.thumbnails.map((t: any) => t.thumbnail));
            
            // Crear array de páginas
            const newPages: {index: number, selected: boolean}[] = [];
            for (let i = 0; i < pageCount; i++) {
              newPages.push({ index: i + 1, selected: false });
            }
            setPages(newPages);
          } else {
            // Si no podemos obtener miniaturas, intentar al menos obtener info básica
            const response = await fetch(`${config.apiUrl}/get-pdf-info`, {
              method: 'POST',
              body: formData
            });
            
            if (!response.ok) {
              throw new Error('Error al procesar el archivo PDF');
            }
            
            // Obtener la información del PDF, incluyendo el número de páginas
            const pdfInfo = await response.json();
            const pageCount = pdfInfo.pageCount || 1;
            
            // Crear array de páginas sin miniaturas
            const newPages: {index: number, selected: boolean}[] = [];
            for (let i = 0; i < pageCount; i++) {
              newPages.push({ index: i + 1, selected: false });
            }
            setPages(newPages);
          }
        } catch (err) {
          console.error('Error al procesar el PDF:', err);
          setError('Error al procesar el archivo PDF');
          
          // Fallback: Crear una estimación basada en el tamaño
          const pageCount = Math.max(1, Math.floor(file.size / 30000));
          const newPages: {index: number, selected: boolean}[] = [];
          for (let i = 0; i < pageCount; i++) {
            newPages.push({ index: i + 1, selected: false });
          }
          setPages(newPages);
        } finally {
          setIsLoading(false);
        }
      }
    }
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
    
    // Reordenar las páginas
    setPages(prev => {
      const newPages = [...prev];
      const draggedPage = newPages[draggedIndex];
      
      // Eliminar la página arrastrada de su posición original
      newPages.splice(draggedIndex, 1);
      
      // Insertar la página en la nueva posición
      newPages.splice(index, 0, draggedPage);
      
      return newPages;
    });
    
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Función para mover una página hacia arriba
  const movePageUp = (index: number) => {
    if (index <= 0) return; // No se puede mover más arriba del primer elemento
    
    setPages(prev => {
      const newPages = [...prev];
      [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]]; // Intercambiar posiciones
      return newPages;
    });
  };

  // Función para mover una página hacia abajo
  const movePageDown = (index: number) => {
    if (index >= pages.length - 1) return; // No se puede mover más abajo del último elemento
    
    setPages(prev => {
      const newPages = [...prev];
      [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]]; // Intercambiar posiciones
      return newPages;
    });
  };

  // Función para cambiar la selección de una página
  const togglePageSelection = (index: number) => {
    setPages(prev => {
      const newPages = [...prev];
      newPages[index].selected = !newPages[index].selected;
      return newPages;
    });
  };

  // Función para eliminar las páginas seleccionadas
  const deleteSelectedPages = () => {
    setPages(prev => prev.filter(page => !page.selected));
  };

  // Función para ordenar las páginas del PDF
  const sortPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para ordenar');
      return;
    }

    if (pages.length === 0) {
      setError('No hay páginas para ordenar');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear array con el nuevo orden de páginas (índices comenzando en 1)
      const pageOrder = pages.map(page => page.index);
      
      // Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('pageOrder', JSON.stringify(pageOrder));
      
      // Enviar datos al servidor
      const response = await fetch(`${config.apiUrl}/sort-pdf`, {
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
      
      // Obtener el PDF reordenado
      const blob = await response.blob();
      const filename = `reordenado_${selectedFile.name}`;
      
      // Descargar el archivo
      saveAs(blob, filename);
      
      setSuccess('PDF reordenado correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al reordenar el PDF:', err);
      setError((err as Error).message || 'Ocurrió un error al reordenar el PDF');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ordenar PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Reorganiza, elimina y reordena las páginas de tus documentos PDF. Arrastra y suelta las páginas para personalizar el orden según tus necesidades.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para ordenar</h3>
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
              Selecciona un archivo PDF para reordenar sus páginas
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
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1d4ed8]"></div>
                  <span className="ml-3 text-sm text-[#374151]">Cargando páginas...</span>
                </div>
              ) : pages.length > 0 && (
                <div className="pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-[#374151]">
                      Páginas del documento ({pages.length}):
                    </h4>
                    <button
                      onClick={deleteSelectedPages}
                      disabled={!pages.some(p => p.selected)}
                      className={`px-3 py-1 text-sm rounded-md ${pages.some(p => p.selected) ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      Eliminar seleccionadas
                    </button>
                  </div>
                  <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {pages.map((page, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between px-4 py-3 cursor-move border-b last:border-b-0
                            ${page.selected ? 'bg-blue-50' : ''}
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
                            <input
                              type="checkbox"
                              checked={page.selected}
                              onChange={() => togglePageSelection(index)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm mr-3"
                            />
                            <div className="text-center mr-2 w-6">
                              <span className="text-sm font-medium text-gray-500">{page.index}</span>
                            </div>
                            <div className="shrink-0 mr-3 text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                            {thumbnails && thumbnails[page.index - 1] && (
                              <div className="w-10 h-14 bg-gray-100 rounded-sm overflow-hidden mr-3">
                                <img 
                                  src={thumbnails[page.index - 1]} 
                                  alt={`Miniatura página ${page.index}`} 
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <span className="text-sm font-medium text-[#374151]">
                              Página {page.index}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => movePageUp(index)}
                              disabled={index === 0}
                              className={`p-1 rounded-sm bg-slate-700 hover:bg-slate-600 ${index === 0 ? 'opacity-50' : ''}`}
                              title="Mover arriba"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 15l-6-6-6 6"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => movePageDown(index)}
                              disabled={index === pages.length - 1}
                              className={`p-1 rounded-sm bg-slate-700 hover:bg-slate-600 ${index === pages.length - 1 ? 'opacity-50' : ''}`}
                              title="Mover abajo"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {pages.length >= 2 && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-xs">
                      Consejo: Arrastra y suelta las páginas para reordenarlas, o usa las flechas para moverlas arriba/abajo. También puedes seleccionar páginas para eliminarlas.
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={sortPdf}
                  disabled={isProcessing || pages.length === 0}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || pages.length === 0 ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : 'Aplicar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la reordenación de PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La reordenación de páginas en documentos PDF te permite personalizar la estructura 
            del documento reorganizando o eliminando páginas. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis del documento:</span> La herramienta analiza 
              el documento PDF y muestra todas sus páginas en el orden actual.
            </li>
            <li>
              <span className="font-medium">Reorganización:</span> Puedes arrastrar y soltar las páginas 
              para cambiar su orden en el documento final.
            </li>
            <li>
              <span className="font-medium">Selección y eliminación:</span> Puedes seleccionar páginas 
              específicas para eliminarlas del documento si no son necesarias.
            </li>
            <li>
              <span className="font-medium">Finalización:</span> Se genera un nuevo documento PDF con las páginas
              en el orden que has establecido, manteniendo la calidad original del contenido.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SortPdf; 
