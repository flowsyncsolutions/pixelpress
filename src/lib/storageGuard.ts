function cloneFallback<T>(fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

export function safeGet(key: string, fallback = ""): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Intentionally ignored: storage should never crash runtime.
  }
}

export function safeGetJSON<T>(key: string, fallbackObj: T): T {
  const fallback = cloneFallback(fallbackObj);
  const raw = safeGet(key, "");

  if (!raw) {
    safeSetJSON(key, fallback);
    return cloneFallback(fallback);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    safeSetJSON(key, fallback);
    return cloneFallback(fallback);
  }
}

export function safeSetJSON(key: string, obj: unknown): void {
  try {
    safeSet(key, JSON.stringify(obj));
  } catch {
    // Intentionally ignored: storage should never crash runtime.
  }
}
