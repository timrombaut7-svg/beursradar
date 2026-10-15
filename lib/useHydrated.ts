"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true op de client na hydratatie; voorkomt mismatches met LocalStorage-state. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
