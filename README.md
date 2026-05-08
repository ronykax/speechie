# speechie

To install dependencies:

```bash
bun install
```

## Configuration

On every run, `speechie` tries to read:

`~/.config/speechie/config.json`

First-time setup (interactive):

```bash
bunx speechie config
```

This prompts for:

- `api.base`
- `api.key`
- `audio`
- `model`
- `temperature` (optional)
- `prompt` (optional)

Press Enter to keep the currently saved value shown in brackets.

Example:

```bash
mkdir -p ~/.config/speechie
cat > ~/.config/speechie/config.json <<'JSON'
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

The `speechie config` command writes canonical keys to the config file:
`api.base`, `api.key`, `audio`, `model`, `temperature`, and `prompt`.
Legacy aliases are still accepted when reading config.

## Usage

Run interactive setup:

```bash
bunx speechie config
```

Run with config defaults:

```bash
bunx speechie
```

Override audio positionally:

```bash
bunx speechie /path/to/override-audio.mp3
```

Override specific settings with flags:

```bash
bunx speechie /path/to/audio.mp3 -m whisper-large-v3-turbo -t 0 -p "domain words" -k "$GROQ_API_KEY"
```

For local development in this repo:

```bash
bun run src/index.ts -- [audio] [options]
```

If you link the package locally:

```bash
bun link
bunx speechie [audio] [options]
```

Required effective values (from config and/or CLI): `api.base`, `api.key`, `audio`, `model`.
