#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  download_mp3.sh [--out DIR] <url1> [url2 ...]
  download_mp3.sh --extract-from-description <video_url> [--out DIR]

Options:
  --out DIR                     Output directory (default: ~/mp3)
  --extract-from-description U  Extract links from U's description then download each as MP3
  -h, --help                    Show this help
EOF
}

OUT_DIR="$HOME/mp3"
EXTRACT_FROM=""
URLS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)
      if [[ -z "${2:-}" || "${2:-}" == --* ]]; then
        echo "[ERROR] --out requires a directory argument." >&2
        usage
        exit 1
      fi
      OUT_DIR="$2"
      shift 2
      ;;
    --extract-from-description)
      if [[ -z "${2:-}" || "${2:-}" == --* ]]; then
        echo "[ERROR] --extract-from-description requires a URL argument." >&2
        usage
        exit 1
      fi
      EXTRACT_FROM="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      URLS+=("$1")
      shift
      ;;
  esac
done

install_pkg() {
  local pkg="$1"

  if command -v brew >/dev/null 2>&1; then
    brew install "$pkg" && return 0
  fi

  if command -v apt-get >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y "$pkg" && return 0
    else
      apt-get update && apt-get install -y "$pkg" && return 0
    fi
  fi

  if command -v dnf >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo dnf install -y "$pkg" && return 0
    else
      dnf install -y "$pkg" && return 0
    fi
  fi

  if command -v yum >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo yum install -y "$pkg" && return 0
    else
      yum install -y "$pkg" && return 0
    fi
  fi

  echo "[ERROR] No supported package manager found to install: $pkg" >&2
  return 1
}

ensure_cmd() {
  local cmd="$1"
  local pkg="${2:-$1}"

  if command -v "$cmd" >/dev/null 2>&1; then
    return 0
  fi

  echo "[INFO] Missing '$cmd'. Attempting auto-install ($pkg)..."
  if ! install_pkg "$pkg"; then
    echo "[ERROR] Auto-install failed for '$cmd'. Please install manually and retry." >&2
    exit 1
  fi

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[ERROR] '$cmd' still missing after install. Please install manually and retry." >&2
    exit 1
  fi
}

ensure_cmd yt-dlp yt-dlp
ensure_cmd ffmpeg ffmpeg

# Expand leading tilde to $HOME (tilde doesn't expand inside quotes)
OUT_DIR="${OUT_DIR/#\~/$HOME}"

mkdir -p "$OUT_DIR"

extract_links() {
  local video_url="$1"
  local desc

  desc="$(yt-dlp --get-description "$video_url" 2>/dev/null || true)"
  if [[ -z "$desc" ]]; then
    echo "[ERROR] Failed to get description from: $video_url" >&2
    exit 1
  fi

  # Extract unique YouTube/YouTube Music URLs from description (bash 3.2 compatible)
  URLS=()
  while IFS= read -r url; do
    URLS+=("$url")
  done < <(printf '%s\n' "$desc" \
    | grep -Eo 'https?://[^[:space:])>]+' \
    | sed 's/[",.]$//' \
    | grep -Ei '^https?://([[:alnum:]-]+\.)?(youtube\.com|music\.youtube\.com|youtu\.be)(/|$)' \
    | awk '!seen[$0]++')

  if [[ ${#URLS[@]} -eq 0 ]]; then
    echo "[ERROR] No YouTube URLs found in description: $video_url" >&2
    exit 1
  fi

  echo "[INFO] Extracted ${#URLS[@]} YouTube link(s) from description."
}

if [[ -n "$EXTRACT_FROM" ]]; then
  extract_links "$EXTRACT_FROM"
fi

if [[ ${#URLS[@]} -eq 0 ]]; then
  echo "[ERROR] No input URL provided."
  usage
  exit 1
fi

echo "[INFO] Downloading ${#URLS[@]} URL(s) to: $OUT_DIR"
yt-dlp -x --audio-format mp3 -o "$OUT_DIR/%(title)s.%(ext)s" "${URLS[@]}"

echo "[DONE] MP3 download complete."
