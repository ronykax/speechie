import {
  expectedNumber,
  expectedString,
  missingRequiredValue,
  valueCannotBeEmpty,
} from "./errors";

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
      fail(missingRequiredValue(path));
    }
    return undefined;
  }

  if (typeof value !== "string") {
    fail(expectedString(path));
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    fail(valueCannotBeEmpty(path));
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

  fail(expectedNumber(path));
}
