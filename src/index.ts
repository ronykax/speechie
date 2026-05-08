#!/usr/bin/env bun

import { Command } from "commander";
import {
  type CliOptionValues,
  RESOLVED_CONFIG_PATH,
  loadConfigDefaults,
  parseCliOverrides,
  resolveConfig,
  runInteractiveConfigSetup,
} from "./config";
import { transcribeAudio } from "./transcribe";

async function runTranscriptionCommand(
  audio: string | undefined,
  options: CliOptionValues,
): Promise<void> {
  const defaults = await loadConfigDefaults(RESOLVED_CONFIG_PATH);
  const cliOverrides = parseCliOverrides(audio, options);
  const resolvedConfig = resolveConfig(defaults, cliOverrides);
  const transcriptText = await transcribeAudio(resolvedConfig);
  console.log(transcriptText);
}

async function runConfigCommand(): Promise<void> {
  await runInteractiveConfigSetup();
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name("speechie")
    .description("Transcribe an audio file")
    .argument("[audio]", "Path to the audio file to transcribe")
    .option("-b, --base <base>", "API base URL")
    .option("-k, --key <key>", "API key")
    .option("-m, --model <model>", "Transcription model")
    .option("-t, --temperature <temperature>", "Sampling temperature")
    .option("-p, --prompt <prompt>", "Optional transcription prompt")
    .action(runTranscriptionCommand);

  program
    .command("config")
    .description("Interactively configure speechie defaults")
    .action(runConfigCommand);

  return program;
}

await buildProgram().parseAsync(Bun.argv);
