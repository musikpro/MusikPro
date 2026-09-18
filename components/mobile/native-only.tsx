"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/mobile/native-runtime";

export function NativeOnly({ children }: { children: ReactNode }) {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeMobileApp()), []);
  if (!native) return null;
  return <>{children}</>;
}
