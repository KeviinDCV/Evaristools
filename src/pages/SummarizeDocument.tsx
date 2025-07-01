import React, { useState, useRef } from 'react';
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
    <div className="flex flex-col max-w-[960px] mx-auto">
      {/* Encabezado de la página */}
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Resumir Documento con IA</h1>
        <p className="text-[#5c728a] text-sm">
          Esta herramienta utiliza inteligencia artificial para generar resúmenes concisos de tus documentos.
          Extrae y analiza el contenido para identificar los puntos clave.
        </p>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {success && !loading && !summary && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
          {success}
        </div>
      )}

      {!summary && (
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e5e7eb]">
            <h3 className="font-medium text-[#101418]">Seleccionar documento para resumir</h3>
          </div>
          <div className="p-6 flex flex-col space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              } ${error ? 'border-red-500' : ''}`}
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
                  <AiOutlineFileSearch className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-700 mb-2">
                    <span className="font-medium">Haz clic para seleccionar</span> o arrastra y suelta
                  </p>
                  <p className="text-sm text-gray-500">PDF, TXT, MD, HTML (máx. 10MB)</p>
                </>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <FaFileAlt className="h-8 w-8 text-blue-500" />
                  <span className="text-gray-700 text-sm font-medium truncate max-w-[250px]">
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFile();
                    }}
                    className="p-1 rounded bg-red-600 hover:bg-red-700"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Botón de acción y opciones */}
            <div className="mt-6">
              {loading ? (
                <LoadingSpinner size="md" message={processingStatus} />
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!file}
                  className={`w-full py-3 px-4 flex items-center justify-center rounded-md text-white font-medium transition-colors ${
                    !file ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <IoDocumentText className="mr-2" />
                  Generar Resumen
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Sobre esta herramienta</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2"><strong>Formatos soportados:</strong> PDF, TXT, MD, HTML</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2"><strong>Tamaño máximo:</strong> 10MB</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-[#e5e7eb] flex items-center justify-between">
            <h3 className="font-medium text-[#101418]">Resumen generado</h3>
            <span className="text-sm text-[#5c728a]">
              Documento: {originalFilename}
            </span>
          </div>
          
          <div className="p-6">
            {!chatActive ? (
              <>
                <div className="border rounded-lg p-6 bg-white">
                  <div className="prose prose-blue max-w-none">
                    {summary.split('\n').map((paragraph, i) => (
                      paragraph.trim() ? (
                        <p key={i} className="mb-4 text-gray-700">
                          {paragraph}
                        </p>
                      ) : <div key={i} className="h-4"></div>  // Espacio para líneas vacías
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-3">
                  <button
                    onClick={resetFile}
                    className="flex items-center justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <BsArrowLeft className="mr-2" />
                    Procesar otro documento
                  </button>
                  
                  <div className="flex gap-2">
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
                      className="flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <BsCloudDownload className="mr-2" />
                      Descargar resumen
                    </button>
                    
                    <button
                      onClick={() => setChatActive(true)}
                      className="flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      Hacer preguntas sobre el documento
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setChatActive(false)}
                    className="flex items-center justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <BsArrowLeft className="mr-1" />
                    Volver al resumen
                  </button>
                  <h3 className="font-medium text-[#101418]">Chat con el documento</h3>
                </div>
                
                {/* Área de chat */}
                <div className="flex-grow border rounded-lg bg-gray-50 p-4 overflow-y-auto mb-4">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Puedes hacerme preguntas sobre el documento y te responderé basándome en su contenido.
                      </p>
                    </div>
                    
                    {chatMessages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[75%] rounded-lg p-3 ${
                            message.type === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          {message.content.split('\n').map((line, i) => (
                            <p key={i} className={`${i > 0 ? 'mt-2' : ''} text-sm`}>{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {chatError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                        {chatError}
                      </div>
                    )}
                    
                    {/* Elemento invisible para scroll */}
                    <div ref={chatEndRef}></div>
                  </div>
                </div>
                
                {/* Input para preguntas */}
                <div className="flex items-center bg-white border rounded-md">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe una pregunta sobre el documento..."
                    disabled={isChatLoading}
                    className="flex-grow p-3 bg-transparent rounded-l-md focus:outline-none"
                  />
                  <button
                    onClick={handleSendQuestion}
                    disabled={!currentQuestion.trim() || isChatLoading}
                    className={`p-3 rounded-r-md ${
                      !currentQuestion.trim() || isChatLoading
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <IoSend className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Explicación del funcionamiento */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 className="font-medium text-[#101418]">¿Cómo funciona el resumen de documentos con IA?</h3>
        </div>
        <div className="p-6 space-y-4 text-[#374151]">
          <p className="text-sm">
            El proceso de resumir documentos con inteligencia artificial utiliza técnicas avanzadas de procesamiento
            de lenguaje natural (NLP) para extraer y sintetizar la información más relevante. El proceso funciona así:
          </p>

          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              <span className="font-medium">Extracción de texto:</span> El sistema extrae el contenido textual del
              documento subido (PDF, TXT, etc.).
            </li>
            <li>
              <span className="font-medium">Análisis del contenido:</span> El modelo de IA analiza el texto para
              identificar temas principales, ideas clave y la estructura del documento.
            </li>
            <li>
              <span className="font-medium">Generación del resumen:</span> A través de LM Studio, se utiliza
              un modelo de lenguaje avanzado para crear un resumen coherente que captura la esencia del documento original.
            </li>
            <li>
              <span className="font-medium">Optimización del resultado:</span> El sistema elimina redundancias y
              formatea el resumen para que sea fácil de leer y comprensible.
            </li>
          </ol>

          <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-xs">
            <span className="font-medium">Consejo:</span> Para obtener mejores resultados, asegúrate de que el
            documento tenga texto que pueda extraerse correctamente. Los documentos con imágenes escaneadas sin OCR
            no pueden ser procesados efectivamente.
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummarizeDocument;