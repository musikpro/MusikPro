"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/mobile/native-runtime";

export function WebOnly({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeMobileApp());
    setReady(true);
  }, []);

  if (!ready || native) return null;
  return <>{children}</>;
}
