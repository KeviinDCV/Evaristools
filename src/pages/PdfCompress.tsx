import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

const PdfCompress: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<string>('medium');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverReady, setServerReady] = useState<boolean>(true);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar conexión al servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/system-info`);
        if (!response.ok) {
          setServerReady(false);
          // No establecemos mensaje de error aquí, se mostrará en la interfaz
        }
      } catch (err) {
        console.error('Error al verificar el servidor:', err);
        setServerReady(false);
        // No establecemos mensaje de error aquí, se mostrará en la interfaz
      }
    };
    
    checkServer();
  }, []);

  // Función para manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setOriginalSize(file.size);
        setError(null);
        setSuccess(null);
        setCompressedSize(0);
      }
    }
  };

  // Función para comprimir PDF usando el servidor
  const compressPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para comprimir');
      return;
    }

    if (!serverReady) {
      return; // No hay necesidad de establecer error, ya se muestra en la interfaz
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('compressionLevel', compressionLevel);
      
      // Enviar el archivo al servidor para comprimirlo
      const response = await fetch(`${config.apiUrl}/compress-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Si el servidor responde con un error, obtener el mensaje de error
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
      
      // Obtener el tamaño del archivo comprimido
      const blob = await response.blob();
      setCompressedSize(blob.size);
      
      // Calcular el porcentaje de reducción
      const savings = ((originalSize - blob.size) / originalSize * 100).toFixed(1);
      
      // Descargar el archivo PDF comprimido
      const filename = `comprimido_${selectedFile.name}`;
      saveAs(blob, filename);
      
      setSuccess(`PDF comprimido correctamente. Reducción de tamaño: ${savings}%`);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al comprimir PDF:', err);
      setError(`Error al comprimir el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

  // Función fallback para comprimir PDF en el cliente (muy limitada)
  const compressPdfClientSide = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para comprimir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Cargar el PDF
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);

      // Crear un nuevo documento para la versión comprimida
      const compressedPdf = await PDFDocument.create();
      
      // Copiar todas las páginas
      const pages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => compressedPdf.addPage(page));

      // Opciones de compresión según el nivel seleccionado
      const compressionOptions: any = {
        // Base de opciones comunes
        useObjectStreams: true,
      };

      // Ajustar opciones según el nivel de compresión seleccionado
      if (compressionLevel === 'high') {
        compressionOptions.compress = true;
        compressionOptions.objectsPerTick = 100;
        compressionOptions.updateFieldAppearances = false;
      } else if (compressionLevel === 'medium') {
        compressionOptions.compress = true;
        compressionOptions.objectsPerTick = 50;
        compressionOptions.updateFieldAppearances = true;
      } else { // low
        compressionOptions.compress = false;
        compressionOptions.updateFieldAppearances = true;
      }

      // Guardar el PDF comprimido
      const compressedPdfBytes = await compressedPdf.save(compressionOptions);
      setCompressedSize(compressedPdfBytes.length);
      
      // Descargar el PDF comprimido
      const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, `comprimido_${selectedFile.name}`);
      
      const savings = ((originalSize - compressedPdfBytes.length) / originalSize * 100).toFixed(1);
      
      setSuccess(`PDF comprimido correctamente. Reducción de tamaño: ${savings}%`);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al comprimir PDF:', err);
      setError(`Error al comprimir el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Comprimir PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Reduce el tamaño de archivos PDF manteniendo la calidad visual. 
          Útil para enviar por correo electrónico o almacenar archivos grandes.
        </p>
        
        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            El servidor de conversión no está disponible. Se usará el procesamiento local con resultados limitados.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para comprimir</h3>
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
              Selecciona un archivo PDF para comprimirlo
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
                <label htmlFor="compression-level" className="block text-sm font-medium text-[#374151] mb-2">
                  Nivel de compresión:
                </label>
                <select
                  id="compression-level"
                  value={compressionLevel}
                  onChange={(e) => setCompressionLevel(e.target.value)}
                  className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Baja (mejor calidad)</option>
                  <option value="medium">Media (equilibrado)</option>
                  <option value="high">Alta (menor tamaño)</option>
                </select>
                <p className="mt-1 text-xs text-[#6b7280]">
                  Selecciona el nivel de compresión según tus necesidades. Mayor compresión puede reducir la calidad visual.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={serverReady ? compressPdf : compressPdfClientSide}
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
                  ) : 'Comprimir PDF'}
                </button>
                
                {compressedSize > 0 && originalSize > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-[#374151] mb-2">
                      Estadísticas de compresión:
                    </h4>
                    <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-[#6b7280]">Tamaño original:</span>
                        <span className="text-xs font-medium">{(originalSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-[#6b7280]">Tamaño comprimido:</span>
                        <span className="text-xs font-medium">{(compressedSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-[#6b7280]">Reducción:</span>
                        <span className="text-xs font-medium text-green-600">{((originalSize - compressedSize) / originalSize * 100).toFixed(1)}%</span>
                      </div>
                      
                      <div className="mt-3 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${Math.min(100, ((originalSize - compressedSize) / originalSize * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!serverReady && (
                  <p className="text-xs text-[#6b7280] mt-2 text-center">
                    La compresión en el navegador es limitada. Para mejores resultados, utilice el servidor.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la compresión de PDFs?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La compresión de archivos PDF es un proceso que reduce el tamaño del documento manteniendo su contenido y funcionalidad.
            El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis del documento:</span> Se analiza la estructura interna del PDF para identificar 
              elementos que pueden ser optimizados, como imágenes, fuentes y metadatos.
            </li>
            <li>
              <span className="font-medium">Optimización de imágenes:</span> Las imágenes dentro del documento se recomprimen 
              utilizando algoritmos eficientes, reduciendo su tamaño mientras se mantiene un balance entre calidad y peso.
            </li>
            <li>
              <span className="font-medium">Compresión de estructura:</span> Se utiliza la tecnología de flujos de objetos (object streams) 
              para almacenar múltiples objetos PDF de forma más eficiente en el archivo.
            </li>
            <li>
              <span className="font-medium">Eliminación de redundancias:</span> Se eliminan datos duplicados o innecesarios, 
              y se optimiza la estructura interna del documento según el nivel de compresión seleccionado.
            </li>
          </ol>
          
          <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-xs">
            <span className="font-medium">Consejo:</span> Para archivos con muchas imágenes, usa el nivel alto de compresión 
            para obtener una mayor reducción de tamaño. Para documentos con elementos críticos de diseño, usa el nivel bajo 
            para preservar la calidad visual.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfCompress; 