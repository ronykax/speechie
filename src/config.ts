import { fail, isRecord, readNumber, readString } from "./validate";
import {
  cannotResolveHome,
  configMustBeObject,
  expectedNumber,
  expectedObjectProperty,
  invalidJsonConfig,
  missingRequiredConfiguration,
} from "./errors";

const CONFIG_PATH = "~/.config/speechie/config.json";

type ConfigApi = {
  base?: unknown;
  b?: unknown;
  key?: unknown;
  k?: unknown;
};

type RawConfig = {
  api?: unknown;
  audio?: unknown;
  model?: unknown;
  m?: unknown;
  temperature?: unknown;
  t?: unknown;
};

type PersistedConfig = {
  api?: {
    base?: string;
    key?: string;
  };
  audio?: string;
  model?: string;
  temperature?: number;
};

export type ConfigDefaults = {
  base?: string;
  key?: string;
  audio?: string;
  model?: string;
  temperature?: number;
};

export type CliOverrides = {
  audio?: string;
  base?: string;
  key?: string;
  model?: string;
  temperature?: number;
};

export type CliOptionValues = {
  base?: string;
  key?: string;
  model?: string;
  temperature?: string;
};

export type CliOptionDefinition = {
  key: keyof CliOptionValues;
  flags: string;
  description: string;
};

export const CLI_OPTION_DEFINITIONS: readonly CliOptionDefinition[] = [
  { key: "base", flags: "-b, --base <base>", description: "API base URL" },
  { key: "key", flags: "-k, --key <key>", description: "API key" },
  {
    key: "model",
    flags: "-m, --model <model>",
    description: "Transcription model",
  },
  {
    key: "temperature",
    flags: "-t, --temperature <temperature>",
    description: "Sampling temperature",
  },
];

type SharedConfigField = "base" | "key" | "model" | "temperature";

const SHARED_CONFIG_FIELDS: readonly SharedConfigField[] = [
  "base",
  "key",
  "model",
  "temperature",
];

const REQUIRED_CONFIG_FIELD_HINTS: ReadonlyArray<{
  key: "base" | "key" | "model";
  hint: string;
}> = [
  { key: "base", hint: "api.base (or --base/-b)" },
  { key: "key", hint: "api.key (or --key/-k)" },
  { key: "model", hint: "model (or --model/-m)" },
];

export type EffectiveConfig = {
  base: string;
  key: string;
  audio: string;
  model: string;
  temperature?: number;
};

function resolveHomePath(path: string): string {
  const home = Bun.env.HOME?.trim();

  if (path === "~") {
    if (!home) {
      fail(cannotResolveHome(path));
    }

    return home;
  }

  if (path.startsWith("~/")) {
    if (!home) {
      fail(cannotResolveHome(path));
    }

    return `${home.replace(/\/+$/, "")}/${path.slice(2)}`;
  }

  return path;
}

function getParentDirectory(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");

  if (lastSlash < 0) {
    return ".";
  }

  if (lastSlash === 0) {
    return "/";
  }

  return normalized.slice(0, lastSlash);
}

function promptInput(label: string, currentValue?: string): string {
  const value = prompt(buildPromptLabel(label, currentValue));
  if (value === null) {
    return "";
  }
  return value;
}

export function buildPromptLabel(label: string, currentValue?: string): string {
  const defaultHint = currentValue ? ` [${currentValue}]` : "";
  return `${label}${defaultHint}:`;
}

function promptForOptionalString(
  label: string,
  currentValue?: string,
): string | undefined {
  const value = promptInput(label, currentValue);
  const rawValue = value.trim().length === 0 ? currentValue : value;
  return readString(rawValue, label);
}

function promptForOptionalNumber(
  label: string,
  currentValue?: number,
): number | undefined {
  while (true) {
    const currentText =
      currentValue === undefined ? undefined : String(currentValue);
    const value = promptInput(label, currentText);
    const rawValue = value.trim().length === 0 ? currentText : value;
    if (rawValue === undefined) {
      return undefined;
    }

    const parsedValue = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsedValue)) {
      console.error(expectedNumber(label));
      continue;
    }

    return readNumber(rawValue, label);
  }
}

function readSharedValueFromCli(
  field: SharedConfigField,
  options: CliOptionValues,
): string | number | undefined {
  switch (field) {
    case "base":
      return readString(options.base, "base");
    case "key":
      return readString(options.key, "key");
    case "model":
      return readString(options.model, "model");
    case "temperature":
      return readNumber(options.temperature, "temperature");
  }
}

