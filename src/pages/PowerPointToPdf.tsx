import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const PowerPointToPdf: React.FC = () => {
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
      
      // Validar que sea un archivo PowerPoint
      const isPptFile = 
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || // .pptx
        file.type === 'application/vnd.ms-powerpoint' || // .ppt
        file.type === 'application/vnd.oasis.opendocument.presentation'; // .odp
        
      if (!isPptFile) {
        setError('Solo se permiten archivos PowerPoint (.ppt, .pptx, .odp)');
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
      }
    }
  };

  // Función para convertir PowerPoint a PDF
  const convertPowerPointToPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PowerPoint para convertir');
      return;
    }

    if (!serverReady) {
      // No establecemos error aquí, la interfaz ya muestra que el servidor no está disponible
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear un objeto FormData para enviar el archivo al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Enviar el archivo al backend para conversión
      const response = await fetch(`${config.apiUrl}/convert-powerpoint-to-pdf`, {
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
      
      setSuccess('Presentación PowerPoint convertida a PDF correctamente.');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir PowerPoint a PDF:', err);
      setError('Ocurrió un error al convertir la presentación a PDF: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">PowerPoint a PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Convierte presentaciones PowerPoint a formato PDF. Preserva las diapositivas, animaciones, imágenes y el diseño original de tus presentaciones.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PowerPoint para convertir a PDF</h3>
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
              Haz clic para seleccionar un archivo PowerPoint
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Selecciona un archivo PowerPoint (.ppt, .pptx o .odp) para convertirlo a PDF
            </span>
          </button>
          <input
            type="file"
            accept=".ppt,.pptx,.odp,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation"
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
                  <svg className="w-6 h-6 mr-3 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <rect x="8" y="12" width="8" height="6"></rect>
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
                  onClick={convertPowerPointToPdf}
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
                  El PDF resultante mantiene todos los elementos visuales y el diseño de la presentación original.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la conversión de PowerPoint a PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La conversión de presentaciones PowerPoint a formato PDF permite compartir tus diapositivas
            de manera profesional y compatible con cualquier dispositivo. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Análisis de diapositivas:</span> El sistema analiza cada diapositiva de la presentación,
              incluyendo todos los elementos visuales y textuales.
            </li>
            <li>
              <span className="font-medium">Preservación del diseño:</span> Se mantienen los fondos, temas, colores y disposición
              de los elementos tal como fueron diseñados originalmente.
            </li>
            <li>
              <span className="font-medium">Conversión de efectos:</span> Los efectos visuales y transiciones se convierten
              a un formato estático optimizado para la mejor apariencia en PDF.
            </li>
            <li>
              <span className="font-medium">Generación del documento PDF:</span> Se crea un documento PDF donde cada página
              representa una diapositiva de la presentación original.
            </li>
          </ol>
          
          <p className="text-sm mt-4">
            <span className="font-medium">Ventajas de convertir PowerPoint a PDF:</span>
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Garantiza que la presentación se verá igual en cualquier dispositivo</li>
            <li>Protege tu trabajo de modificaciones no autorizadas</li>
            <li>Reduce el tamaño del archivo manteniendo la calidad visual</li>
            <li>Facilita la distribución e impresión de las diapositivas</li>
            <li>Permite compartir presentaciones con personas que no tienen PowerPoint</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PowerPointToPdf;