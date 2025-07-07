import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ordenar PDF</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Reorganiza, elimina y reordena las páginas de tus documentos PDF. Arrastra y suelta las páginas para personalizar el orden según tus necesidades.
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Seleccionar archivo PDF para ordenar
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 border-border hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-2">
                <span className="font-medium">Haz clic para seleccionar</span> un archivo PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona un archivo PDF para reordenar sus páginas
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />

          {selectedFile && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Archivo seleccionado:
                </h4>
                <div className="border border-border rounded-lg p-3 flex items-center bg-background">
                  <svg className="w-6 h-6 mr-3 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {pages.length} páginas
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                  <span className="ml-3 text-sm text-foreground">Cargando páginas...</span>
                </div>
              ) : pages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Páginas del documento ({pages.length}):
                    </h4>
                    <button
                      onClick={deleteSelectedPages}
                      disabled={!pages.some(p => p.selected)}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        pages.some(p => p.selected)
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20'
                          : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar seleccionadas
                    </button>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Arrastra las páginas para reordenarlas, usa los checkboxes para seleccionar páginas a eliminar
                    </p>

                    <div className="border border-border rounded-lg overflow-hidden bg-background">
                      <div className="max-h-80 overflow-y-auto">
                        {pages.map((page, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between px-4 py-3 cursor-move border-b last:border-b-0 transition-all duration-200
                              ${page.selected ? 'bg-primary/10 border-primary/20' : 'bg-background'}
                              ${draggedIndex === index ? 'opacity-50' : ''}
                              ${dropTargetIndex === index ? 'border-2 border-primary bg-primary/5' : ''}
                              hover:bg-muted/50`}
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
                                className="h-4 w-4 text-primary focus:ring-primary border-input rounded mr-3"
                              />
                              <div className="text-center mr-3 w-8">
                                <span className="text-sm font-medium text-muted-foreground">{page.index}</span>
                              </div>
                              <div className="shrink-0 mr-3 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </div>
                              {thumbnails && thumbnails[page.index - 1] && (
                                <div className="w-10 h-14 bg-muted rounded-sm overflow-hidden mr-3 border border-border">
                                  <img
                                    src={thumbnails[page.index - 1]}
                                    alt={`Miniatura página ${page.index}`}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <span className="text-sm font-medium text-foreground">
                                Página {page.index}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => movePageUp(index)}
                                disabled={index === 0}
                                className={`p-2 rounded-lg transition-colors ${
                                  index === 0
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                                title="Mover arriba"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 15l-6-6-6 6"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => movePageDown(index)}
                                disabled={index === pages.length - 1}
                                className={`p-2 rounded-lg transition-colors ${
                                  index === pages.length - 1
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                                title="Mover abajo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 9l6 6 6-6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Process Button */}
              <div className="space-y-4">
                <button
                  onClick={sortPdf}
                  disabled={isProcessing || pages.length === 0}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    isProcessing || pages.length === 0
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Aplicar cambios
                    </>
                  )}
                </button>
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
            ¿Cómo funciona la reordenación de PDF?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La reordenación de páginas en documentos PDF te permite personalizar la estructura
            del documento reorganizando o eliminando páginas. El proceso funciona así:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Análisis del documento</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    La herramienta analiza el documento PDF y muestra todas sus páginas en el orden actual.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Reorganización</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arrastra y suelta las páginas para cambiar su orden en el documento final.
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
                  <h4 className="font-medium text-foreground text-sm">Selección y eliminación</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona páginas específicas para eliminarlas del documento si no son necesarias.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Finalización</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se genera un nuevo PDF con las páginas en el orden establecido, manteniendo la calidad original.
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
                <h4 className="font-medium text-red-800 text-sm mb-1">Importante sobre la reordenación</h4>
                <p className="text-sm text-red-700">
                  Los cambios en el orden y eliminación de páginas son permanentes en el nuevo documento.
                  Asegúrate de revisar el orden antes de aplicar los cambios.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortPdf; 
