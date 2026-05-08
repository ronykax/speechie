export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readString(
  value: unknown,
  path: string,
  required = false,
): string | undefined {
  if (value === undefined || value === null) {
    if (required) {
      fail(`Missing required value: ${path}`);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    fail(`Expected string for ${path}.`);
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    fail(`Value cannot be empty: ${path}`);
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

export function readNumber(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  fail(`Expected number for ${path}.`);
}
