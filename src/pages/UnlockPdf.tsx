import React, { useState, useRef } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const UnlockPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Función para desbloquear el PDF
  const unlockPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para desbloquear');
      return;
    }

    if (!password.trim()) {
      setError('Por favor, ingrese la contraseña del documento');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear FormData para enviar el archivo y la contraseña al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('password', password);
      
      // Enviar solicitud al servidor
      const response = await fetch(`${config.apiUrl}/unlock-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el archivo');
      }
      
      // Obtener el blob del PDF procesado
      const blob = await response.blob();
      
      // Crear nombre de archivo para la descarga
      const filename = `${selectedFile.name.split('.').slice(0, -1).join('.')}_desbloqueado.pdf`;
      
      // Descargar el archivo
      saveAs(blob, filename);
      
      setSuccess('PDF desbloqueado correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al desbloquear el PDF:', err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error al desbloquear el PDF. Verifica que la contraseña sea correcta.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Desbloquear PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Elimina la protección por contraseña de tus documentos PDF para facilitar su acceso y edición.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para desbloquear</h3>
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
              Haz clic para seleccionar un archivo PDF protegido
            </span>
            <span className="mt-1 text-xs text-[#9ca3af]">
              Selecciona un archivo PDF con contraseña para desbloquearlo
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
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Contraseña del PDF:
                </h4>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña del PDF"
                  className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  Introduce la contraseña que protege el documento PDF.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={unlockPdf}
                  disabled={isProcessing || !password.trim()}
                  className={`w-full py-2 px-4 rounded-md font-medium ${isProcessing || !password.trim() ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed' : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors'}`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : 'Desbloquear PDF'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona el desbloqueo de PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            El desbloqueo de documentos PDF protegidos con contraseña te permite acceder y 
            editar archivos que de otra manera estarían restringidos. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Identificación de seguridad:</span> La herramienta identifica 
              el tipo de protección por contraseña aplicada al documento PDF.
            </li>
            <li>
              <span className="font-medium">Autenticación:</span> Utilizas la contraseña correcta para 
              acceder al contenido protegido del documento.
            </li>
            <li>
              <span className="font-medium">Procesamiento:</span> El sistema elimina las restricciones 
              del documento mientras preserva su contenido y formato originales.
            </li>
            <li>
              <span className="font-medium">Finalización:</span> Se genera una nueva versión del PDF sin 
              restricciones de contraseña, permitiendo su libre acceso, edición e impresión.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default UnlockPdf; 