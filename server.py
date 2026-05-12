import asyncio
import os
import tempfile

import nemo.collections.asr as nemo_asr
import requests
from fastapi import FastAPI, File, UploadFile

app = FastAPI()

asr_model = nemo_asr.models.ASRModel.from_pretrained(
    "nvidia/parakeet-tdt-0.6b-v3",
    map_location="cpu",  # type: ignore
)
asr_model = asr_model.cuda()  # type: ignore

with open("dictionary.txt", "r", encoding="utf-8") as f:
    word_list = ", ".join(line.strip() for line in f if line.strip())

system_prompt = f"""You are a transcript correction assistant. You will be given raw text from a
speech-to-text system. Your job is to clean it up and correct misspellings
using the rules below.

## Rules

**Filler words**
Remove all filler words and sounds including: um, uh, uhm, uhh, hmm, uh-huh,
mm, mhm, and any similar sounds. Do not remove actual words.

**Punctuation**
Add appropriate punctuation including commas, full stops, and question marks
where necessary. When in doubt, prefer less punctuation over more.

**Do not**
- Rephrase, reword, or restructure any sentences
- Add words that were not spoken
- Remove words other than the filler words listed above

## Dictionary
The following is a list of names and terms with their exact correct spellings.
Treat this list as ground truth. The speech-to-text system transcribes these
phonetically, so the spelling in the transcript may differ. If any word in the
transcript sounds like something in this list, replace it with the exact
spelling from this list, no exceptions.

{word_list}

## Example
Input: hey this is [wrong phonetic version] um I wanted to uh go over the results
Output: Hey, this is [correct spelling]. I wanted to go over the results.

## Output
Output only the corrected transcript. Do not include any explanation,
preamble, or commentary."""

url = os.getenv("LLM_BASE_URL")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.getenv('LLM_API_KEY')}",
}

model = os.getenv("LLM_MODEL")


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
        temp_wav.write(await file.read())
        temp_path = temp_wav.name

    try:
        output = await asyncio.to_thread(asr_model.transcribe, [temp_path])  # type: ignore
        raw_text = output[0].text.rstrip() + " "

        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": raw_text,
                },
            ],
            "model": model,
            "temperature": 0.2,
            "max_completion_tokens": 4096,
            "top_p": 1,
            "stop": None,
        }

        response = requests.post(f"{url}", headers=headers, json=payload)

        data = response.json()
        text = data["choices"][0]["message"]["content"]

        return {"text": text}
    finally:
        os.remove(temp_path)
