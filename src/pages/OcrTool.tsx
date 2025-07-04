import React, { useState, useRef, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configuración del worker ahora está centralizada en main.tsx

// Idiomas soportados
const languages = [
  { code: 'spa', name: 'Español' },
  { code: 'eng', name: 'Inglés' },
  { code: 'fra', name: 'Francés' },
  { code: 'por', name: 'Portugués' },
  { code: 'deu', name: 'Alemán' },
  { code: 'ita', name: 'Italiano' }
];

// Interfaz para opciones de reconocimiento (compatible con Tesseract.js v2)
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

const OcrTool: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [language, setLanguage] = useState<string>('spa');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  
  // Opciones avanzadas para mejorar el reconocimiento
  const [useAdvancedSettings, setUseAdvancedSettings] = useState<boolean>(true);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [enableDeskew, setEnableDeskew] = useState<boolean>(true);
  const [preprocessingMode, setPreprocessingMode] = useState<string>('1');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Determinar el tipo de archivo
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      // Validar tipos de archivo soportados
      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'];
      const isImage = supportedImageTypes.includes(file.type);
      const isPdf = fileExt === 'pdf';
      
      if (!isImage && !isPdf) {
        setError(`El formato ${fileExt || 'desconocido'} no es compatible. Solo se aceptan imágenes (JPG, PNG, GIF, etc.) y PDFs.`);
        setSelectedFile(null);
        setFileType(null);
        setPreviewUrl(null);
        return;
      }
      
      setSelectedFile(file);
      setFileType(fileExt || null);

      // Mostrar vista previa para imágenes
      if (isImage) {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          setPreviewUrl(fileReader.result as string);
        };
        fileReader.readAsDataURL(file);
      } else {
        // Para PDFs no mostramos vista previa
        setPreviewUrl(null);
      }

      // Limpiar estados previos
      setRecognizedText('');
      setError(null);
      setSuccess(null);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  // Función para extraer texto de un PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      setProgress(10);
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setProgress(30);
      let fullText = '';
      
      // Extraer texto de cada página
      const totalPages = pdf.numPages;
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
        
        // Actualizar el progreso basado en las páginas procesadas
        setProgress(30 + Math.floor((i / totalPages) * 60));
      }
      
      return fullText.trim();
    } catch (err) {
      console.error('Error al extraer texto del PDF:', err);
      throw new Error('No se pudo extraer el texto del archivo PDF');
    }
  };

  // Ya no necesitamos esta función ya que solo procesamos imágenes y PDFs

  // Función para procesar imagen con OCR
  const processImageWithOCR = async (file: File): Promise<string> => {
    setProgress(10);
    
    // Opciones avanzadas para mejorar la precisión del OCR
    const reconocimientoOptions: ReconocimientoOptions = {
      tessedit_pageseg_mode: preprocessingMode,
      tessjs_create_pdf: '0',
      tessjs_create_hocr: '0',
      tessjs_create_tsv: '0',
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: '',
      tessedit_do_invert: '0',
      tessedit_enable_doc_dict: '1',
      tessedit_ocr_engine_mode: '2'
    };

    // Añadir opciones de preprocesamiento si están habilitadas
    if (useAdvancedSettings) {
      if (enhanceContrast) {
        reconocimientoOptions.tessedit_do_invert = '0';
      }
      
      if (enableDeskew) {
        reconocimientoOptions['deskew'] = '1';
        reconocimientoOptions['tessjs_deskew'] = '1';
      }
    }

    // Usar Tesseract.js v2.1.1 directamente con recognize
    const result = await Tesseract.recognize(
      file,
      language,
      {
        logger: (packet: any) => {
          if (packet.status === 'recognizing text') {
            setProgress(10 + Math.round(packet.progress * 90));
          }
        },
        ...reconocimientoOptions
      }
    );
    
    return result.data.text;
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo para procesar');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      let extractedText = '';
      
      // Verificar tipos de archivo soportados
      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'];
      
      // Procesar según el tipo de archivo
      if (supportedImageTypes.includes(selectedFile.type)) {
        // Procesar imágenes con OCR
        extractedText = await processImageWithOCR(selectedFile);
      } else if (fileType === 'pdf') {
        // Procesar PDF
        extractedText = await extractTextFromPDF(selectedFile);
      } else {
        // Tipos de documentos no soportados directamente
        setError(`El formato ${fileType || 'desconocido'} no es compatible directamente. Solo se aceptan imágenes (JPG, PNG, GIF, etc.) y PDFs.`);
        throw new Error(`Formato de archivo ${fileType || 'desconocido'} no soportado`);
      }
      
      // Establecer el texto reconocido
      setRecognizedText(extractedText);
      setSuccess('Texto extraído correctamente');
      setProgress(100);
      
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al procesar el archivo:', err);
      setError(`Error al procesar el archivo: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(recognizedText);
      setSuccess('Texto copiado al portapapeles');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al copiar:', err);
      setError('No se pudo copiar el texto al portapapeles');
    }
  };

  const downloadAsTextFile = () => {
    const element = document.createElement('a');
    const file = new Blob([recognizedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `OCR-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setSuccess('Archivo descargado correctamente');
    setTimeout(() => setSuccess(null), 3000);
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">OCR y Extracción de Texto</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Extrae texto de imágenes y PDFs con tecnología OCR avanzada. Soporta múltiples idiomas y optimización automática para máxima precisión.
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Cargar Archivo
              </h3>
            </div>
            <div className="p-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#3730a3] transition-all duration-200 group"
              >
                <div className="text-gray-500 group-hover:text-[#3730a3] transition-colors">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-[#3730a3] transition-colors">
                    {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un archivo'}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, GIF, BMP, WEBP, TIFF, PDF hasta 10MB
                  </p>
                </div>
              </button>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              
              {/* Language Selection */}
              <div className="space-y-3">
                <label htmlFor="language" className="text-sm font-medium text-foreground">
                  Idioma del texto:
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
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

              {/* Process Button */}
              <button
                onClick={handleProcessFile}
                disabled={!selectedFile || isProcessing}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  !selectedFile || isProcessing
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
                    Extraer Texto
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Progreso del procesamiento</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Image Preview */}
              {previewUrl && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Vista previa de la imagen
                  </h4>
                  <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="w-full h-auto max-h-[300px] object-contain"
                    />
                  </div>
                </div>
              )}

              {/* PDF File Info */}
              {selectedFile && !previewUrl && fileType === 'pdf' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Archivo PDF seleccionado
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                    <p className="text-xs text-blue-600">
                      Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-blue-600">
                      Se extraerá el texto directamente. Para PDFs escaneados se usará OCR automáticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm h-full">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
              <h3 className="font-semibold text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Texto Extraído
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!recognizedText}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    !recognizedText
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </button>
                <button
                  onClick={downloadAsTextFile}
                  disabled={!recognizedText}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    !recognizedText
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar
                </button>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={recognizedText}
                onChange={(e) => setRecognizedText(e.target.value)}
                placeholder="El texto extraído aparecerá aquí. Puedes editarlo antes de copiarlo o descargarlo..."
                className="w-full h-[400px] p-4 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Information Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Cómo funciona la extracción de texto?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Esta herramienta utiliza tecnologías avanzadas de procesamiento de documentos para extraer texto de diferentes tipos de archivos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Imágenes (JPG, PNG, GIF, etc.)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Utiliza OCR con redes neuronales LSTM para reconocer caracteres y analizar el contexto lingüístico.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Documentos PDF</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extrae texto directamente de PDFs con texto seleccionable. Para PDFs escaneados usa OCR automáticamente.
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
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800 text-sm">Formatos soportados</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-700">
                  <div>
                    <span className="font-medium">Imágenes:</span> JPG, PNG, GIF, BMP, WEBP, TIFF
                  </div>
                  <div>
                    <span className="font-medium">Documentos:</span> PDF
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  <span className="font-medium">Tip:</span> Para documentos Word, Excel o PowerPoint, guárdalos como PDF primero.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800 text-sm">Nota importante</h4>
                <p className="text-xs text-amber-700 mt-1">
                  La precisión depende de la calidad del archivo. Los documentos con texto seleccionable ofrecen mejores resultados que las imágenes escaneadas de baja resolución.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OcrTool; 