function readSharedValueFromConfig(
  field: SharedConfigField,
  raw: RawConfig,
  api: ConfigApi,
): string | number | undefined {
  switch (field) {
    case "base":
      return readString(api.base ?? api.b, "api.base");
    case "key":
      return readString(api.key ?? api.k, "api.key");
    case "model":
      return readString(raw.model ?? raw.m, "model");
    case "temperature":
      return readNumber(raw.temperature ?? raw.t, "temperature");
  }
}

export const RESOLVED_CONFIG_PATH = resolveHomePath(CONFIG_PATH);

export function parseCliOverrides(
  audio: string | undefined,
  options: CliOptionValues,
): CliOverrides {
  const sharedOverrides = Object.fromEntries(
    SHARED_CONFIG_FIELDS.map((field) => [
      field,
      readSharedValueFromCli(field, options),
    ]),
  ) as Pick<CliOverrides, SharedConfigField>;

  return {
    audio: readString(audio, "audio"),
    ...sharedOverrides,
  };
}

export async function loadConfigDefaults(
  path: string,
): Promise<ConfigDefaults> {
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = await file.json();
  } catch {
    fail(invalidJsonConfig(path));
  }

  if (!isRecord(parsed)) {
    fail(configMustBeObject(path));
  }

  const raw = parsed as RawConfig;
  const rawApi = raw.api;
  if (rawApi !== undefined && !isRecord(rawApi)) {
    fail(expectedObjectProperty("api"));
  }

  const api = (rawApi ?? {}) as ConfigApi;
  const sharedDefaults = Object.fromEntries(
    SHARED_CONFIG_FIELDS.map((field) => [
      field,
      readSharedValueFromConfig(field, raw, api),
    ]),
  ) as Pick<ConfigDefaults, SharedConfigField>;

  return {
    audio: readString(raw.audio, "audio"),
    ...sharedDefaults,
  };
}

type WritableConfig = {
  base?: string;
  key?: string;
  audio?: string;
  model?: string;
  temperature?: number;
};

export async function saveConfig(path: string, config: WritableConfig): Promise<void> {
  const data: PersistedConfig = {};

  if (config.base !== undefined || config.key !== undefined) {
    data.api = {};
    if (config.base !== undefined) {
      data.api.base = config.base;
    }
    if (config.key !== undefined) {
      data.api.key = config.key;
    }
  }

  if (config.audio !== undefined) {
    data.audio = config.audio;
  }

  if (config.model !== undefined) {
    data.model = config.model;
  }

  if (config.temperature !== undefined) {
    data.temperature = config.temperature;
  }

  const configDir = getParentDirectory(path);
  await Bun.$`mkdir -p ${configDir}`.quiet();
  await Bun.write(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function resolveConfig(
  defaults: ConfigDefaults,
  cli: CliOverrides,
): EffectiveConfig {
  // Behavioral invariant: CLI values always override config defaults.
  const base = cli.base ?? defaults.base;
  const key = cli.key ?? defaults.key;
  const audio = cli.audio ?? defaults.audio;
  const model = cli.model ?? defaults.model;
  const temperature = cli.temperature ?? defaults.temperature;

  const missing: string[] = [];
  for (const required of REQUIRED_CONFIG_FIELD_HINTS) {
    const value =
      required.key === "base" ? base : required.key === "key" ? key : model;
    if (!value) {
      missing.push(required.hint);
    }
  }
  if (!audio) missing.push("audio (positional arg or config.audio)");

  if (missing.length > 0) {
    fail(missingRequiredConfiguration(missing));
  }

  return {
    base: base!,
    key: key!,
    audio: audio!,
    model: model!,
    temperature,
  };
}

export async function runInteractiveConfigSetup(): Promise<void> {
  const defaults = await loadConfigDefaults(RESOLVED_CONFIG_PATH);
  const config: WritableConfig = {
    base: promptForOptionalString("api.base", defaults.base),
    key: promptForOptionalString("api.key", defaults.key),
    audio: promptForOptionalString("audio", defaults.audio),
    model: promptForOptionalString("model", defaults.model),
    temperature: promptForOptionalNumber("temperature", defaults.temperature),
  };

  await saveConfig(RESOLVED_CONFIG_PATH, config);
  console.log(`Saved configuration to ${RESOLVED_CONFIG_PATH}`);
}
