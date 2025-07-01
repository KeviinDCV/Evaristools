import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';

interface ImageItem {
  file: File;
  url: string;
}

const ImagesToPdf: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para manejar la selección de imágenes
  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
      
      if (newFiles.length !== imageFiles.length) {
        setError('Solo se permiten archivos de imagen (JPEG, PNG, etc.)');
        return;
      }
      
      // Crear URLs para vista previa
      const newImageItems: ImageItem[] = [];
      
      imageFiles.forEach(file => {
        const imageUrl = URL.createObjectURL(file);
        newImageItems.push({
          file,
          url: imageUrl
        });
      });
      
      setImages(prev => [...prev, ...newImageItems]);
      setError(null);
    }
  };

  // Función para eliminar una imagen
  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      // Liberar objeto URL para evitar fugas de memoria
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Función para convertir imágenes a PDF
  const convertImagesToPdf = async () => {
    if (images.length === 0) {
      setError('Por favor, seleccione al menos una imagen para convertir a PDF');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Crear un nuevo documento PDF
      const pdfDoc = await PDFDocument.create();
      
      // Procesar cada imagen
      for (const imageItem of images) {
        const imageArrayBuffer = await imageItem.file.arrayBuffer();
        let embeddedImage;
        
        // Determinar el tipo de imagen y usar el método apropiado
        if (imageItem.file.type === 'image/jpeg' || imageItem.file.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageArrayBuffer);
        } else if (imageItem.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageArrayBuffer);
        } else {
          // Para otros tipos, saltamos
          continue;
        }
        
        // Obtener dimensiones de la imagen
        const imageDims = embeddedImage.scale(1);
        
        // Crear una página con dimensiones proporcionales a la imagen
        const page = pdfDoc.addPage([imageDims.width, imageDims.height]);
        
        // Determinar dimensiones para ajustar la imagen a la página
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        
        // Dibujar la imagen en la página
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
      
      // Guardar el documento PDF
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el archivo PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'imagenes_a_pdf.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Imágenes convertidas a PDF correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir imágenes a PDF:', err);
      setError('Ocurrió un error al convertir las imágenes a PDF');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Imágenes a PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte imágenes JPG, PNG y otros formatos a documentos PDF. Puedes seleccionar múltiples imágenes para crear un documento de varias páginas.
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full bg-[#f9fafb] border border-dashed border-[#d1d5db] rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[#f3f4f6] transition-colors"
          >
            <svg className="w-10 h-10 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span className="mt-2 text-sm font-medium text-[#6b7280]">
              Haz clic para seleccionar imágenes
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Soporta JPG, PNG, GIF y otros formatos de imagen (hasta 10MB)
            </span>
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleImagesChange}
            multiple
            className="hidden"
            ref={fileInputRef}
          />

          {images.length > 0 && (
            <div className="space-y-4 mt-4">
              <div className="pt-2">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Imágenes seleccionadas ({images.length}):
                </h4>
                <div className="border border-[#e5e7eb] rounded-lg p-2 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {images.map((img, index) => (
                      <div key={`${img.file.name}-${index}`} className="relative rounded-lg overflow-hidden border border-[#e5e7eb] p-1">
                        <img 
                          src={img.url} 
                          alt={img.file.name}
                          className="h-24 w-full object-contain"
                        />
                        <button 
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-black bg-opacity-40 hover:bg-red-500 hover:bg-opacity-60 rounded-full p-1 text-white transition-colors"
                          aria-label="Eliminar imagen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                          </svg>
                        </button>
                        <div className="text-xs text-center mt-1 truncate px-1">
                          {img.file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={convertImagesToPdf}
                  disabled={isProcessing}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
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
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la conversión de Imágenes a PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La conversión de imágenes a formato PDF es un proceso que permite transformar archivos gráficos en documentos
            PDF manteniendo la calidad visual. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis de imágenes:</span> Cada imagen seleccionada se analiza para determinar 
              sus dimensiones, resolución y formato (JPG, PNG, etc.).
            </li>
            <li>
              <span className="font-medium">Creación de documento PDF:</span> Se crea un nuevo documento PDF vacío que servirá 
              como contenedor para todas las imágenes.
            </li>
            <li>
              <span className="font-medium">Incorporación de imágenes:</span> Para cada imagen, se crea una nueva página en el 
              documento con dimensiones proporcionales a la imagen original.
            </li>
            <li>
              <span className="font-medium">Optimización del documento:</span> Las imágenes se insertan manteniendo su calidad 
              original, ajustándolas a las dimensiones de la página para una visualización óptima.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ImagesToPdf; 