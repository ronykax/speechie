# speechthing

To install dependencies:

```bash
bun install
```

## Configuration

On every run, `speechthing` tries to read:

`~/.config/speechthing/config.json`

Example:

```bash
mkdir -p ~/.config/speechthing
cat > ~/.config/speechthing/config.json <<'JSON'
{
  "api": {
    "base": "https://api.groq.com/openai/v1",
    "key": "gsk_..."
  },
  "audio": "/path/to/audio.mp3",
  "model": "whisper-large-v3-turbo",
  "temperature": 0,
  "prompt": "Optional prompt"
}
JSON
```

Supported config aliases:

- `api.base` or `api.b`
- `api.key` or `api.k`
- `model` or `m`
- `temperature` or `t`
- `prompt` or `p`

Precedence:

- CLI positional/flags override config values
- config values are used as defaults
- if config file is missing, CLI-only runs are supported

## Usage

Run with config defaults:

```bash
bunx speechthing
```

Override audio positionally:

```bash
bunx speechthing /path/to/override-audio.mp3
```

Override specific settings with flags:

```bash
bunx speechthing /path/to/audio.mp3 -m whisper-large-v3-turbo -t 0 -p "domain words" -k "$GROQ_API_KEY"
```

For local development in this repo:

```bash
bun run index.ts -- [audio] [options]
```

If you link the package locally:

```bash
bun link
bunx speechthing [audio] [options]
```

Required effective values (from config and/or CLI): `api.key`, `audio`, `model`.
