import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

const PdfCompress: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<string>('medium');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverReady, setServerReady] = useState<boolean>(true);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  
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
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setOriginalSize(file.size);
        setError(null);
        setSuccess(null);
        setCompressedSize(0);
      }
    }
  };

  // Función para comprimir PDF usando el servidor
  const compressPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para comprimir');
      return;
    }

    if (!serverReady) {
      return; // No hay necesidad de establecer error, ya se muestra en la interfaz
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('compressionLevel', compressionLevel);
      
      // Enviar el archivo al servidor para comprimirlo
      const response = await fetch(`${config.apiUrl}/compress-pdf`, {
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
      
      // Obtener el tamaño del archivo comprimido
      const blob = await response.blob();
      setCompressedSize(blob.size);
      
      // Calcular el porcentaje de reducción
      const savings = ((originalSize - blob.size) / originalSize * 100).toFixed(1);
      
      // Descargar el archivo PDF comprimido
      const filename = `comprimido_${selectedFile.name}`;
      saveAs(blob, filename);
      
      setSuccess(`PDF comprimido correctamente. Reducción de tamaño: ${savings}%`);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al comprimir PDF:', err);
      setError(`Error al comprimir el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

  // Función fallback para comprimir PDF en el cliente (muy limitada)
  const compressPdfClientSide = async () => {
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF para comprimir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Cargar el PDF
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);

      // Crear un nuevo documento para la versión comprimida
      const compressedPdf = await PDFDocument.create();
      
      // Copiar todas las páginas
      const pages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => compressedPdf.addPage(page));

      // Opciones de compresión según el nivel seleccionado
      const compressionOptions: any = {
        // Base de opciones comunes
        useObjectStreams: true,
      };

      // Ajustar opciones según el nivel de compresión seleccionado
      if (compressionLevel === 'high') {
        compressionOptions.compress = true;
        compressionOptions.objectsPerTick = 100;
        compressionOptions.updateFieldAppearances = false;
      } else if (compressionLevel === 'medium') {
        compressionOptions.compress = true;
        compressionOptions.objectsPerTick = 50;
        compressionOptions.updateFieldAppearances = true;
      } else { // low
        compressionOptions.compress = false;
        compressionOptions.updateFieldAppearances = true;
      }

      // Guardar el PDF comprimido
      const compressedPdfBytes = await compressedPdf.save(compressionOptions);
      setCompressedSize(compressedPdfBytes.length);
      
      // Descargar el PDF comprimido
      const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, `comprimido_${selectedFile.name}`);
      
      const savings = ((originalSize - compressedPdfBytes.length) / originalSize * 100).toFixed(1);
      
      setSuccess(`PDF comprimido correctamente. Reducción de tamaño: ${savings}%`);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al comprimir PDF:', err);
      setError(`Error al comprimir el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Comprimir PDF</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Reduce el tamaño de archivos PDF manteniendo la calidad visual.
          Útil para enviar por correo electrónico o almacenar archivos grandes.
        </p>

        {!serverReady && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">El servidor de conversión no está disponible. Se usará el procesamiento local con resultados limitados.</span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Seleccionar archivo PDF para comprimir
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              !serverReady
                ? 'border-muted bg-muted/20 cursor-not-allowed opacity-60'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-2">
                <span className="font-medium">Haz clic para seleccionar</span> un archivo PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona un archivo PDF para reducir su tamaño
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={!serverReady}
          />

          {selectedFile && (
            <div className="space-y-4">
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

              {/* Compression Settings */}
              <div className="space-y-2">
                <label htmlFor="compression-level" className="block text-sm font-medium text-foreground">
                  Nivel de compresión:
                </label>
                <select
                  id="compression-level"
                  value={compressionLevel}
                  onChange={(e) => setCompressionLevel(e.target.value)}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                >
                  <option value="low">Baja (mejor calidad)</option>
                  <option value="medium">Media (equilibrado)</option>
                  <option value="high">Alta (menor tamaño)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Selecciona el nivel de compresión según tus necesidades. Mayor compresión puede reducir la calidad visual.
                </p>
              </div>

              {/* Process Button */}
              <div className="space-y-4">
                <button
                  onClick={serverReady ? compressPdf : compressPdfClientSide}
                  disabled={isProcessing}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    isProcessing
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Comprimir PDF
                    </>
                  )}
                </button>

                {/* Compression Statistics */}
                {compressedSize > 0 && originalSize > 0 && (
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Estadísticas de compresión
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Tamaño original:</span>
                        <span className="text-xs font-medium text-foreground">{(originalSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Tamaño comprimido:</span>
                        <span className="text-xs font-medium text-foreground">{(compressedSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Reducción:</span>
                        <span className="text-xs font-medium text-green-600">{((originalSize - compressedSize) / originalSize * 100).toFixed(1)}%</span>
                      </div>

                      <div className="mt-3 bg-muted h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((originalSize - compressedSize) / originalSize * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!serverReady && (
                  <p className="text-xs text-muted-foreground text-center">
                    La compresión en el navegador es limitada. Para mejores resultados, utilice el servidor.
                  </p>
                )}
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
            ¿Cómo funciona la compresión de PDFs?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            La compresión de archivos PDF es un proceso que reduce el tamaño del documento manteniendo su contenido y funcionalidad.
            El proceso funciona así:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Análisis del documento</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se analiza la estructura interna del PDF para identificar elementos optimizables.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Optimización de imágenes</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Las imágenes se recomprimen manteniendo un balance entre calidad y peso.
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
                  <h4 className="font-medium text-foreground text-sm">Compresión de estructura</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se optimiza la estructura interna usando flujos de objetos eficientes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Eliminación de redundancias</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se eliminan datos duplicados según el nivel de compresión seleccionado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-800 text-sm">Consejo importante</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Para archivos con muchas imágenes, usa el nivel alto de compresión para obtener una mayor reducción de tamaño.
                  Para documentos con elementos críticos de diseño, usa el nivel bajo para preservar la calidad visual.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfCompress; 
