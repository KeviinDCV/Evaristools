import React, { useState, useRef, ChangeEvent } from 'react';
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
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">OCR y Extracción de Texto</h1>
        <p className="text-[#5c728a] text-sm">
          Extrae texto de imágenes y PDFs. Soporta múltiples idiomas y optimización automática para mejorar la precisión.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel izquierdo */}
        <div className="flex flex-col space-y-4">
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e5e7eb]">
              <h3 className="font-medium text-[#101418]">Cargar Archivo</h3>
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
                  {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un archivo'}
                </span>
                <span className="mt-1 text-xs text-[#9ca3af]">
                  Solo PNG, JPG, GIF y PDF hasta 10MB
                </span>
              </button>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              
              <div className="space-y-2">
                <label htmlFor="language" className="block text-sm font-medium text-[#374151]">
                  Idioma
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
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
                  
                  <div className="space-y-2">
                    <label htmlFor="preprocessing-mode" className="block text-sm font-medium text-[#374151]">
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

              <button
                onClick={handleProcessFile}
                disabled={!selectedFile || isProcessing}
                className={`w-full py-2 px-4 rounded-md font-medium ${!selectedFile || isProcessing ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
              >
                {isProcessing ? 'Procesando...' : 'Extraer Texto'}
              </button>

              {isProcessing && (
                <div className="flex flex-col items-center py-4">
                  <div className="w-full bg-[#e5e7eb] rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-[#6b7280] mt-2">{progress}% Completado</span>
                </div>
              )}
              
              {previewUrl && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[#374151] mb-2">Vista Previa</h4>
                  <div className="relative border border-[#e5e7eb] rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="max-w-full h-auto max-h-[300px] mx-auto"
                    />
                  </div>
                </div>
              )}
              
              {selectedFile && !previewUrl && (
                <div className="mt-4 p-4 bg-[#f3f4f6] rounded-lg">
                  <h4 className="text-sm font-medium text-[#374151] mb-2">Archivo seleccionado</h4>
                  <div className="flex items-center">
                    <svg className="w-8 h-8 text-[#6b7280] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-[#6b7280]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col space-y-4">
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="font-medium text-[#101418]">Texto Extraído</h3>
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!recognizedText}
                  className={`py-1 px-3 text-xs rounded-md ${!recognizedText ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] transition-colors'}`}
                >
                  Copiar
                </button>
                <button
                  onClick={downloadAsTextFile}
                  disabled={!recognizedText}
                  className={`py-1 px-3 text-xs rounded-md ${!recognizedText ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] transition-colors'}`}
                >
                  Descargar
                </button>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={recognizedText}
                onChange={(e) => setRecognizedText(e.target.value)}
                placeholder="El texto extraído aparecerá aquí..."
                className="w-full h-[400px] p-3 border border-[#e5e7eb] rounded-md text-[#374151] bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la extracción de texto?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            Esta herramienta utiliza diferentes tecnologías para extraer texto de varios tipos de archivos:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Para imágenes (JPG, PNG, GIF, etc.):</span> Utiliza OCR (Reconocimiento Óptico de Caracteres) que optimiza la imagen, 
              identifica caracteres mediante redes neuronales LSTM y analiza el contexto lingüístico.
            </li>
            <li>
              <span className="font-medium">Para PDFs:</span> Extrae directamente el texto de los PDFs que contienen texto seleccionable. Para PDFs escaneados, 
              utiliza OCR para reconocer el texto en las imágenes.
            </li>
          </ol>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mt-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Formatos soportados:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800 mt-2">
              <li>Imágenes: JPG, PNG, GIF, BMP, WEBP, TIFF</li>
              <li>Documentos: PDF</li>
            </ul>
            <p className="text-sm text-blue-800 mt-2">
              <span className="font-medium">Nota:</span> Si necesita extraer texto de documentos Word, Excel o PowerPoint, 
              guárdelos primero como PDF o expórtelos como imagen para procesarlos.
            </p>
          </div>
          
          <p className="text-sm mt-4 text-[#6b7280]">
            <strong>Nota:</strong> La precisión de extracción depende de la calidad del archivo original. Los documentos con texto seleccionable 
            ofrecen mejores resultados que los escaneados o las imágenes de baja resolución.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OcrTool; 