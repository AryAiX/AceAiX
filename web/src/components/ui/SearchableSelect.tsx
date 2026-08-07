import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowFreeText?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  value, onChange, options, placeholder, allowFreeText = false, disabled = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const updateRect = useCallback(() => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Recompute position while open — the dropdown is portaled to <body> with
  // fixed positioning so it always paints above sibling fields, regardless
  // of any ancestor stacking context (e.g. transformed animated wrappers).
  useEffect(() => {
    if (!open) return;
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideRoot = rootRef.current && rootRef.current.contains(target);
      const insideList = listRef.current && listRef.current.contains(target);
      if (!insideRoot && !insideList) {
        setOpen(false);
        if (!allowFreeText) setQuery(value);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, allowFreeText]);

  const filtered = query
    ? options.filter(opt => opt.toLowerCase().includes(query.toLowerCase()))
    : options;

  function handleSelect(opt: string) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    if (allowFreeText) onChange(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="input-field pl-9 disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {open && !disabled && rect && createPortal(
        <div
          ref={listRef}
          className="fixed z-50 max-h-56 overflow-y-auto rounded-xl"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            background: '#0F1E30',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-white/30">
              {allowFreeText ? 'No suggestions — your typed value will be used' : 'No matches'}
            </div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              >
                {opt}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
