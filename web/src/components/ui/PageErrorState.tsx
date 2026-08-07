import { AlertTriangle } from 'lucide-react';

export default function PageErrorState({
  message = "Something went wrong loading this page.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-24 text-center">
      <AlertTriangle size={28} className="text-coral" />
      <p className="text-slate text-sm max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-xs px-4 py-2 mt-1">
          Try again
        </button>
      )}
    </div>
  );
}
