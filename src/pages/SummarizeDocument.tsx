import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaFileAlt } from 'react-icons/fa';
import { AiOutlineFileSearch } from 'react-icons/ai';
import { IoDocumentText } from 'react-icons/io5';
import { BsArrowLeft, BsCloudDownload } from 'react-icons/bs';
import { IoSend } from 'react-icons/io5';
import LoadingSpinner from '../components/common/LoadingSpinner';
import config from '../config';

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
}

const SummarizeDocument: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [fullDocumentText, setFullDocumentText] = useState<string>('');
  const [originalFilename, setOriginalFilename] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Estados para el chat
  const [chatActive, setChatActive] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Scroll al final de la conversación cuando hay nuevos mensajes
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effect para hacer scroll cuando se añaden nuevos mensajes
  React.useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  // Handlers para drag & drop
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      handleFileValidation(selectedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleFileValidation(selectedFile);
    }
  };

  const handleFileValidation = (selectedFile: File) => {
    // Resetear estados
    setError('');
    setSummary('');
    setOriginalFilename('');
    setSuccess(null);

    // Validar extensiones
    const validExtensions = ['.pdf', '.txt', '.md', '.html'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError(`Formato no soportado. Por favor, sube un archivo ${validExtensions.join(', ')}`);
      return;
    }

    // Validar tamaño (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setSummary('');
    setProcessingStatus('Procesando documento...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProcessingStatus('Enviando documento al servidor...');

      const response = await fetch(`${config.apiUrl}/summarize-document`, {
        method: 'POST',
        body: formData,
      });

      setProcessingStatus('Analizando documento...');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el documento');
      }

      setProcessingStatus('¡Resumen generado correctamente!');
      setSummary(data.summary);
      setFullDocumentText(data.full_text);
      setOriginalFilename(data.original_filename);
      setSuccess('Documento procesado correctamente');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setSummary('');
    setError('');
    setSuccess(null);
    setOriginalFilename('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    // Reiniciar también el chat
    setChatActive(false);
    setChatMessages([]);
    setCurrentQuestion('');
    setChatError('');
  };
  
  // Función para manejar el envío de preguntas al chat
  const handleSendQuestion = async () => {
    if (!currentQuestion.trim() || isChatLoading) return;
    
    // Añadir la pregunta del usuario al chat
    const userMessage: ChatMessage = {
      type: 'user',
      content: currentQuestion
    };
    
    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setCurrentQuestion('');
    setIsChatLoading(true);
    setChatError('');
    
    try {
      // Enviar la pregunta y el contexto al servidor
      const response = await fetch(`${config.apiUrl}/document-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: userMessage.content,
          context: fullDocumentText
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la pregunta');
      }
      
      // Añadir la respuesta del asistente
      const assistantMessage: ChatMessage = {
        type: 'assistant',
        content: data.answer
      };
      
      setChatMessages(prevMessages => [...prevMessages, assistantMessage]);
      
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Error al procesar la pregunta');
    } finally {
      setIsChatLoading(false);
      // Focus de nuevo en el input
      chatInputRef.current?.focus();
    }
  };

  // Manejar pulsación de Enter para enviar pregunta
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Resumir Documento con IA</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Utiliza inteligencia artificial avanzada para generar resúmenes concisos y precisos de tus documentos.
          Extrae automáticamente los puntos clave y la información más relevante.
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

      {success && !loading && !summary && (
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
      {!summary && (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Seleccionar documento para resumir
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              } ${error ? 'border-destructive' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleChange}
                accept=".pdf,.txt,.md,.html"
              />

              {!file ? (
                <>
                  <div className="text-muted-foreground mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground mb-2">
                      <span className="font-medium">Haz clic para seleccionar</span> o arrastra y suelta tu documento
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, TXT, MD, HTML (máximo 10MB)
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <div className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
                    <FaFileAlt className="h-6 w-6 text-primary" />
                    <span className="text-foreground text-sm font-medium truncate max-w-[250px]">
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetFile();
                      }}
                      className="text-destructive hover:text-destructive/80 transition-colors p-1"
                      title="Eliminar archivo"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Process Button */}
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Procesando documento...</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{processingStatus}</p>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!file}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    !file
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generar Resumen con IA
                </button>
              )}
            </div>

            {/* Information Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800 text-sm">Información de la herramienta</h4>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Formatos:</strong> PDF, TXT, MD, HTML</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Tamaño máximo:</strong> 10MB por archivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span><strong>IA avanzada:</strong> Chat interactivo incluido</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card border border-border rounded-lg overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Resumen generado
            </h3>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              {originalFilename}
            </span>
          </div>

          <div className="p-6">
            {!chatActive ? (
              <>
                <div className="border border-border rounded-lg p-6 bg-background">
                  <div className="prose prose-slate max-w-none">
                    {summary.split('\n').map((paragraph, i) => (
                      paragraph.trim() ? (
                        <p key={i} className="mb-4 text-foreground leading-relaxed">
                          {paragraph}
                        </p>
                      ) : <div key={i} className="h-4"></div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-3">
                  <button
                    onClick={resetFile}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg bg-background text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Procesar otro documento
                  </button>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        const element = document.createElement('a');
                        const file = new Blob([summary], { type: 'text/plain' });
                        element.href = URL.createObjectURL(file);
                        element.download = `Resumen_${originalFilename}.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar resumen
                    </button>

                    <button
                      onClick={() => setChatActive(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Chat con el documento
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setChatActive(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg bg-background text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al resumen
                  </button>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat con el documento
                  </h3>
                </div>

                {/* Chat Area */}
                <div className="grow border border-border rounded-lg bg-muted/20 p-4 overflow-y-auto mb-4">
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-700">
                          Puedes hacerme preguntas sobre el documento y te responderé basándome en su contenido.
                        </p>
                      </div>
                    </div>
                    
                    {/* Chat Messages */}
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background border border-border text-foreground'
                          }`}
                        >
                          {message.content.split('\n').map((line, i) => (
                            <p key={i} className={`${i > 0 ? 'mt-2' : ''} text-sm leading-relaxed`}>{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Loading Indicator */}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-background border border-border rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {chatError && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">{chatError}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Elemento invisible para scroll */}
                    <div ref={chatEndRef}></div>
                  </div>
                </div>
                
                {/* Chat Input */}
                <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe una pregunta sobre el documento..."
                    disabled={isChatLoading}
                    className="flex-1 p-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={handleSendQuestion}
                    disabled={!currentQuestion.trim() || isChatLoading}
                    className={`p-3 transition-colors ${
                      !currentQuestion.trim() || isChatLoading
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Information Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Cómo funciona el resumen de documentos con IA?
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            El proceso utiliza técnicas avanzadas de procesamiento de lenguaje natural (NLP) para extraer y sintetizar
            la información más relevante de tus documentos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Extracción de texto</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extrae el contenido textual del documento (PDF, TXT, MD, HTML).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Análisis del contenido</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Identifica temas principales, ideas clave y estructura del documento.
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
                  <h4 className="font-medium text-foreground text-sm">Generación del resumen</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crea un resumen coherente que captura la esencia del documento original.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">Chat interactivo</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permite hacer preguntas específicas sobre el contenido del documento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800 text-sm">Consejo importante</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Para mejores resultados, asegúrate de que el documento tenga texto extraíble. Los documentos escaneados
                  sin OCR no pueden ser procesados efectivamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummarizeDocument;
