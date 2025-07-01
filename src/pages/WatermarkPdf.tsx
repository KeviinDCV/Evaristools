import React, { useState, useRef } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const WatermarkPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<string>('text');
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENCIAL');
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(30);
  const [watermarkPosition, setWatermarkPosition] = useState<string>('center');
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Función para manejar la selección de archivo PDF
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

  // Función para manejar la selección de imagen para la marca de agua
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        setWatermarkImage(null);
      } else {
        setWatermarkImage(file);
        setError(null);
      }
    }
  };

  // Función para añadir marca de agua al PDF
  const addWatermark = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF');
      return;
    }

    if (watermarkType === 'image' && !watermarkImage) {
      setError('Por favor, seleccione una imagen para la marca de agua');
      return;
    }

    if (watermarkType === 'text' && !watermarkText.trim()) {
      setError('Por favor, ingrese un texto para la marca de agua');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('watermarkType', watermarkType);
      formData.append('watermarkPosition', watermarkPosition);
      formData.append('watermarkOpacity', watermarkOpacity.toString());
      formData.append('watermarkRotation', watermarkRotation.toString());
      
      if (watermarkType === 'text') {
        formData.append('watermarkText', watermarkText);
      } else if (watermarkImage) {
        formData.append('watermarkImage', watermarkImage);
      }
      
      // Enviar datos al servidor
      const response = await fetch(`${config.apiUrl}/watermark-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Si el servidor responde con un error, obtener el mensaje
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
      
      // Obtener el PDF con marca de agua
      const blob = await response.blob();
      const filename = `watermark_${selectedFile.name}`;
      
      // Descargar el archivo
      saveAs(blob, filename);
      
      setSuccess('Marca de agua añadida correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al añadir marca de agua:', err);
      setError((err as Error).message || 'Ocurrió un error al añadir la marca de agua al PDF');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Marca de agua en PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Añade marcas de agua de texto o imagen a tus documentos PDF. Personaliza la opacidad, posición y rotación.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para añadir marca de agua</h3>
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
              Selecciona un archivo PDF para añadir marca de agua
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
                  Tipo de marca de agua:
                </h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="text"
                      checked={watermarkType === 'text'}
                      onChange={() => setWatermarkType('text')}
                    />
                    <span className="ml-2 text-sm text-[#374151]">Texto</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="image"
                      checked={watermarkType === 'image'}
                      onChange={() => setWatermarkType('image')}
                    />
                    <span className="ml-2 text-sm text-[#374151]">Imagen</span>
                  </label>
                </div>
              </div>

              {watermarkType === 'text' ? (
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Texto de la marca de agua:
                  </h4>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Ej: CONFIDENCIAL, BORRADOR, etc."
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Imagen para la marca de agua:
                  </h4>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full bg-[#f9fafb] border border-dashed border-[#d1d5db] rounded-lg py-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[#f3f4f6] transition-colors"
                  >
                    <svg className="w-6 h-6 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="mt-1 text-sm text-[#6b7280]">
                      {watermarkImage ? watermarkImage.name : 'Seleccionar imagen'}
                    </span>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    ref={imageInputRef}
                  />
                </div>
              )}

              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Opacidad: {watermarkOpacity}%
                  </h4>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Rotación: {watermarkRotation}°
                  </h4>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Posición de la marca de agua:
                </h4>
                <select
                  value={watermarkPosition}
                  onChange={(e) => setWatermarkPosition(e.target.value)}
                  className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="center">Centro</option>
                  <option value="top-left">Superior izquierda</option>
                  <option value="top-right">Superior derecha</option>
                  <option value="bottom-left">Inferior izquierda</option>
                  <option value="bottom-right">Inferior derecha</option>
                  <option value="tile">Mosaico (repetir)</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={addWatermark}
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
                  ) : 'Añadir marca de agua'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funcionan las marcas de agua en PDF?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            Las marcas de agua son elementos visuales sutiles que se superponen al contenido del documento
            para indicar su estado, origen o confidencialidad. El proceso funciona así:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Selección de contenido:</span> Eliges si la marca de agua 
              será un texto o una imagen personalizada.
            </li>
            <li>
              <span className="font-medium">Personalización:</span> Ajustas los parámetros de la marca de agua,
              como opacidad, rotación y posición en el documento.
            </li>
            <li>
              <span className="font-medium">Aplicación:</span> La marca de agua se integra en todas las páginas
              del documento PDF, manteniendo la legibilidad del contenido original.
            </li>
            <li>
              <span className="font-medium">Finalización:</span> Se genera un nuevo documento PDF con la marca de agua
              aplicada, listo para ser compartido o archivado con identificación visual clara.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default WatermarkPdf; 