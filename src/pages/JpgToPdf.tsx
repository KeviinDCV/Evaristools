import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import { saveAs } from 'file-saver';

interface ImageItem {
  file: File;
  url: string;
  id: string;
}

const JpgToPdf: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [documentTitle, setDocumentTitle] = useState<string>('Documento PDF');
  const [pageSize, setPageSize] = useState<string>('a4');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Funciones para manejar el arrastrar y soltar
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Función para manejar la selección de imágenes
  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFiles(event.target.files);
    }
  };
  
  // Función para procesar los archivos seleccionados o arrastrados
  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files);
    const imageFiles = newFiles.filter(file => 
      file.type.startsWith('image/jpeg') || 
      file.type.startsWith('image/jpg') || 
      file.type.startsWith('image/png') // También permitimos PNG
    );
      
      if (newFiles.length !== imageFiles.length) {
      setError('Solo se permiten archivos de imagen (JPG, JPEG, PNG)');
        return;
      }
      
      // Crear URLs para vista previa
      const newImageItems: ImageItem[] = [];
      
      imageFiles.forEach(file => {
        const imageUrl = URL.createObjectURL(file);
        newImageItems.push({
          file,
        url: imageUrl,
        id: Math.random().toString(36).substring(2, 15) // ID único para cada elemento
        });
      });
      
      setImages(prev => [...prev, ...newImageItems]);
      setError(null);
  };

  // Función para eliminar una imagen
  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      // Liberar objeto URL para evitar fugas de memoria
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Función para mover una imagen arriba
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index - 1];
      newImages[index - 1] = temp;
      return newImages;
    });
  };

  // Función para mover una imagen abajo
  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index + 1];
      newImages[index + 1] = temp;
      return newImages;
    });
  };

  // Función para convertir JPG a PDF utilizando el backend
  const convertJpgToPdf = async () => {
    if (images.length === 0) {
      setError('Por favor, seleccione al menos una imagen para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      
      // Crear FormData para enviar al servidor
      const formData = new FormData();
      
      // Añadir cada imagen al FormData
      images.forEach((img) => {
        formData.append(`images`, img.file);
      });
      
      // Añadir otros parámetros
      formData.append('documentTitle', documentTitle);
      formData.append('pageSize', pageSize);
      
      console.log(`Enviando solicitud a http://localhost:5000/jpg-to-pdf`);
      console.log(`Imágenes: ${images.length}, Título: ${documentTitle}, Tamaño: ${pageSize}`);
      
      // Realizar la solicitud al servidor
      const response = await fetch(`${config.apiUrl}/jpg-to-pdf`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      console.log('Respuesta recibida:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = 'Error al procesar las imágenes';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Error al parsear la respuesta de error:', jsonError);
        }
        throw new Error(errorMessage);
      }
      
      // Obtener el blob del PDF
      const blob = await response.blob();
      console.log('PDF recibido, tamaño:', blob.size);
      
      // Generar un nombre de archivo para la descarga
      const filename = `${documentTitle.replace(/\s+/g, '_')}.pdf`;
      
      // Descargar el archivo PDF
      saveAs(blob, filename);
      
      setSuccess('Imágenes convertidas a PDF correctamente');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Error al convertir JPG a PDF:', err);
      setError(err.message || 'Ocurrió un error al convertir las imágenes a PDF');
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">JPG a PDF</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Convierte imágenes JPG a documentos PDF. Combina múltiples imágenes en un solo archivo PDF con calidad profesional.
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
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Seleccionar imágenes para convertir a PDF
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone with drag & drop */}
          <div
            ref={dropAreaRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-2">
                {dragActive
                  ? <span className="font-medium text-primary">Suelta las imágenes aquí</span>
                  : <><span className="font-medium">Haz clic para seleccionar</span> imágenes o arrastra y suelta</>
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Acepta múltiples imágenes JPG, JPEG y PNG (hasta 10MB cada una)
              </p>
            </div>
          </div>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
            onChange={handleImagesChange}
            multiple
            className="hidden"
            ref={fileInputRef}
          />

          {images.length > 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Imágenes seleccionadas ({images.length})
                  </h4>
                  <div className="text-xs text-primary">
                    Usa los controles para reordenar
                  </div>
                </div>
                <div className="border border-border rounded-lg p-4 max-h-64 overflow-y-auto bg-muted/20">
                  <div className="space-y-2">
                    {images.map((img, index) => (
                      <div key={img.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <img
                            src={img.url}
                            alt={img.file.name}
                            className="h-16 w-16 object-cover rounded-lg border border-border"
                          />
                          <div className="text-sm truncate max-w-xs">
                            <div className="font-medium text-foreground">{img.file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(img.file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className={`p-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Mover arriba"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 15l-6-6-6 6"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === images.length - 1}
                            className={`p-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors ${index === images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Mover abajo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9l6 6 6-6"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveImage(index)}
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
                </div>
              </div>

              {/* Configuration Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="document-title" className="block text-sm font-medium text-foreground">
                    Título del documento:
                  </label>
                  <input
                    id="document-title"
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                    placeholder="Mi documento JPG a PDF"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="page-size" className="block text-sm font-medium text-foreground">
                    Tamaño de página:
                  </label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="letter">Carta (8.5 x 11 pulgadas)</option>
                    <option value="legal">Legal (8.5 x 14 pulgadas)</option>
                    <option value="fit">Ajustar a la imagen</option>
                  </select>
                </div>
              </div>

              {/* Process Button */}
              <div className="space-y-4">
                <button
                  onClick={convertJpgToPdf}
                  disabled={isProcessing || images.length === 0}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    isProcessing || images.length === 0
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
                      Convertir a PDF
                    </>
                  )}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-blue-700">
                      <strong>Nota:</strong> Puedes reordenar las imágenes usando los controles para cambiar su orden en el PDF final.
                    </p>
                  </div>
                </div>
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
            ¿Cómo funciona la conversión de JPG a PDF?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La conversión de imágenes JPG a formato PDF permite combinar múltiples fotografías o imágenes
            en un solo documento profesional fácil de compartir. El proceso funciona así:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Análisis de imágenes</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se analizan las propiedades de cada imagen JPG, incluyendo dimensiones y resolución.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Ajuste y optimización</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Las imágenes se optimizan según el tamaño de página seleccionado.
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
                  <h4 className="font-medium text-foreground text-sm">Creación de páginas</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se crea una página de PDF para cada imagen respetando el orden seleccionado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Generación del documento final</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se combinan todas las páginas en un único documento PDF optimizado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-800 text-sm">Consejo para mejores resultados</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Para obtener la mejor calidad, usa imágenes JPG con buena resolución. Las imágenes se mantendrán en su calidad original en el PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JpgToPdf; 
