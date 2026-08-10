import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger = false }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,26,43,0.85)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease both' }}
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: '#16273B',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
          <p className="text-xs text-white/50 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            style={{
              background: danger ? '#EF5350' : '#2F80ED',
              color: '#fff',
              boxShadow: danger ? '0 4px 20px rgba(239,83,80,0.35)' : '0 4px 20px rgba(47,128,237,0.35)',
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
