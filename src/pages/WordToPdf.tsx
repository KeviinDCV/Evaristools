import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const WordToPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverReady, setServerReady] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar conexión al servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/system-info`);
        if (!response.ok) {
          setServerReady(false);
          // No establecemos el error aquí, ya que mostraremos el mensaje de servidor no disponible
        }
      } catch (err) {
        console.error('Error al verificar el servidor:', err);
        setServerReady(false);
        // No establecemos el error aquí, ya que mostraremos el mensaje de servidor no disponible
      }
    };
    
    checkServer();
  }, []);

  // Función para manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validar que sea un archivo Word
      const isWordFile = 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
        file.type === 'application/msword'; // .doc
        
      if (!isWordFile) {
        setError('Solo se permiten archivos Word (.doc, .docx)');
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
      }
    }
  };

  // Función para convertir Word a PDF
  const convertWordToPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo Word para convertir');
      return;
    }

    if (!serverReady) {
      // No establecemos el error aquí, ya se muestra en la interfaz que el servidor no está disponible
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear un objeto FormData para enviar el archivo al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Enviar el archivo al backend para conversión
      const response = await fetch(`${config.apiUrl}/convert-word-to-pdf`, {
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
      
      // Descargar el archivo PDF generado
      const blob = await response.blob();
      const filename = `${selectedFile.name.split('.').slice(0, -1).join('.')}.pdf`;
      saveAs(blob, filename);
      
      setSuccess('Archivo PDF generado correctamente.');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir Word a PDF:', err);
      setError('Ocurrió un error al generar el archivo PDF: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Word a PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte documentos Word a formato PDF manteniendo el diseño original. Preserva el formato, fuentes, imágenes y tablas de tus documentos.
        </p>
        
        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            El servidor de conversión no está disponible. Por favor, inténtelo más tarde.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo Word para convertir a PDF</h3>
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
              Haz clic para seleccionar un archivo Word
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Selecciona un archivo Word (.doc o .docx) para convertirlo a PDF
            </span>
          </button>
          <input
            type="file"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                  <svg className="w-6 h-6 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <button
                  onClick={convertWordToPdf}
                  disabled={isProcessing || !serverReady}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || !serverReady ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
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
                  El PDF resultante mantiene todos los aspectos del documento original: fuentes, tamaños, colores, imágenes y tablas.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la conversión de Word a PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La conversión de documentos Word a PDF es un proceso que transforma tus archivos manteniendo 
            toda la integridad del diseño original. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis del documento:</span> El sistema analiza la estructura completa 
              del documento Word, incluyendo estilos, fuentes y elementos visuales.
            </li>
            <li>
              <span className="font-medium">Preservación de elementos:</span> Se preservan todas las características 
              del documento, como imágenes, tablas, gráficos, encabezados y pies de página.
            </li>
            <li>
              <span className="font-medium">Conversión formato a formato:</span> El sistema transfiere el 
              documento completo al formato PDF, manteniendo el diseño y la apariencia exactamente igual.
            </li>
            <li>
              <span className="font-medium">Optimización del resultado:</span> El PDF generado está optimizado para 
              una visualización correcta en cualquier dispositivo y programa compatible con el formato PDF.
            </li>
          </ol>
          
          <p className="text-sm mt-4">
            <span className="font-medium">Ventajas de convertir Word a PDF:</span>
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Garantiza que el documento se vea igual en cualquier dispositivo</li>
            <li>Previene cambios no deseados en el contenido</li>
            <li>Facilita la impresión manteniendo el formato exacto</li>
            <li>Permite compartir documentos de manera más profesional</li>
            <li>Reduce el tamaño del archivo manteniendo la calidad</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WordToPdf; 
