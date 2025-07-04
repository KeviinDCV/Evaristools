import React, { useState, useRef } from 'react';
import QRCode from 'qrcode-generator';
import { Link } from 'react-router-dom';

const QrGenerator: React.FC = () => {
  const [text, setText] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Configuración fija usando nuestro sistema de diseño
  const QR_CONFIG = {
    size: 1024, // Muy alta resolución para mejor calidad
    exportSize: 512, // Tamaño final de exportación
    errorLevel: 'H' as const, // Nivel alto para permitir logo más grande
    foregroundColor: '#3730a3', // Color primary de nuestro sistema de diseño
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
    <div className="flex flex-col max-w-[960px] mx-auto space-y-6">
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Generador de QR Institucional</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Genera códigos QR personalizados con el logo institucional. Simplemente ingresa el texto o URL y obtén un código QR de alta calidad.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo - Configuración */}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Configuración del QR
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Texto del QR */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Texto o URL
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ingresa el texto o URL para el código QR..."
                className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none transition-colors"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Puede ser texto, URL, número de teléfono, email, etc.
              </p>
            </div>

            {/* Información de configuración fija */}
            <div className="bg-accent/50 border border-accent rounded-lg p-4">
              <h4 className="text-sm font-semibold text-accent-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Configuración Institucional
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                  <span><strong className="text-foreground">Color:</strong> Primary institucional (#3730a3)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span><strong className="text-foreground">Resolución:</strong> Ultra alta calidad (512x512px)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <span><strong className="text-foreground">Logo:</strong> Incluido automáticamente con máxima nitidez</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0"></div>
                  <span><strong className="text-foreground">Corrección de errores:</strong> Nivel alto (30%)</span>
                </li>
              </ul>
            </div>

            {/* Botón de generar */}
            <button
              onClick={generateQR}
              disabled={!text.trim() || isGenerating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                !text.trim() || isGenerating
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Generar Código QR
                </>
              )}
            </button>
          </div>
        </div>

        {/* Panel derecho - Vista previa */}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Vista Previa del QR
            </h3>
            {qrDataUrl && (
              <button
                onClick={downloadQR}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
                    className="border border-border rounded-lg shadow-sm"
                    style={{ maxWidth: '300px', maxHeight: '300px', width: '100%' }}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 border-2 border-dashed border-muted rounded-lg flex items-center justify-center mb-4 bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                    </svg>
                    <p className="text-sm">El código QR aparecerá aquí</p>
                  </div>
                </div>
              )}

              {qrDataUrl && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Código QR generado con logo institucional
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Resolución: 512x512px • Formato: PNG
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Cómo usar el generador de QR?
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Este generador crea códigos QR personalizados con el logo institucional de forma automática:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">Ingresa el contenido</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Puede ser texto, URL, número de teléfono, email, etc.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">Genera el QR</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Haz clic en "Generar Código QR" para crear tu código personalizado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">Descarga</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa el botón para descargar el archivo PNG de alta calidad.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrGenerator;
