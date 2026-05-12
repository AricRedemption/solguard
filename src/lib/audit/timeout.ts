export function createTimeoutSignal(timeoutMs: number, timeoutLabel: string): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new DOMException(timeoutLabel, "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "TimeoutError"
    : error instanceof Error
      ? error.name === "TimeoutError"
      : false;
}
