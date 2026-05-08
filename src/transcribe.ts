import OpenAI from "openai";
import type { EffectiveConfig } from "./config";
import { fail } from "./validate";

export async function transcribeAudio(config: EffectiveConfig): Promise<string> {
  const audioFile = Bun.file(config.audio);
  if (!(await audioFile.exists())) {
    fail(`Audio file not found: ${config.audio}`);
  }

  const openai = new OpenAI({
    apiKey: config.key,
    baseURL: config.base,
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: config.model,
      file: audioFile,
      temperature: config.temperature,
      prompt: config.prompt,
      response_format: "verbose_json",
    });

    if (!transcription.text) {
      fail("No transcription text returned.");
    }

    return transcription.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Transcription request failed: ${message}`);
  }
}
