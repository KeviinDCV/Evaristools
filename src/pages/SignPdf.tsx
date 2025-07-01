import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import { saveAs } from 'file-saver';

const SignPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signatureType, setSignatureType] = useState<string>('draw');
  const [signatureName, setSignatureName] = useState<string>('');
  const [signaturePosition, setSignaturePosition] = useState<string>('bottom-right');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverReady, setServerReady] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Verificar conexión al servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/system-info`);
        if (!response.ok) {
          setServerReady(false);
        }
      } catch (err) {
        console.error('Error al verificar el servidor:', err);
        setServerReady(false);
      }
    };
    
    checkServer();
  }, []);

  // Inicializar el canvas cuando cambia el tipo de firma
  useEffect(() => {
    // Inicializar el canvas solo si estamos en modo dibujo
    if (signatureType === 'draw') {
      initCanvas();
    }
  }, [signatureType]);

  // Función para inicializar el canvas
  const initCanvas = () => {
    // Esperar a que el DOM se actualice
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Configuración inicial del canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Limpiar el canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Estilos de dibujo
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Variables para seguir la posición del cursor
      let drawing = false;
      let lastX = 0;
      let lastY = 0;
      
      // Ajustar el tamaño del canvas
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          // Establecer el tamaño físico del canvas igual a su tamaño en pantalla
          const rect = parent.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = 150;
          
          // Restablecer los estilos ya que se pierden al cambiar el tamaño
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      };
      
      // Configurar el tamaño inicial
      resizeCanvas();
      
      // Limpiar todos los event listeners existentes
      const newCanvas = canvas.cloneNode(true) as HTMLCanvasElement;
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(newCanvas, canvas);
        canvasRef.current = newCanvas;
      }
      
      // Seleccionar el canvas actualizado
      const freshCanvas = canvasRef.current;
      if (!freshCanvas) return;
      
      // Funciones de dibujo
      const startDrawing = (e: MouseEvent | TouchEvent) => {
        drawing = true;
        setIsDrawing(true);
        
        const pos = getPosition(e, freshCanvas);
        lastX = pos.x;
        lastY = pos.y;
        
        // Dibujar un punto en la posición inicial
        const freshCtx = freshCanvas.getContext('2d');
        if (freshCtx) {
          freshCtx.beginPath();
          freshCtx.arc(lastX, lastY, 1.5, 0, Math.PI * 2);
          freshCtx.fillStyle = '#000000';
          freshCtx.fill();
        }
      };
      
      const draw = (e: MouseEvent | TouchEvent) => {
        if (!drawing) return;
        e.preventDefault();
        
        const freshCtx = freshCanvas.getContext('2d');
        if (!freshCtx) return;
        
        const pos = getPosition(e, freshCanvas);
        
        freshCtx.beginPath();
        freshCtx.moveTo(lastX, lastY);
        freshCtx.lineTo(pos.x, pos.y);
        freshCtx.stroke();
        
        lastX = pos.x;
        lastY = pos.y;
      };
      
      const stopDrawing = () => {
        drawing = false;
        setIsDrawing(false);
      };
      
      // Función para obtener las coordenadas correctas
      const getPosition = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        
        // Evento táctil
        if ('touches' in e) {
          if (e.touches.length === 0) return { x: 0, y: 0 }; // En caso de touchend sin contactos
          const touch = e.touches[0];
          return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
          };
        } 
        // Evento de mouse
        else if ('clientX' in e) {
          return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
        }
        
        return { x: 0, y: 0 };
      };
      
      // Registrar eventos - mouse
      freshCanvas.addEventListener('mousedown', startDrawing);
      freshCanvas.addEventListener('mousemove', draw);
      window.addEventListener('mouseup', stopDrawing); // Usar window para capturar el evento aunque el mouse salga del canvas
      
      // Registrar eventos - touch
      freshCanvas.addEventListener('touchstart', startDrawing);
      freshCanvas.addEventListener('touchmove', draw);
      freshCanvas.addEventListener('touchend', stopDrawing);
      freshCanvas.addEventListener('touchcancel', stopDrawing);
      
      // Prevenir gestos táctiles predeterminados
      freshCanvas.style.touchAction = 'none';
      
      // Limpiar eventos cuando el componente se desmonte
      return () => {
        window.removeEventListener('mouseup', stopDrawing);
        // Los otros event listeners se eliminarán cuando se clone el canvas
      };
    }, 0);
  };

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
        
        // Inicializar canvas si estamos en modo dibujo
        if (signatureType === 'draw') {
          // Pequeño retraso para asegurar que el DOM se ha actualizado
          setTimeout(() => {
            initCanvas();
          }, 100);
        }
      }
    }
  };

  // Función para limpiar el canvas de firma
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Función para convertir el canvas a una imagen
  const canvasToBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('No se pudo acceder al canvas de firma'));
        return;
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No se pudo convertir la firma a imagen'));
        }
      }, 'image/png');
    });
  };

  // Función para verificar si el canvas está vacío
  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    // Verificar si hay algún píxel no transparente
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] > 0) return false;
    }
    
    return true;
  };

  // Función para firmar el PDF
  const signPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para firmar');
      return;
    }

    if (!serverReady) {
      setError('El servidor de conversión no está disponible. Por favor, asegúrese de que el servidor esté en ejecución.');
      return;
    }

    if (signatureType === 'draw' && isCanvasEmpty()) {
      setError('Por favor, dibuje su firma');
      return;
    } else if (signatureType === 'text' && !signatureName.trim()) {
      setError('Por favor, ingrese su nombre para la firma');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('signatureType', signatureType);
      formData.append('signaturePosition', signaturePosition);
      
      if (signatureType === 'text') {
        formData.append('signatureName', signatureName);
      } else {
        // Para firma dibujada, convertir canvas a blob
        try {
          const blob = await canvasToBlob();
          formData.append('signatureImage', blob, 'signature.png');
        } catch (e) {
          setError('Error al procesar la imagen de firma');
          setIsProcessing(false);
          return;
        }
      }
      
      // Enviar datos al servidor
      const response = await fetch(`${config.apiUrl}/sign-pdf`, {
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
      
      // Obtener el PDF firmado
      const blob = await response.blob();
      const filename = `firmado_${selectedFile.name}`;
      
      // Descargar el archivo
      saveAs(blob, filename);
      
      setSuccess('PDF firmado correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al firmar el PDF:', err);
      setError((err as Error).message || 'Ocurrió un error al firmar el PDF');
      setIsProcessing(false);
    }
  };

  // Inicializar canvas al montar el componente
  useEffect(() => {
    // Inicializar el canvas si estamos en modo dibujo
    if (signatureType === 'draw') {
      initCanvas();
    }
  }, []); // Solo se ejecuta al montar el componente

  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Firmar PDF</h1>
        <p className="text-[#5c728a] text-sm">
          Añade firmas digitales a tus documentos PDF. Firma con tu nombre o dibuja tu firma.
        </p>
        
        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mt-2">
            El servidor de conversión no está disponible. Por favor, asegúrese de que el servidor esté en ejecución.
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
          <h3 className="font-medium text-[#101418]">Seleccionar archivo PDF para firmar</h3>
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
              Selecciona un archivo PDF para añadir tu firma
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
                  Tipo de firma:
                </h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="draw"
                      checked={signatureType === 'draw'}
                      onChange={() => setSignatureType('draw')}
                    />
                    <span className="ml-2 text-sm text-[#374151]">Dibujar firma</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      value="text"
                      checked={signatureType === 'text'}
                      onChange={() => setSignatureType('text')}
                    />
                    <span className="ml-2 text-sm text-[#374151]">Firma de texto</span>
                  </label>
                </div>
              </div>

              {signatureType === 'draw' ? (
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Dibuja tu firma:
                  </h4>
                  <div className="border border-[#e5e7eb] rounded-lg p-2 bg-white">
                    <div className="signature-container" style={{ touchAction: 'none' }}>
                      <canvas
                        ref={canvasRef}
                        id="signature-canvas"
                        className="bg-white border border-dashed border-gray-300 rounded-md cursor-crosshair"
                        style={{ 
                          touchAction: 'none', 
                          width: '100%', 
                          height: '150px', 
                          backgroundColor: '#FFFFFF',
                          border: '1px dashed #cbd5e1'
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={clearSignature}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors"
                      >
                        Limpiar
                      </button>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${isDrawing ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
                        <p className="text-xs text-[#6b7280]">
                          {isDrawing ? 'Dibujando...' : 'Haz clic y arrastra para dibujar tu firma'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-[#374151] mb-2">
                    Introduce tu nombre para la firma:
                  </h4>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#374151] mb-2">
                  Posición de la firma:
                </h4>
                <select
                  value={signaturePosition}
                  onChange={(e) => setSignaturePosition(e.target.value)}
                  className="w-full rounded-md border border-[#e5e7eb] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="bottom-right">Inferior derecha</option>
                  <option value="bottom-left">Inferior izquierda</option>
                  <option value="top-right">Superior derecha</option>
                  <option value="top-left">Superior izquierda</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={signPdf}
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
                  ) : 'Firmar PDF'}
                </button>
                {!serverReady && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    No se puede firmar el PDF porque el servidor no está disponible.
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
          <h3 className="font-medium text-[#101418]">¿Cómo funciona la herramienta de firma?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            Esta herramienta te permite añadir una firma visual a tus documentos PDF de dos formas:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Firma dibujada:</span> Dibuja directamente tu firma con el ratón o pantalla táctil.
              Es ideal para firmas personalizadas que deseas añadir a tus documentos.
            </li>
            <li>
              <span className="font-medium">Firma de texto:</span> Escribe tu nombre y el sistema lo convertirá en una 
              firma estilizada. Esta opción es más sencilla y clara.
            </li>
          </ol>
          
          <div className="bg-amber-50 border border-amber-100 rounded-md p-3 text-amber-800 text-sm">
            <p><strong>Importante:</strong> Esta herramienta añade una representación visual de la firma, pero no
            aplica una firma digital criptográfica que pueda verificarse electrónicamente. Para firmas con validez
            legal electrónica, se recomienda usar certificados digitales oficiales.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignPdf; 