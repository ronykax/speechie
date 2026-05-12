import asyncio
import os
import tempfile

import nemo.collections.asr as nemo_asr
from fastapi import FastAPI, File, UploadFile

app = FastAPI()

asr_model = nemo_asr.models.ASRModel.from_pretrained(
    "nvidia/parakeet-tdt-0.6b-v3",
    map_location="cpu",  # type: ignore
)
asr_model = asr_model.cuda()  # type: ignore


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
        temp_wav.write(await file.read())
        temp_path = temp_wav.name

    try:
        output = await asyncio.to_thread(asr_model.transcribe, [temp_path])  # type: ignore
        text = output[0].text.rstrip() + " "

        return {"text": text}
    finally:
        os.remove(temp_path)
