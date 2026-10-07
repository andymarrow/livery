"use client";

import { useCallback, useSyncExternalStore } from "react";

// The links a visitor is collecting for a taste kit, kept in this browser
// only (a convenience, like a remembered filter). Every button and the header
// counter read the same list and update together, across tabs too.

export const TASTE_MAX = 5;
const KEY = "livery-taste";
const EVENT = "livery-taste-change";
const EMPTY: string[] = [];

let cache: { raw: string | null; list: string[] } = { raw: null, list: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.list;
  let list = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) list = parsed.filter((u): u is string => typeof u === "string").slice(0, TASTE_MAX);
  } catch {
    // A damaged value starts the collection over.
  }
  cache = { raw, list };
  return list;
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, TASTE_MAX)));
  } catch {
    // Storage blocked (private window): the collection just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTasteTray() {
  const links = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = useCallback((url: string) => links.includes(url), [links]);
  const toggle = useCallback((url: string) => {
    const current = read();
    if (current.includes(url)) write(current.filter((u) => u !== url));
    else if (current.length < TASTE_MAX) write([...current, url]);
  }, []);
  const clear = useCallback(() => write([]), []);
  return { links, has, toggle, clear, full: links.length >= TASTE_MAX };
}
