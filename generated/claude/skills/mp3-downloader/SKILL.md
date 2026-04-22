---
name: mp3-downloader
description: "Download audio as MP3 from YouTube or YouTube Music links using yt-dlp+ffmpeg with automatic dependency install. Use when user asks to save songs/playlists as mp3, extract track links from a video description, or batch-convert URL lists to mp3 files."
triggers: ["mp3 download","download youtube audio","download youtube music","batch convert urls to mp3"]
argument-hint: "<url1> [url2 ...] | --extract-from-description <video_url> [--out <directory>]"
runtime: claude
support-level: full
generated-from: skills/mp3-downloader
---

<!-- Generated file. Edit skills/<name>/... and rebuild. -->

## Runtime Adapter

- Runtime: Claude Code
- Invocation: `/mp3-downloader`
- Install target: `~/.claude/skills/mp3-downloader`
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Claude용 어댑터입니다.

# MP3 Downloader Skill

Use this skill to reliably save audio as MP3.

## Execute

기본 저장 경로는 `~/mp3`이며, `--out`으로 변경 가능합니다. 디렉토리가 없으면 자동 생성됩니다.

```bash
# 기본 경로(~/mp3)에 저장
bash scripts/download_mp3.sh <url1> [url2 ...]

# 커스텀 경로 지정
bash scripts/download_mp3.sh --out "$HOME/Music/downloads" <url1> [url2 ...]
```

For link extraction from a video's description (timeline links -> individual tracks):

```bash
bash scripts/download_mp3.sh --extract-from-description <video_url> --out "$HOME/mp3/<folder_name>"
```

## Behavior

- **기본 저장 경로:** `~/mp3` (사용자가 `--out`으로 변경 가능)
- **디렉토리 자동 생성:** 지정된 경로가 없으면 `mkdir -p`로 자동 생성
- Check and install missing dependencies (`yt-dlp` and `ffmpeg`) on macOS/Linux.
- Support single URL, playlist URL, and multiple URLs.
- Save as MP3 (`yt-dlp -x --audio-format mp3`).
- Keep output in user-specified folder.

## Notes

- If auto-install fails due to permissions or package manager issues, ask the user to install `yt-dlp` and `ffmpeg` manually, then rerun the script.
- Some YouTube challenge warnings may appear; continue if downloads still succeed.

