import { createTimeoutSignal, isTimeoutError } from "./timeout";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTimeoutSignalRegression(): Promise<void> {
  const timeout = createTimeoutSignal(5, "timeout regression");

  try {
    await new Promise((resolve) => setTimeout(resolve, 20));
  } finally {
    timeout.clear();
  }

  assert(timeout.signal.aborted, "Expected timeout signal to abort.");
  assert(isTimeoutError(timeout.signal.reason), "Expected timeout reason to be recognized.");
}

void runTimeoutSignalRegression();
