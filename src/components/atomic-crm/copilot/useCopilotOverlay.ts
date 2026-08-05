import { createContext, useContext } from "react";

export interface CopilotOverlayContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  registerPage: (handler: () => void) => () => void;
}

export const CopilotOverlayContext =
  createContext<CopilotOverlayContextValue | null>(null);

export function useCopilotOverlay() {
  const ctx = useContext(CopilotOverlayContext);
  if (!ctx) {
    throw new Error(
      "useCopilotOverlay must be used inside CopilotOverlayProvider",
    );
  }
  return ctx;
}
