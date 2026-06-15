import React, { useRef } from 'react';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export default function MagneticButton({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.22;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.22;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  }

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      {children}
    </button>
  );
}
