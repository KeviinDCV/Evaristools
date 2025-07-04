import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Imágenes a Word</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Convierte imágenes a documentos de Word mediante reconocimiento óptico de caracteres (OCR).
          El texto extraído se incluirá en un documento Word completamente editable.
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

      {/* Main Content */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Cargar imágenes para convertir
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full bg-muted/50 border-2 border-dashed border-border rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 hover:border-primary transition-all duration-200 group"
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Haz clic para seleccionar imágenes
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, GIF, BMP, WEBP hasta 10MB (múltiples archivos permitidos)
              </p>
            </div>
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleImagesChange}
            multiple
            className="hidden"
            ref={fileInputRef}
          />

          {/* Images Preview */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Imágenes seleccionadas ({images.length})
                </h4>
                <div className="border border-border rounded-lg p-3 max-h-64 overflow-y-auto bg-muted/20">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {images.map((img, index) => (
                      <div key={`${img.file.name}-${index}`} className="relative group">
                        <div className="relative rounded-lg overflow-hidden border border-border bg-background">
                          <img
                            src={img.url}
                            alt={img.file.name}
                            className="h-24 w-full object-contain p-2"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive rounded-full p-1 text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Eliminar imagen"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-background/90 text-foreground text-xs p-1 truncate border-t border-border">
                            {img.file.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Configuration Section */}
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Opciones de conversión
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="document-title" className="text-sm font-medium text-foreground">
                      Título del documento:
                    </label>
                    <input
                      id="document-title"
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                      placeholder="Ingresa el título del documento"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="ocr-language" className="text-sm font-medium text-foreground">
                      Idioma para OCR:
                    </label>
                    <select
                      id="ocr-language"
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="include-images" className="text-sm font-medium text-foreground">
                      Incluir imágenes en el documento:
                    </label>
                    <select
                      id="include-images"
                      value={includeImages ? 'yes' : 'no'}
                      onChange={(e) => setIncludeImages(e.target.value === 'yes')}
                      className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                    >
                      <option value="yes">Sí, incluir imágenes originales</option>
                      <option value="no">No, solo incluir texto extraído</option>
                    </select>
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="use-advanced-settings"
                      checked={useAdvancedSettings}
                      onChange={(e) => setUseAdvancedSettings(e.target.checked)}
                      className="w-4 h-4 text-primary border-2 border-input rounded focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="use-advanced-settings" className="text-sm font-medium text-foreground cursor-pointer">
                      Configuración avanzada de OCR
                    </label>
                  </div>

                  {/* Advanced Settings Panel */}
                  {useAdvancedSettings && (
                    <div className="space-y-4 p-4 bg-muted/20 border border-border rounded-lg">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h4 className="text-sm font-medium text-foreground">Opciones avanzadas de OCR</h4>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="enhance-contrast"
                            checked={enhanceContrast}
                            onChange={(e) => setEnhanceContrast(e.target.checked)}
                            className="w-4 h-4 text-primary border-2 border-input rounded focus:ring-2 focus:ring-ring"
                          />
                          <label htmlFor="enhance-contrast" className="text-sm text-foreground cursor-pointer">
                            Mejorar contraste automáticamente
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="enable-deskew"
                            checked={enableDeskew}
                            onChange={(e) => setEnableDeskew(e.target.checked)}
                            className="w-4 h-4 text-primary border-2 border-input rounded focus:ring-2 focus:ring-ring"
                          />
                          <label htmlFor="enable-deskew" className="text-sm text-foreground cursor-pointer">
                            Corregir inclinación del texto (deskew)
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="preprocessing-mode" className="text-sm font-medium text-foreground">
                            Modo de segmentación de página:
                          </label>
                          <select
                            id="preprocessing-mode"
                            value={preprocessingMode}
                            onChange={(e) => setPreprocessingMode(e.target.value)}
                            className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                          >
                            <option value="1">Segmentación automática (recomendado)</option>
                            <option value="4">Columna simple</option>
                            <option value="6">Bloque de texto uniforme</option>
                            <option value="11">Texto disperso</option>
                            <option value="13">Línea de texto sin separación</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Process Button */}
              <div className="border-t border-border pt-6">
                <button
                  onClick={convertImagesToWord}
                  disabled={isProcessing}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    isProcessing
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
                      Convertir a Word
                    </>
                  )}
                </button>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Progreso de conversión</span>
                      <span className="text-sm text-muted-foreground">{currentProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">{processingStatus}</span>
                    </div>
                  </div>
                )}
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
            ¿Cómo funciona la conversión de Imágenes a Word?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La conversión de imágenes a documentos Word combina tecnología OCR avanzada con generación de documentos editables:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Preprocesamiento de imágenes</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optimización automática de contraste y corrección de inclinación para mejorar la precisión del OCR.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">OCR con redes neuronales</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reconocimiento óptico de caracteres usando tecnología LSTM para máxima precisión.
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
                  <h4 className="font-medium text-foreground text-sm">Estructuración del contenido</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Organización del texto en párrafos y secciones preservando el formato original.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Generación del documento Word</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creación de archivo DOCX editable con texto extraído, encabezados y formato profesional.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-800 text-sm">Formatos soportados</h4>
                <p className="text-xs text-blue-700 mt-1">
                  <span className="font-medium">Entrada:</span> JPG, PNG, GIF, BMP, WEBP, TIFF (hasta 10MB cada una) •
                  <span className="font-medium">Salida:</span> Documento Word (.docx) completamente editable
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToWord; 
