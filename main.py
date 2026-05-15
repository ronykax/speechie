import asyncio
import os
import tempfile

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse

from asr import get_raw_transcript
from llm import clean_transcript

app = FastAPI()


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
        temp_wav.write(await file.read())
        temp_path = temp_wav.name

    raw_text = await asyncio.to_thread(get_raw_transcript, temp_path)
    os.remove(temp_path)

    return StreamingResponse(clean_transcript(raw_text), media_type="text/plain")
