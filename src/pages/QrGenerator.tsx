import React, { useState, useRef, useEffect } from 'react';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode-generator';

const QrGenerator: React.FC = () => {
  const [text, setText] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Configuración fija (no modificable por el usuario)
  const QR_CONFIG = {
    size: 1024, // Muy alta resolución para mejor calidad
    exportSize: 512, // Tamaño final de exportación
    errorLevel: 'H' as const, // Nivel alto para permitir logo más grande
    foregroundColor: '#2a387f', // Color azul institucional
    backgroundColor: '#ffffff',
    includeLogo: true,
    logoSizeRatio: 0.18 // 18% del QR para mejor visibilidad
  };

  const generateQR = async () => {
    if (!text.trim()) {
      setError('Por favor ingresa un texto o URL para generar el código QR');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);

      // Crear el código QR
      const qr = QRCode(0, QR_CONFIG.errorLevel);
      qr.addData(text);
      qr.make();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Configurar el canvas con muy alta resolución para mejor calidad
      canvas.width = QR_CONFIG.size;
      canvas.height = QR_CONFIG.size;

      // Habilitar suavizado de alta calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Limpiar el canvas
      ctx.fillStyle = QR_CONFIG.backgroundColor;
      ctx.fillRect(0, 0, QR_CONFIG.size, QR_CONFIG.size);

      // Obtener el tamaño del módulo
      const moduleCount = qr.getModuleCount();
      const moduleSize = QR_CONFIG.size / moduleCount;

      // Dibujar el código QR con bordes suaves
      ctx.fillStyle = QR_CONFIG.foregroundColor;
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            // Usar fillRect con coordenadas precisas para evitar gaps
            const x = Math.floor(col * moduleSize);
            const y = Math.floor(row * moduleSize);
            const width = Math.ceil(moduleSize);
            const height = Math.ceil(moduleSize);
            ctx.fillRect(x, y, width, height);
          }
        }
      }

      // Agregar logo institucional con alta calidad
      if (QR_CONFIG.includeLogo) {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
          // Calcular el tamaño del logo (18% del QR para mejor visibilidad)
          const logoSize = QR_CONFIG.size * QR_CONFIG.logoSizeRatio;
          const logoX = (QR_CONFIG.size - logoSize) / 2;
          const logoY = (QR_CONFIG.size - logoSize) / 2;
          const padding = logoSize * 0.15; // 15% de padding alrededor del logo

          // Guardar el estado del contexto
          ctx.save();

          // Crear un fondo blanco con borde suave para el logo
          const bgRadius = logoSize / 2 + padding;
          ctx.fillStyle = QR_CONFIG.backgroundColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(QR_CONFIG.size / 2, QR_CONFIG.size / 2, bgRadius, 0, 2 * Math.PI);
          ctx.fill();

          // Resetear sombra
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          // Crear un clipping path circular para el logo
          ctx.beginPath();
          ctx.arc(QR_CONFIG.size / 2, QR_CONFIG.size / 2, logoSize / 2, 0, 2 * Math.PI);
          ctx.clip();

          // Habilitar suavizado de máxima calidad para el logo
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar el logo con alta calidad
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

          // Restaurar el estado del contexto
          ctx.restore();

          // Crear un canvas temporal para redimensionar a la resolución final
          const finalCanvas = document.createElement('canvas');
          const finalCtx = finalCanvas.getContext('2d');
          if (finalCtx) {
            finalCanvas.width = QR_CONFIG.exportSize;
            finalCanvas.height = QR_CONFIG.exportSize;

            // Habilitar suavizado para el redimensionado
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'high';

            // Redimensionar el QR de alta resolución al tamaño final
            finalCtx.drawImage(canvas, 0, 0, QR_CONFIG.size, QR_CONFIG.size,
                              0, 0, QR_CONFIG.exportSize, QR_CONFIG.exportSize);

            // Convertir a data URL con máxima calidad
            setQrDataUrl(finalCanvas.toDataURL('image/png', 1.0));
          } else {
            // Fallback: usar el canvas original
            setQrDataUrl(canvas.toDataURL('image/png', 1.0));
          }

          setSuccess('Código QR generado correctamente');
          setIsGenerating(false);
        };
        logo.onerror = () => {
          // Si no se puede cargar el logo, generar QR sin logo
          const finalCanvas = document.createElement('canvas');
          const finalCtx = finalCanvas.getContext('2d');
          if (finalCtx) {
            finalCanvas.width = QR_CONFIG.exportSize;
            finalCanvas.height = QR_CONFIG.exportSize;
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'high';
            finalCtx.drawImage(canvas, 0, 0, QR_CONFIG.size, QR_CONFIG.size,
                              0, 0, QR_CONFIG.exportSize, QR_CONFIG.exportSize);
            setQrDataUrl(finalCanvas.toDataURL('image/png', 1.0));
          } else {
            setQrDataUrl(canvas.toDataURL('image/png', 1.0));
          }
          setSuccess('Código QR generado correctamente (sin logo)');
          setIsGenerating(false);
        };
        logo.src = '/images/logo.png';
      } else {
        // Convertir a data URL sin logo con redimensionado
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCanvas.width = QR_CONFIG.exportSize;
          finalCanvas.height = QR_CONFIG.exportSize;
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(canvas, 0, 0, QR_CONFIG.size, QR_CONFIG.size,
                            0, 0, QR_CONFIG.exportSize, QR_CONFIG.exportSize);
          setQrDataUrl(finalCanvas.toDataURL('image/png', 1.0));
        } else {
          setQrDataUrl(canvas.toDataURL('image/png', 1.0));
        }
        setSuccess('Código QR generado correctamente');
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error generando QR:', error);
      setError('Error al generar el código QR: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;

    try {
      // Método directo usando el data URL (evita problemas con blobs)
      const link = document.createElement('a');
      link.download = `qr-code-institucional-${Date.now()}.png`;
      link.href = qrDataUrl;

      // Crear el evento de click de forma más compatible
      if (document.createEvent) {
        const event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        link.dispatchEvent(event);
      } else {
        link.click();
      }

      setSuccess('Código QR descargado correctamente');
    } catch (error) {
      console.error('Error descargando QR:', error);
      setError('Error al descargar el código QR');
    }
  };



  return (
    <div className="flex flex-col max-w-[960px] mx-auto">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Generador de QR Institucional</h1>
        <p className="text-[#5c728a] text-sm">
          Genera códigos QR personalizados con el logo institucional. Simplemente ingresa el texto o URL y obtén un código QR de alta calidad.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo - Configuración */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e5e7eb]">
            <h3 className="font-medium text-[#101418]">Configuración del QR</h3>
          </div>
          <div className="p-6 space-y-4">
            {/* Texto del QR */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Texto o URL
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ingresa el texto o URL para el código QR..."
                className="w-full p-3 border border-[#e5e7eb] rounded-md text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
              />
              <p className="text-xs text-[#6b7280] mt-1">
                Puede ser texto, URL, número de teléfono, email, etc.
              </p>
            </div>

            {/* Información de configuración fija */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Configuración Institucional</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Color:</strong> Azul institucional (#2a387f)</li>
                <li>• <strong>Resolución:</strong> Ultra alta calidad (512x512px)</li>
                <li>• <strong>Logo:</strong> Incluido automáticamente con máxima nitidez</li>
                <li>• <strong>Corrección de errores:</strong> Nivel alto (30%)</li>
              </ul>
            </div>

            {/* Botón de generar */}
            <button
              onClick={generateQR}
              disabled={!text.trim() || isGenerating}
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                !text.trim() || isGenerating
                  ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? 'Generando...' : 'Generar Código QR'}
            </button>
          </div>
        </div>

        {/* Panel derecho - Vista previa */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e5e7eb] flex justify-between items-center">
            <h3 className="font-medium text-[#101418]">Vista Previa del QR</h3>
            {qrDataUrl && (
              <button
                onClick={downloadQR}
                className="py-1 px-3 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Descargar
              </button>
            )}
          </div>
          <div className="p-6">
            {/* Canvas oculto para generar el QR */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="flex flex-col items-center">
              {/* Vista previa del QR */}
              {qrDataUrl ? (
                <div className="mb-4">
                  <img
                    src={qrDataUrl}
                    alt="Código QR generado"
                    className="border border-[#e5e7eb] rounded-lg shadow-sm"
                    style={{ maxWidth: '300px', maxHeight: '300px', width: '100%' }}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 border-2 border-dashed border-[#d1d5db] rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center text-[#9ca3af]">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                    </svg>
                    <p className="text-sm">El código QR aparecerá aquí</p>
                  </div>
                </div>
              )}

              {qrDataUrl && (
                <div className="text-center">
                  <p className="text-sm text-[#6b7280] mb-2">
                    Código QR generado con logo institucional
                  </p>
                  <p className="text-xs text-[#9ca3af]">
                    Resolución: 512x512px • Formato: PNG
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas oculto para generar el QR */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Información adicional */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo usar el generador de QR?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            Este generador crea códigos QR personalizados con el logo institucional de forma automática:
          </p>

          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Ingresa el contenido:</span> Puede ser texto, URL, número de teléfono, email, etc.
            </li>
            <li>
              <span className="font-medium">Genera el QR:</span> Haz clic en "Generar Código QR" para crear tu código personalizado.
            </li>
            <li>
              <span className="font-medium">Descarga o copia:</span> Usa los botones para descargar el archivo PNG o copiarlo al portapapeles.
            </li>
          </ol>


        </div>
      </div>
    </div>
  );
};

export default QrGenerator;
