import React, { useState, useRef } from 'react';
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
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">JPG a PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte imágenes JPG a documentos PDF. Combina múltiples imágenes en un solo archivo PDF con calidad profesional.
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
          <h3 className="font-medium text-[#101418]">Seleccionar imágenes para convertir a PDF</h3>
        </div>
        <div className="p-6 flex flex-col space-y-4">
          <div
            ref={dropAreaRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full border border-dashed rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragActive 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-[#f9fafb] border-[#d1d5db] hover:bg-[#f3f4f6]'
            }`}
          >
            <svg className="w-10 h-10 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span className="mt-2 text-sm font-medium text-[#6b7280]">
              {dragActive 
                ? 'Suelta las imágenes aquí' 
                : 'Haz clic para seleccionar imágenes o arrastra y suelta'}
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Acepta múltiples imágenes JPG, JPEG y PNG
            </span>
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
            <div className="space-y-4 mt-4">
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-[#374151]">
                  Imágenes seleccionadas ({images.length}):
                </h4>
                  <div className="text-xs text-blue-600">
                    Usa los controles para reordenar
                  </div>
                </div>
                <div className="border border-[#e5e7eb] rounded-lg p-2 max-h-64 overflow-y-auto">
                  {images.map((img, index) => (
                    <div key={img.id} className="flex items-center justify-between p-2 border-b last:border-b-0 border-[#e5e7eb]">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={img.url} 
                          alt={img.file.name}
                          className="h-16 w-16 object-cover rounded-sm"
                        />
                        <div className="text-sm truncate max-w-xs">
                          <div className="font-medium text-[#111827]">{img.file.name}</div>
                          <div className="text-xs text-[#6b7280]">
                            {(img.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded-sm bg-slate-700 hover:bg-slate-600 ${index === 0 ? 'opacity-50' : ''}`}
                          title="Mover arriba"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleMoveDown(index)}
                          disabled={index === images.length - 1}
                          className={`p-1 rounded-sm bg-slate-700 hover:bg-slate-600 ${index === images.length - 1 ? 'opacity-50' : ''}`}
                          title="Mover abajo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleRemoveImage(index)}
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
              </div>

              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="document-title" className="block text-sm font-medium text-[#374151] mb-1">
                    Título del documento:
                  </label>
                  <input
                    id="document-title"
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-hidden focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="page-size" className="block text-sm font-medium text-[#374151] mb-1">
                    Tamaño de página:
                  </label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-hidden focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="letter">Carta (8.5 x 11 pulgadas)</option>
                    <option value="legal">Legal (8.5 x 14 pulgadas)</option>
                    <option value="fit">Ajustar a la imagen</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={convertJpgToPdf}
                  disabled={isProcessing || images.length === 0}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || images.length === 0 ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : 'Convertir a PDF'}
                </button>
                <p className="text-xs text-[#6b7280] mt-2 text-center">
                  Nota: Puedes reordenar las imágenes para cambiar su orden en el PDF final.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la conversión de JPG a PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La conversión de imágenes JPG a formato PDF permite combinar múltiples fotografías o imágenes
            en un solo documento profesional fácil de compartir. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis de imágenes:</span> Se analizan las propiedades de cada imagen JPG,
              incluyendo dimensiones, resolución y metadatos para determinar la mejor forma de incluirlas en el PDF.
            </li>
            <li>
              <span className="font-medium">Ajuste y optimización:</span> Las imágenes se redimensionan y optimizan
              según el tamaño de página seleccionado, manteniendo la mejor relación entre calidad y tamaño.
            </li>
            <li>
              <span className="font-medium">Creación de páginas:</span> Se crea una página de PDF para cada imagen,
              respetando el orden seleccionado por el usuario y aplicando los márgenes adecuados.
            </li>
            <li>
              <span className="font-medium">Generación del documento final:</span> Se combinan todas las páginas en un
              único documento PDF, añadiendo metadatos como el título y optimizando el archivo para su distribución digital.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default JpgToPdf; 
