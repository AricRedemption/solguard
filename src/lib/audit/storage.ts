function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function canUseLocalStorage(): boolean {
  return getLocalStorage() !== null;
}

export function readStoredJson<T>(key: string, fallback: T): T {
  const storage = getLocalStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("[audit/storage] Failed to read storage", error);
    return fallback;
  }
}

export function writeStoredJson(key: string, value: unknown): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("[audit/storage] Failed to write storage", error);
    return false;
  }
}
