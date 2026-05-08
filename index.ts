#!/usr/bin/env bun

import { Command } from "commander";
import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const CONFIG_PATH = `${process.env.HOME ?? "~"}/.config/speechthing/config.json`;

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

type ConfigDefaults = {
  base?: string;
  key?: string;
  audio?: string;
  model?: string;
  temperature?: number;
  prompt?: string;
};

type CliOverrides = {
  audio?: string;
  base?: string;
  key?: string;
  model?: string;
  temperature?: number;
  prompt?: string;
};

type EffectiveConfig = {
  base: string;
  key: string;
  audio: string;
  model: string;
  temperature?: number;
  prompt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: unknown,
  path: string,
  required = false,
): string | undefined {
  if (value === undefined || value === null) {
    if (required) {
      console.error(`Missing required value: ${path}`);
      process.exit(1);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    console.error(`Expected string for ${path}.`);
    process.exit(1);
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    console.error(`Value cannot be empty: ${path}`);
    process.exit(1);
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(value: unknown, path: string): number | undefined {
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

  console.error(`Expected number for ${path}.`);
  process.exit(1);
}

async function loadConfigDefaults(path: string): Promise<ConfigDefaults> {
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = await file.json();
  } catch {
    console.error(`Invalid JSON in config file: ${path}`);
    process.exit(1);
  }

  if (!isRecord(parsed)) {
    console.error(`Config file must contain a JSON object: ${path}`);
    process.exit(1);
  }

  const raw = parsed as RawConfig;
  const rawApi = raw.api;
  if (rawApi !== undefined && !isRecord(rawApi)) {
    console.error("Expected object for config property: api");
    process.exit(1);
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

function resolveConfig(
  defaults: ConfigDefaults,
  cli: CliOverrides,
): EffectiveConfig {
  const base = cli.base ?? defaults.base ?? DEFAULT_BASE_URL;
  const key = cli.key ?? defaults.key;
  const audio = cli.audio ?? defaults.audio;
  const model = cli.model ?? defaults.model;
  const temperature = cli.temperature ?? defaults.temperature;
  const prompt = cli.prompt ?? defaults.prompt;

  const missing: string[] = [];
  if (!key) missing.push("api.key (or --key/-k)");
  if (!audio) missing.push("audio (positional arg or config.audio)");
  if (!model) missing.push("model (or --model/-m)");

  if (missing.length > 0) {
    console.error(`Missing required configuration: ${missing.join(", ")}`);
    process.exit(1);
  }

  return { base, key, audio, model, temperature, prompt };
}

const program = new Command();

program
  .name("speechthing")
  .description("Transcribe an audio file")
  .argument("[audio]", "Path to the audio file to transcribe")
  .option("-b, --base <base>", "API base URL")
  .option("-k, --key <key>", "API key")
  .option("-m, --model <model>", "Transcription model")
  .option("-t, --temperature <temperature>", "Sampling temperature")
  .option("-p, --prompt <prompt>", "Optional transcription prompt")
  .action(
    async (
      audio: string | undefined,
      options: {
        base?: string;
        key?: string;
        model?: string;
        temperature?: string;
        prompt?: string;
      },
    ) => {
      const defaults = await loadConfigDefaults(CONFIG_PATH);
      const cliOverrides: CliOverrides = {
        audio: readString(audio, "audio"),
        base: readString(options.base, "base"),
        key: readString(options.key, "key"),
        model: readString(options.model, "model"),
        temperature: readNumber(options.temperature, "temperature"),
        prompt: readString(options.prompt, "prompt"),
      };

      const resolved = resolveConfig(defaults, cliOverrides);
      const audioFile = Bun.file(resolved.audio);
      if (!(await audioFile.exists())) {
        console.error(`Audio file not found: ${resolved.audio}`);
        process.exit(1);
      }

      const openai = new OpenAI({
        apiKey: resolved.key,
        baseURL: resolved.base,
      });

      try {
        const transcription = await openai.audio.transcriptions.create({
          model: resolved.model,
          file: audioFile,
          temperature: resolved.temperature,
          prompt: resolved.prompt,
          response_format: "verbose_json",
        });

        if (!transcription.text) {
          console.error("No transcription text returned.");
          process.exit(1);
        }

        console.log(transcription.text);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Transcription request failed: ${message}`);
        process.exit(1);
      }
    },
  );

await program.parseAsync(Bun.argv);
