import OpenAI from "openai";
import type { EffectiveConfig } from "./config";
import { fail } from "./validate";
import {
  audioFileNotFound,
  noTranscriptionTextReturned,
  transcriptionRequestFailed,
} from "./errors";

export function createTranscriptionClient(config: EffectiveConfig): OpenAI {
  return new OpenAI({
    apiKey: config.key,
    baseURL: config.base,
  });
}

export async function transcribeAudio(config: EffectiveConfig): Promise<string> {
  const audioFile = Bun.file(config.audio);
  if (!(await audioFile.exists())) {
    fail(audioFileNotFound(config.audio));
  }

  const openai = createTranscriptionClient(config);

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: config.model,
      file: audioFile,
      temperature: config.temperature,
      response_format: "verbose_json",
    });

    if (!transcription.text) {
      fail(noTranscriptionTextReturned());
    }

    return transcription.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(transcriptionRequestFailed(message));
  }
}
