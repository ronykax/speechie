import nemo.collections.asr as nemo_asr

asr_model = nemo_asr.models.ASRModel.from_pretrained(
    "nvidia/parakeet-tdt-0.6b-v3",
    map_location="cpu",  # type: ignore
)
asr_model = asr_model.cuda()  # type: ignore


def get_raw_transcript(file_path: str) -> str:
    output = asr_model.transcribe([file_path])  # type: ignore
    return output[0].text.rstrip() + " "
