"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/mobile/native-runtime";

const subscribe = () => () => {};
const serverSnapshot = () => false;

export function NativeOnly({ children }: { children: ReactNode }) {
  const native = useSyncExternalStore(
    subscribe,
    isNativeMobileApp,
    serverSnapshot,
  );
  if (!native) return null;
  return <>{children}</>;
}
