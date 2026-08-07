import React, { useState, useRef, useEffect } from 'react';

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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
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
        className="input-field pl-9 disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {open && !disabled && (
        <div
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl"
          style={{ background: '#0F1E30', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}
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
        </div>
      )}
    </div>
  );
}
