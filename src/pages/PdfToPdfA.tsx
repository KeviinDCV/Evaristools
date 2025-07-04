import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const PdfToPdfA: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conformanceLevel, setConformanceLevel] = useState<string>('pdfa-2b');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverReady, setServerReady] = useState<boolean>(true);
  const [ghostscriptAvailable, setGhostscriptAvailable] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar conexión al servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/system-info`);
        if (!response.ok) {
          setServerReady(false);
          setGhostscriptAvailable(false);
        } else {
          // Verificar si Ghostscript está disponible
          const data = await response.json();
          if (data.services && data.services.pdf_conversion) {
            setGhostscriptAvailable(data.services.pdf_conversion.available);
          } else {
            setGhostscriptAvailable(false);
          }
        }
      } catch (err) {
        console.error('Error al verificar el servidor:', err);
        setServerReady(false);
        setGhostscriptAvailable(false);
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
        setError(null);
      }
    }
  };

  // Función para convertir PDF a PDF/A
  const convertPdfToPdfA = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para convertir');
      return;
    }

    if (!serverReady) {
      setError('El servidor de conversión no está disponible. Por favor, asegúrese de que el servidor esté en ejecución.');
      return;
    }
    
    if (!ghostscriptAvailable) {
      setError('Ghostscript no está disponible en el servidor. No se puede realizar la conversión a PDF/A.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('conformanceLevel', conformanceLevel);
      
      // Enviar el archivo al servidor para la conversión
      const response = await fetch(`${config.apiUrl}/pdf-to-pdfa`, {
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
      
      // Descargar el archivo PDF/A resultante
      const blob = await response.blob();
      const filename = `${selectedFile.name.replace('.pdf', '')}_pdfa.pdf`;
      saveAs(blob, filename);
      
      setSuccess(`PDF convertido a PDF/A (${conformanceLevel.toUpperCase()}) correctamente`);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir PDF a PDF/A:', err);
      setError('Ocurrió un error al convertir el PDF: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">PDF a PDF/A</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte documentos PDF al formato de archivo PDF/A para preservación a largo plazo y cumplimiento de estándares de archivo.
        </p>

        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mt-2">
            El servidor de conversión no está disponible. Por favor, asegúrese de que el servidor esté en ejecución.
          </div>
        )}
        
        {serverReady && !ghostscriptAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mt-2">
            Ghostscript no está instalado en el servidor. No se puede realizar la conversión a PDF/A.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para convertir a PDF/A</h3>
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
              Selecciona un archivo PDF para convertirlo al formato PDF/A
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

              <div className="pt-4">
                <label htmlFor="conformance-level" className="block text-sm font-medium text-[#374151] mb-2">
                  Nivel de conformidad PDF/A:
                </label>
                <select
                  id="conformance-level"
                  value={conformanceLevel}
                  onChange={(e) => setConformanceLevel(e.target.value)}
                  className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-hidden focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pdfa-1b">PDF/A-1b (nivel básico, ISO 19005-1)</option>
                  <option value="pdfa-2b">PDF/A-2b (nivel básico, ISO 19005-2, recomendado)</option>
                  <option value="pdfa-3b">PDF/A-3b (nivel básico, ISO 19005-3)</option>
                  <option value="pdfa-2u">PDF/A-2u (Unicode, ISO 19005-2)</option>
                  <option value="pdfa-3u">PDF/A-3u (Unicode, ISO 19005-3)</option>
                </select>
                <p className="mt-1 text-xs text-[#6b7280]">
                  El nivel de conformidad determina las restricciones y características del PDF/A resultante.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={convertPdfToPdfA}
                  disabled={isProcessing || !serverReady || !ghostscriptAvailable}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || !serverReady || !ghostscriptAvailable ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : 'Convertir a PDF/A'}
                </button>
                <p className="text-xs text-[#6b7280] mt-2 text-center">
                  Nota: La conversión puede modificar ciertos elementos para cumplir con el estándar PDF/A.
                </p>
                {!serverReady && selectedFile && (
                  <p className="mt-2 text-xs text-red-500 text-center">
                    No se puede realizar la conversión porque el servidor no está disponible.
                  </p>
                )}
                {serverReady && !ghostscriptAvailable && selectedFile && (
                  <p className="mt-2 text-xs text-red-500 text-center">
                    No se puede realizar la conversión porque Ghostscript no está instalado en el servidor.
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
          <h3 className="font-medium text-[#101418]">¿Qué es PDF/A y cómo funciona la conversión?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            El formato PDF/A es una versión especializada de PDF diseñada para la preservación a largo plazo
            de documentos electrónicos. El proceso de conversión funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis de cumplimiento:</span> Se analiza el PDF original para identificar
              elementos que no cumplen con el estándar PDF/A, como fuentes no incrustadas, transparencias o
              contenido multimedia.
            </li>
            <li>
              <span className="font-medium">Incrustación de recursos:</span> Todas las fuentes utilizadas en el documento
              se incrustan completamente, y las dependencias externas se eliminan o se incluyen en el archivo.
            </li>
            <li>
              <span className="font-medium">Normalización de contenido:</span> Se ajustan los elementos gráficos, espacios
              de color y metadatos para garantizar que cumplan con las especificaciones del nivel de PDF/A seleccionado.
            </li>
            <li>
              <span className="font-medium">Validación y certificación:</span> El documento resultante se valida contra
              las normas ISO correspondientes y se incluyen metadatos que identifican el nivel de conformidad
              PDF/A alcanzado.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PdfToPdfA; 
