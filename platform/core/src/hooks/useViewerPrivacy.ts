import { useSyncExternalStore } from 'react';

let hidden = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Display-only privacy, shared across viewports and preserved when panels close. */
export function setViewerPrivacy(value: boolean) {
  hidden = value;
  listeners.forEach(listener => listener());
}

export default function useViewerPrivacy() {
  return useSyncExternalStore(
    subscribe,
    () => hidden,
    () => false
  );
}
