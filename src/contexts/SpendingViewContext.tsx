"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { SpendingView } from "@/hooks/useTransactionFilter";

interface SpendingViewContextValue {
  view: SpendingView;
  setView: (view: SpendingView) => void;
}

const SpendingViewContext = createContext<SpendingViewContextValue | null>(null);

export function SpendingViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<SpendingView>("personal_only");

  return (
    <SpendingViewContext.Provider value={{ view, setView }}>
      {children}
    </SpendingViewContext.Provider>
  );
}

export function useSpendingView(): SpendingViewContextValue {
  const ctx = useContext(SpendingViewContext);
  if (!ctx) {
    throw new Error(
      "useSpendingView must be used within a <SpendingViewProvider>"
    );
  }
  return ctx;
}
