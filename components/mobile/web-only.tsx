"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/mobile/native-runtime";

const subscribe = () => () => {};
const serverSnapshot = () => undefined;

export function WebOnly({ children }: { children: ReactNode }) {
  const native = useSyncExternalStore(subscribe, isNativeMobileApp, serverSnapshot);
  if (native !== false) return null;
  return <>{children}</>;
}
