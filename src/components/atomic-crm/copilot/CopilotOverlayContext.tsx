import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  CopilotOverlayContext,
} from "./useCopilotOverlay";

export function CopilotOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pageHandlerRef = useRef<(() => void) | null>(null);

  const open = useCallback(() => {
    if (pageHandlerRef.current) {
      pageHandlerRef.current();
    } else {
      setIsOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const registerPage = useCallback((handler: () => void) => {
    pageHandlerRef.current = handler;
    setIsOpen(false);
    return () => {
      if (pageHandlerRef.current === handler) {
        pageHandlerRef.current = null;
      }
    };
  }, []);

  return (
    <CopilotOverlayContext.Provider
      value={{ isOpen, open, close, registerPage }}
    >
      {children}
    </CopilotOverlayContext.Provider>
  );
}
