import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface ImageItem {
  file: File;
  url: string;
  text?: string;
}

// Interfaz para opciones de reconocimiento
interface ReconocimientoOptions {
  tessedit_pageseg_mode: string;
  tessjs_create_pdf: string;
  tessjs_create_hocr: string;
  tessjs_create_tsv: string;
  preserve_interword_spaces: string;
  tessedit_char_whitelist: string;
  tessedit_do_invert: string;
  tessedit_enable_doc_dict: string;
  tessedit_ocr_engine_mode: string;
  [key: string]: any; // Para permitir propiedades adicionales dinámicas
}

const ImageToWord: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [documentTitle, setDocumentTitle] = useState('Documento Convertido');
  const [ocrLanguage, setOcrLanguage] = useState('spa');
  const [includeImages, setIncludeImages] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Opciones avanzadas para mejorar el reconocimiento
  const [useAdvancedSettings, setUseAdvancedSettings] = useState<boolean>(true);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [enableDeskew, setEnableDeskew] = useState<boolean>(true);
  const [preprocessingMode, setPreprocessingMode] = useState<string>('1');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de idiomas soportados
  const languages = [
    { code: 'spa', name: 'Español' },
    { code: 'eng', name: 'Inglés' },
    { code: 'fra', name: 'Francés' },
    { code: 'por', name: 'Portugués' },
    { code: 'deu', name: 'Alemán' },
    { code: 'ita', name: 'Italiano' }
  ];

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

  // Función para convertir imágenes a Word con OCR
  const convertImagesToWord = async () => {
    if (images.length === 0) {
      setError('Por favor, seleccione al menos una imagen para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentProgress(0);
      setProcessingStatus('Iniciando proceso...');
      setError(null);
      
      // Procesar cada imagen con OCR usando API directa
      const processedImages = [...images];
      
      // Calculamos el progreso total basado en el número de imágenes
      const progressPerImage = 80 / processedImages.length;
      
      // Opciones avanzadas para mejorar la precisión del OCR
      const reconocimientoOptions: ReconocimientoOptions = {
        // Configuración avanzada para mejorar la precisión
        tessedit_pageseg_mode: preprocessingMode, // Segmentación según la selección del usuario
        tessjs_create_pdf: '0',     // No crear PDF
        tessjs_create_hocr: '0',    // No crear HOCR
        tessjs_create_tsv: '0',     // No crear TSV
        preserve_interword_spaces: '1', // Preservar espacios entre palabras
        tessedit_char_whitelist: '', // Permitir todos los caracteres
        tessedit_do_invert: '0',    // No invertir
        tessedit_enable_doc_dict: '1', // Usar diccionario
        tessedit_ocr_engine_mode: '2' // LSTM solo (más preciso para texto normal)
      };
      
      // Añadir opciones de preprocesamiento si están habilitadas
      if (useAdvancedSettings) {
        if (enhanceContrast) {
          // Mejora de contraste
          reconocimientoOptions.tessedit_do_invert = '0';
        }
        
        if (enableDeskew) {
          // Habilitar corrección de inclinación
          reconocimientoOptions['deskew'] = '1';
          reconocimientoOptions['tessjs_deskew'] = '1';
        }
      }
      
      // Procesar cada imagen secuencialmente
      for (let i = 0; i < processedImages.length; i++) {
        setProcessingStatus(`Procesando imagen ${i + 1} de ${processedImages.length}...`);
        
        const baseProgress = i * progressPerImage;
        
        // Reconocer la imagen actual
        const result = await Tesseract.recognize(
          processedImages[i].file,
          ocrLanguage,
          {
            logger: (packet: any) => {
              if (packet.status === 'recognizing text') {
                const imageProgress = packet.progress * progressPerImage;
                setCurrentProgress(Math.floor(baseProgress + imageProgress));
              }
            },
            ...reconocimientoOptions
          }
        );
        
        // Guardar el texto extraído
        processedImages[i].text = result.data.text;
      }

      // Actualizar imágenes con el texto extraído
      setImages(processedImages);
      
      // Crear documento Word
      setProcessingStatus('Generando documento Word...');
      setCurrentProgress(90);
      
      // Construir el contenido del documento
      const children = [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun(documentTitle)
          ]
        }),
        new Paragraph({
          children: [
            new TextRun(`Documento generado con Evaristools - ${new Date().toLocaleDateString()}`)
          ]
        }),
        new Paragraph({})
      ];

      // Añadir cada imagen y su texto al documento
      for (let i = 0; i < processedImages.length; i++) {
        const img = processedImages[i];
        
        // Añadir un encabezado para cada imagen
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun(`Imagen ${i + 1}`)
            ]
          })
        );

        // Nota sobre inclusión/no inclusión de imágenes
        if (!includeImages) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "(Nota: Se ha omitido la inclusión de imágenes por elección del usuario)",
                  italics: true
                })
              ]
            })
          );
        }

        // Añadir el texto extraído
        if (img.text) {
          const paragraphs = img.text.split('\n').filter(line => line.trim());
          
          // Agregar los párrafos de texto al documento
          paragraphs.forEach(line => {
            children.push(
              new Paragraph({
                children: [new TextRun(line)]
              })
            );
          });
        }

        // Añadir separador
        children.push(
          new Paragraph({
            children: [new TextRun("")],
            border: {
              bottom: { color: "999999", space: 1, style: "single", size: 6 },
            },
          })
        );
      }

      // Crear el documento con todos los elementos
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: children
          }
        ]
      });

      // Exportar el documento Word
      const blob = await Packer.toBlob(doc);
      
      // Descargar el blob directamente sin necesidad de convertirlo
      saveAs(blob, `${documentTitle.replace(/\s+/g, '_')}.docx`);

      setSuccess('Documento Word generado correctamente');
      setIsProcessing(false);
      setCurrentProgress(100);
      setProcessingStatus('¡Proceso completado!');
      
      // Limpiar estado de éxito después de 5 segundos
      setTimeout(() => {
        setSuccess(null);
        setProcessingStatus('');
      }, 5000);
      
    } catch (err) {
      console.error('Error al convertir imágenes a Word:', err);
      setError('Ocurrió un error al procesar las imágenes o generar el documento Word');
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Imágenes a Word</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte imágenes a documentos de Word mediante reconocimiento óptico de caracteres (OCR).
          El texto extraído de las imágenes será incluido en un documento Word editable.
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
          <h3 className="font-medium text-[#101418]">Cargar imágenes para convertir</h3>
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
              PNG, JPG, GIF hasta 10MB (múltiples archivos permitidos)
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
            <div className="space-y-4">
              <div className="pt-4">
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
              
              <div className="border-t border-[#e5e7eb] pt-4">
                <h4 className="text-sm font-medium text-[#374151] mb-3">
                  Opciones de Conversión:
                </h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="document-title" className="block text-sm font-medium text-[#374151] mb-1">
                      Título del Documento
                    </label>
                    <input
                      id="document-title"
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="ocr-language" className="block text-sm font-medium text-[#374151] mb-1">
                      Idioma para OCR
                    </label>
                    <select
                      id="ocr-language"
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="include-images" className="block text-sm font-medium text-[#374151] mb-1">
                      Incluir imágenes en el documento
                    </label>
                    <select
                      id="include-images"
                      value={includeImages ? 'yes' : 'no'}
                      onChange={(e) => setIncludeImages(e.target.value === 'yes')}
                      className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="yes">Sí, incluir imágenes</option>
                      <option value="no">No, solo incluir texto</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="use-advanced-settings"
                      checked={useAdvancedSettings}
                      onChange={(e) => setUseAdvancedSettings(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="use-advanced-settings" className="ml-2 text-sm text-[#374151]">
                      Usar configuración avanzada
                    </label>
                  </div>
                  
                  {useAdvancedSettings && (
                    <div className="pt-2 space-y-3 border-t border-[#e5e7eb]">
                      <div className="text-sm text-center text-[#6b7280]">Opciones avanzadas</div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enhance-contrast"
                          checked={enhanceContrast}
                          onChange={(e) => setEnhanceContrast(e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="enhance-contrast" className="ml-2 text-sm text-[#374151]">
                          Mejorar contraste
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enable-deskew"
                          checked={enableDeskew}
                          onChange={(e) => setEnableDeskew(e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="enable-deskew" className="ml-2 text-sm text-[#374151]">
                          Corregir inclinación (deskew)
                        </label>
                      </div>
                      
                      <div>
                        <label htmlFor="preprocessing-mode" className="block text-sm font-medium text-[#374151] mb-1">
                          Modo de segmentación
                        </label>
                        <select
                          id="preprocessing-mode"
                          value={preprocessingMode}
                          onChange={(e) => setPreprocessingMode(e.target.value)}
                          className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="1">Segmentación automática (recomendado)</option>
                          <option value="4">Columna simple</option>
                          <option value="6">Bloque de texto uniforme</option>
                          <option value="11">Texto disperso</option>
                          <option value="13">Línea de texto sin separación</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-[#e5e7eb] pt-4">
                <button
                  onClick={convertImagesToWord}
                  disabled={isProcessing}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                >
                  {isProcessing ? 'Procesando...' : 'Convertir a Word'}
                </button>
                
                {isProcessing && (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-full bg-[#e5e7eb] rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${currentProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-[#6b7280] mt-2">{currentProgress}% Completado</span>
                    <span className="text-xs text-[#6b7280] mt-1">{processingStatus}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la conversión de Imágenes a Word?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La conversión de imágenes a documentos Word es un proceso que combina reconocimiento óptico de caracteres (OCR) 
            con la generación de documentos editables. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Preprocesamiento de imágenes:</span> Cada imagen se optimiza para mejorar la calidad 
              del reconocimiento, ajustando el contraste y corrigiendo la inclinación si es necesario.
            </li>
            <li>
              <span className="font-medium">OCR avanzado:</span> Se utiliza tecnología de reconocimiento óptico de caracteres basada 
              en redes neuronales para identificar el texto presente en cada imagen.
            </li>
            <li>
              <span className="font-medium">Estructuración del contenido:</span> El texto extraído se organiza en párrafos y secciones, 
              preservando el formato básico del documento original.
            </li>
            <li>
              <span className="font-medium">Generación del documento Word:</span> Se crea un archivo DOCX con el texto extraído, 
              añadiendo encabezados, formatos básicos e imágenes originales si se desea.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ImageToWord; 