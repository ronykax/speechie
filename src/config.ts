import { fail, isRecord, readNumber, readString } from "./validate";

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
  prompt?: unknown;
  p?: unknown;
};

type PersistedConfig = {
  api: {
    base: string;
    key: string;
  };
  audio: string;
  model: string;
  temperature?: number;
  prompt?: string;
};

export type ConfigDefaults = {
  base?: string;
  key?: string;
  audio?: string;
  model?: string;
  temperature?: number;
  prompt?: string;
};

export type CliOverrides = {
  audio?: string;
  base?: string;
  key?: string;
  model?: string;
  temperature?: number;
  prompt?: string;
};

export type CliOptionValues = {
  base?: string;
  key?: string;
  model?: string;
  temperature?: string;
  prompt?: string;
};

export type EffectiveConfig = {
  base: string;
  key: string;
  audio: string;
  model: string;
  temperature?: number;
  prompt?: string;
};

function resolveHomePath(path: string): string {
  const home = Bun.env.HOME?.trim();

  if (path === "~") {
    if (!home) {
      fail("Cannot resolve '~' because HOME is not set.");
    }

    return home;
  }

  if (path.startsWith("~/")) {
    if (!home) {
      fail(`Cannot resolve '${path}' because HOME is not set.`);
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
  const defaultHint = currentValue ? ` [${currentValue}]` : "";
  const value = prompt(`${label}${defaultHint}: `);
  if (value === null) {
    fail("Configuration aborted.");
  }
  return value;
}

function promptForRequiredString(label: string, currentValue?: string): string {
  while (true) {
    const value = promptInput(label, currentValue);
    const rawValue = value.trim().length === 0 ? currentValue : value;
    const parsed = readString(rawValue, label);
    if (parsed) {
      return parsed;
    }

    console.error(`Value cannot be empty: ${label}`);
  }
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
      console.error(`Expected number for ${label}.`);
      continue;
    }

    return readNumber(rawValue, label);
  }
}

export const RESOLVED_CONFIG_PATH = resolveHomePath(CONFIG_PATH);

export function parseCliOverrides(
  audio: string | undefined,
  options: CliOptionValues,
): CliOverrides {
  return {
    audio: readString(audio, "audio"),
    base: readString(options.base, "base"),
    key: readString(options.key, "key"),
    model: readString(options.model, "model"),
    temperature: readNumber(options.temperature, "temperature"),
    prompt: readString(options.prompt, "prompt"),
  };
}

export async function loadConfigDefaults(path: string): Promise<ConfigDefaults> {
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = await file.json();
  } catch {
    fail(`Invalid JSON in config file: ${path}`);
  }

  if (!isRecord(parsed)) {
    fail(`Config file must contain a JSON object: ${path}`);
  }

  const raw = parsed as RawConfig;
  const rawApi = raw.api;
  if (rawApi !== undefined && !isRecord(rawApi)) {
    fail("Expected object for config property: api");
  }

  const api = (rawApi ?? {}) as ConfigApi;
  return {
    base: readString(api.base ?? api.b, "api.base"),
    key: readString(api.key ?? api.k, "api.key"),
    audio: readString(raw.audio, "audio"),
    model: readString(raw.model ?? raw.m, "model"),
    temperature: readNumber(raw.temperature ?? raw.t, "temperature"),
    prompt: readString(raw.prompt ?? raw.p, "prompt"),
  };
}

export async function saveConfig(path: string, config: EffectiveConfig): Promise<void> {
  const data: PersistedConfig = {
    api: {
      base: config.base,
      key: config.key,
    },
    audio: config.audio,
    model: config.model,
  };

  if (config.temperature !== undefined) {
    data.temperature = config.temperature;
  }

  if (config.prompt !== undefined) {
    data.prompt = config.prompt;
  }

  const configDir = getParentDirectory(path);
  await Bun.$`mkdir -p ${configDir}`.quiet();
  await Bun.write(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function resolveConfig(
  defaults: ConfigDefaults,
  cli: CliOverrides,
): EffectiveConfig {
  const base = cli.base ?? defaults.base;
  const key = cli.key ?? defaults.key;
  const audio = cli.audio ?? defaults.audio;
  const model = cli.model ?? defaults.model;
  const temperature = cli.temperature ?? defaults.temperature;
  const prompt = cli.prompt ?? defaults.prompt;

  const missing: string[] = [];
  if (!base) missing.push("api.base (or --base/-b)");
  if (!key) missing.push("api.key (or --key/-k)");
  if (!audio) missing.push("audio (positional arg or config.audio)");
  if (!model) missing.push("model (or --model/-m)");

  if (missing.length > 0) {
    fail(`Missing required configuration: ${missing.join(", ")}`);
  }

  return {
    base: base!,
    key: key!,
    audio: audio!,
    model: model!,
    temperature,
    prompt,
  };
}

export async function runInteractiveConfigSetup(): Promise<void> {
  const defaults = await loadConfigDefaults(RESOLVED_CONFIG_PATH);
  const config: EffectiveConfig = {
    base: promptForRequiredString("api.base", defaults.base),
    key: promptForRequiredString("api.key", defaults.key),
    audio: promptForRequiredString("audio", defaults.audio),
    model: promptForRequiredString("model", defaults.model),
    temperature: promptForOptionalNumber("temperature", defaults.temperature),
    prompt: promptForOptionalString("prompt", defaults.prompt),
  };

  await saveConfig(RESOLVED_CONFIG_PATH, config);
  console.log(`Saved configuration to ${RESOLVED_CONFIG_PATH}`);
}
