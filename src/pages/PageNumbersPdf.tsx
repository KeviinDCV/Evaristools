import React, { useState, useRef } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const PageNumbersPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [position, setPosition] = useState<string>('bottom-center');
  const [startingNumber, setStartingNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(12);
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [format, setFormat] = useState<string>('1, 2, 3');
  const [margin, setMargin] = useState<number>(15);
  const [excludeFirstPage, setExcludeFirstPage] = useState<boolean>(false);
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

  // Función para añadir números de página al PDF
  const addPageNumbers = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear FormData para enviar el archivo y los parámetros al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('position', position);
      formData.append('startingNumber', startingNumber.toString());
      formData.append('fontSize', fontSize.toString());
      formData.append('fontFamily', fontFamily);
      formData.append('format', format);
      formData.append('margin', margin.toString());
      formData.append('excludeFirstPage', excludeFirstPage.toString());
      
      // Enviar solicitud al servidor
      const response = await fetch(`${config.apiUrl}/add-page-numbers`, {
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
      const filename = `${selectedFile.name.split('.').slice(0, -1).join('.')}_numerado.pdf`;
      
      // Descargar el archivo
      saveAs(blob, filename);
      
      setSuccess('Números de página añadidos correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al añadir números de página:', err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error al añadir los números de página al PDF');
      setIsProcessing(false);
    }
  };

  // Función para renderizar la vista previa del formato
  const renderFormatPreview = () => {
    let preview = '';
    
    switch (format) {
      case '1, 2, 3':
        preview = `1, 2, 3, ...`;
        break;
      case 'Página 1, Página 2':
        preview = `Página ${startingNumber}, Página ${startingNumber + 1}, ...`;
        break;
      case '1 de N':
        preview = `${startingNumber} de X, ${startingNumber + 1} de X, ...`;
        break;
      case 'i, ii, iii':
        preview = 'i, ii, iii, ...';
        break;
      case 'I, II, III':
        preview = 'I, II, III, ...';
        break;
      default:
        preview = `${startingNumber}, ${startingNumber + 1}, ...`;
    }
    
    return preview;
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Números de página en PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Añade números de página a tus documentos PDF. Configura posición, tamaño, formato y tipografía.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF</h3>
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
              Selecciona un archivo PDF para añadir números de página
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

              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Posición de los números:
                  </h4>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bottom-center">Inferior centro</option>
                    <option value="bottom-right">Inferior derecha</option>
                    <option value="bottom-left">Inferior izquierda</option>
                    <option value="top-center">Superior centro</option>
                    <option value="top-right">Superior derecha</option>
                    <option value="top-left">Superior izquierda</option>
                  </select>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Formato de numeración:
                  </h4>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1, 2, 3">1, 2, 3, ...</option>
                    <option value="Página 1, Página 2">Página 1, Página 2, ...</option>
                    <option value="1 de N">1 de N, 2 de N, ...</option>
                    <option value="i, ii, iii">i, ii, iii, ... (romanos minúsculas)</option>
                    <option value="I, II, III">I, II, III, ... (romanos mayúsculas)</option>
                  </select>
                  
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                    Vista previa: <span className="font-medium">{renderFormatPreview()}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Número inicial:
                  </h4>
                  <input
                    type="number"
                    min="1"
                    value={startingNumber}
                    onChange={(e) => setStartingNumber(parseInt(e.target.value) || 1)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Margen (mm):
                  </h4>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={margin}
                    onChange={(e) => setMargin(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-[#6b7280] mt-1">
                    {margin} mm
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Tamaño de fuente:
                  </h4>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-[#6b7280] mt-1">
                    {fontSize} pt
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Fuente:
                  </h4>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Opciones adicionales:
                </h4>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center">
                    <input
                      id="exclude-first"
                      type="checkbox"
                      checked={excludeFirstPage}
                      onChange={(e) => setExcludeFirstPage(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="exclude-first" className="ml-2 text-sm text-[#374151]">
                      No numerar la primera página
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={addPageNumbers}
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
                  ) : 'Añadir números de página'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funcionan los números de página?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            La numeración de páginas en documentos PDF facilita la navegación y referencia
            de documentos extensos. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Personalización del formato:</span> Eliges el estilo
              de numeración que mejor se adapte a tu documento, como números simples, "Página X", 
              números romanos, etc.
            </li>
            <li>
              <span className="font-medium">Configuración de posición y estilo:</span> Defines dónde
              aparecerán los números en cada página y su aspecto visual (fuente, tamaño).
            </li>
            <li>
              <span className="font-medium">Opciones avanzadas:</span> Estableces excepciones como 
              excluir la primera página para portadas o páginas de título.
            </li>
            <li>
              <span className="font-medium">Finalización:</span> Se genera un nuevo documento PDF con
              los números de página integrados perfectamente según tus especificaciones.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PageNumbersPdf; 