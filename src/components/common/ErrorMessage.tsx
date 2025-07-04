interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ title = 'Ocurrió un Error', message, details, onRetry }: ErrorMessageProps) {
  return (
    <div className="my-4 rounded-md border border-red-300 bg-red-50 p-4 shadow-xs">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-700">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-red-600">{message}</p>
      {details && (
        <pre className="mt-2 whitespace-pre-wrap rounded-sm bg-red-100 p-2 text-xs text-red-700">
          {details}
        </pre>
      )}
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 focus:outline-hidden focus:ring-3 focus:ring-red-400 focus:ring-offset-2"
        >
          Reintentar
        </button>
      )}
    </div>
  );
} 
