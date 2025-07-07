import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Firmar PDF</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Añade firmas digitales a tus documentos PDF. Firma con tu nombre o dibuja tu firma personalizada.
        </p>

        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">El servidor de conversión no está disponible. Por favor, asegúrese de que el servidor esté en ejecución.</span>
            </div>
          </div>
        )}
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

      {/* Upload Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Seleccionar archivo PDF para firmar
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 border-border hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-2">
                <span className="font-medium">Haz clic para seleccionar</span> un archivo PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona un archivo PDF para añadir tu firma digital
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />

          {selectedFile && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Archivo seleccionado:
                </h4>
                <div className="border border-border rounded-lg p-3 flex items-center bg-background">
                  <svg className="w-6 h-6 mr-3 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h6"></path>
                    <path d="M9 11h6"></path>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Configuración de firma:
                </h4>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Tipo de firma:</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                        value="draw"
                        checked={signatureType === 'draw'}
                        onChange={() => setSignatureType('draw')}
                      />
                      <span className="ml-2 text-sm text-foreground">Dibujar firma</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                        value="text"
                        checked={signatureType === 'text'}
                        onChange={() => setSignatureType('text')}
                      />
                      <span className="ml-2 text-sm text-foreground">Firma de texto</span>
                    </label>
                  </div>
                </div>

                {signatureType === 'draw' ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">
                      Dibuja tu firma:
                    </h4>
                    <div className="border border-border rounded-lg p-4 bg-background">
                      <div className="signature-container" style={{ touchAction: 'none' }}>
                        <canvas
                          ref={canvasRef}
                          id="signature-canvas"
                          className="bg-background border border-dashed border-border rounded-lg cursor-crosshair w-full"
                          style={{
                            touchAction: 'none',
                            width: '100%',
                            height: '150px',
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px dashed hsl(var(--border))'
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={clearSignature}
                          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg bg-background hover:bg-muted transition-colors"
                        >
                          Limpiar
                        </button>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${isDrawing ? 'bg-green-500' : 'bg-muted'} mr-2`}></div>
                          <p className="text-xs text-muted-foreground">
                            {isDrawing ? 'Dibujando...' : 'Haz clic y arrastra para dibujar tu firma'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">
                      Introduce tu nombre para la firma:
                    </h4>
                    <input
                      type="text"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Posición de la firma:
                  </h4>
                  <select
                    value={signaturePosition}
                    onChange={(e) => setSignaturePosition(e.target.value)}
                    className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                  >
                    <option value="bottom-right">Inferior derecha</option>
                    <option value="bottom-left">Inferior izquierda</option>
                    <option value="top-right">Superior derecha</option>
                    <option value="top-left">Superior izquierda</option>
                  </select>
                </div>

                {/* Process Button */}
                <div className="space-y-4">
                  <button
                    onClick={signPdf}
                    disabled={isProcessing || !serverReady}
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      isProcessing || !serverReady
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Firmar PDF
                      </>
                    )}
                  </button>

                  {!serverReady && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">No se puede firmar el PDF porque el servidor no está disponible.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Cómo funciona la herramienta de firma?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Esta herramienta te permite añadir una firma visual a tus documentos PDF de dos formas diferentes:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Firma dibujada</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dibuja directamente tu firma con el ratón o pantalla táctil para una firma personalizada.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Firma de texto</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escribe tu nombre y el sistema lo convertirá en una firma estilizada y clara.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Posicionamiento</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Elige dónde colocar tu firma en el documento: esquinas superiores o inferiores.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Aplicación</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    La firma se añade al PDF manteniendo la calidad y formato del documento original.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800 text-sm mb-1">Importante sobre las firmas</h4>
                <p className="text-sm text-red-700">
                  Esta herramienta añade una representación visual de la firma, pero no aplica una firma digital criptográfica.
                  Para firmas con validez legal electrónica, se recomienda usar certificados digitales oficiales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignPdf; 
