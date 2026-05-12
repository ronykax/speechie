# speechie
speech to text thing that runs on my home server.

## setup
- create a `.env` file (OpenAI compatible API required):
  ```
  LLM_API_KEY=abc123
  LLM_BASE_URL=https://api.example.com/v1/chat/completions
  LLM_MODEL=llama-3.1-8b-instant
  ```
- create a `dictionary.txt` file (words to recognize, one per line)
  ```
  Rony
  Parakeet
  Doraemon
  ```
- start the server:
  ```zsh
  uv run uvicorn server:app --host 0.0.0.0 --port 8000 --env-file .env
  ```

## usage
```zsh
curl -X POST "http://localhost:8000/transcribe" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@/path/to/audio.wav"
```
