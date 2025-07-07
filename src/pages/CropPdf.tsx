import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import { saveAs } from 'file-saver';

const CropPdf: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [cropMode, setCropMode] = useState<'auto' | 'manual'>('auto');
  const [marginTop, setMarginTop] = useState(20);
  const [marginBottom, setMarginBottom] = useState(20);
  const [marginLeft, setMarginLeft] = useState(20);
  const [marginRight, setMarginRight] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor, selecciona un archivo PDF válido.');
        return;
      }
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  const cropPdf = async () => {
    if (!selectedFile) {
      setError('Por favor, selecciona un archivo PDF primero.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', cropMode);
      
      if (cropMode === 'manual') {
        formData.append('marginTop', marginTop.toString());
        formData.append('marginBottom', marginBottom.toString());
        formData.append('marginLeft', marginLeft.toString());
        formData.append('marginRight', marginRight.toString());
      }

      const response = await fetch(`${config.API_BASE_URL}/crop-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al recortar el PDF');
      }

      const blob = await response.blob();
      const fileName = selectedFile.name.replace('.pdf', '_recortado.pdf');
      saveAs(blob, fileName);
      
      setSuccess('PDF recortado exitosamente y descargado.');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar el archivo');
    } finally {
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Recortar PDF</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Elimina los márgenes de tus documentos PDF o selecciona un área específica para recortar. Optimiza el espacio y mejora la presentación de tus documentos.
        </p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m-6-4h6m-6-4h6m-6-4h6m-6-4h6" />
            </svg>
            Seleccionar archivo PDF para recortar
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
                Selecciona un archivo PDF para recortar sus márgenes
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

              {/* Crop Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m-6-4h6m-6-4h6m-6-4h6m-6-4h6" />
                  </svg>
                  Configuración de recorte:
                </h4>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Modo de recorte:</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                        value="auto"
                        checked={cropMode === 'auto'}
                        onChange={() => setCropMode('auto')}
                      />
                      <span className="ml-2 text-sm text-foreground">Automático</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                        value="manual"
                        checked={cropMode === 'manual'}
                        onChange={() => setCropMode('manual')}
                      />
                      <span className="ml-2 text-sm text-foreground">Manual</span>
                    </label>
                  </div>
                </div>

                {cropMode === 'manual' && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Ajusta los márgenes que deseas eliminar (en puntos):
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Margen superior: {marginTop}pt
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={marginTop}
                          onChange={(e) => setMarginTop(parseInt(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Margen inferior: {marginBottom}pt
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={marginBottom}
                          onChange={(e) => setMarginBottom(parseInt(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Margen izquierdo: {marginLeft}pt
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={marginLeft}
                          onChange={(e) => setMarginLeft(parseInt(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Margen derecho: {marginRight}pt
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={marginRight}
                          onChange={(e) => setMarginRight(parseInt(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Process Button */}
                <div className="space-y-4">
                  <button
                    onClick={cropPdf}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m-6-4h6m-6-4h6m-6-4h6m-6-4h6" />
                        </svg>
                        Recortar PDF
                      </>
                    )}
                  </button>
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
            ¿Cómo funciona el recorte de PDF?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            El recorte de PDF te permite eliminar márgenes innecesarios y optimizar el espacio de tus documentos.
            Puedes usar el modo automático para detectar y eliminar márgenes automáticamente, o el modo manual para un control preciso.
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
                    La herramienta analiza el PDF para identificar áreas de contenido y márgenes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Selección del modo</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Elige entre recorte automático o manual para controlar exactamente qué se elimina.
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
                  <h4 className="font-medium text-foreground text-sm">Configuración de márgenes</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    En modo manual, ajusta los márgenes superior, inferior, izquierdo y derecho.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Procesamiento</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se genera un nuevo PDF optimizado con los márgenes recortados según tu configuración.
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
                <h4 className="font-medium text-red-800 text-sm mb-1">Importante sobre el recorte</h4>
                <p className="text-sm text-red-700">
                  El recorte elimina permanentemente las áreas seleccionadas del documento.
                  Asegúrate de que no hay contenido importante en los márgenes antes de procesar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropPdf;
