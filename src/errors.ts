export function cannotResolveHome(path: string): string {
  if (path === "~") {
    return "Cannot resolve '~' because HOME is not set.";
  }

  return `Cannot resolve '${path}' because HOME is not set.`;
}

export function configurationAborted(): string {
  return "Configuration aborted.";
}

export function valueCannotBeEmpty(path: string): string {
  return `Value cannot be empty: ${path}`;
}

export function expectedString(path: string): string {
  return `Expected string for ${path}.`;
}

export function expectedNumber(path: string): string {
  return `Expected number for ${path}.`;
}

export function missingRequiredValue(path: string): string {
  return `Missing required value: ${path}`;
}

export function invalidJsonConfig(path: string): string {
  return `Invalid JSON in config file: ${path}`;
}

export function configMustBeObject(path: string): string {
  return `Config file must contain a JSON object: ${path}`;
}

export function expectedObjectProperty(path: string): string {
  return `Expected object for config property: ${path}`;
}

export function missingRequiredConfiguration(missing: string[]): string {
  return `Missing required configuration: ${missing.join(", ")}`;
}

export function audioFileNotFound(path: string): string {
  return `Audio file not found: ${path}`;
}

export function noTranscriptionTextReturned(): string {
  return "No transcription text returned.";
}

export function transcriptionRequestFailed(message: string): string {
  return `Transcription request failed: ${message}`;
}
