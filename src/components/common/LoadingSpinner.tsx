export default function LoadingSpinner({ size = 'md', message }: { size?: 'sm' | 'md' | 'lg', message?: string }) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-20 h-20 border-[6px]',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-blue-500 border-t-transparent`}
      ></div>
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
} 