import React, { createContext, useContext, useRef, useState } from 'react';

interface UnsavedChangesCtx {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  registerDiscardHandler: (fn: (() => void) | null) => void;
  runDiscardHandler: () => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesCtx>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  registerDiscardHandler: () => {},
  runDiscardHandler: () => {},
});

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  function registerDiscardHandler(fn: (() => void) | null) {
    discardHandlerRef.current = fn;
  }

  function runDiscardHandler() {
    discardHandlerRef.current?.();
  }

  return (
    <UnsavedChangesContext.Provider
      value={{ hasUnsavedChanges, setHasUnsavedChanges, registerDiscardHandler, runDiscardHandler }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export const useUnsavedChanges = () => useContext(UnsavedChangesContext);
