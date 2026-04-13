#!/usr/bin/env bash
# update_knowledge.sh - Helper script for syncing frontend interview knowledge from GitHub repos
# Usage: ./update_knowledge.sh [--summary | --clone | --check | --help]
#
# This is a HELPER tool, not a fully automated pipeline.
# It clones/pulls source repos and outputs a structured summary.
# Actual question curation is done by a human or Claude session.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KNOWLEDGE_DIR="$(dirname "$SCRIPT_DIR")/knowledge"
TEMP_DIR="${TMPDIR:-/tmp}/fe-interview-sources"

# Source repositories
REPOS=(
  "https://github.com/yangshun/front-end-interview-handbook.git"
  "https://github.com/donnemartin/system-design-primer.git"
)

REPO_NAMES=(
  "front-end-interview-handbook"
  "system-design-primer"
)

usage() {
  cat <<'USAGE'
Frontend Interview Knowledge Update Helper

Commands:
  --clone     Clone or pull source repos into temp directory
  --summary   Show structured summary of available questions from source repos
  --check     Compare source repo topics with existing knowledge files
  --help      Show this help message

Examples:
  ./update_knowledge.sh --clone      # First: get latest source repos
  ./update_knowledge.sh --summary    # Then: see what questions are available
  ./update_knowledge.sh --check      # Compare: what's covered vs what's not

Note: This script outputs raw material for review.
      Use Claude Code to curate and format questions into knowledge files.
USAGE
}

clone_repos() {
  echo "=== Cloning/Updating Source Repositories ==="
  echo "Target directory: $TEMP_DIR"
  echo ""

  mkdir -p "$TEMP_DIR"

  for i in "${!REPOS[@]}"; do
    repo="${REPOS[$i]}"
    name="${REPO_NAMES[$i]}"
    target="$TEMP_DIR/$name"

    if [ -d "$target/.git" ]; then
      echo "[$name] Pulling latest changes..."
      git -C "$target" pull --quiet 2>/dev/null || echo "[$name] Pull failed, using existing version"
    else
      echo "[$name] Cloning..."
      git clone --quiet --depth 1 "$repo" "$target" 2>/dev/null || {
        echo "[$name] Clone failed. Check network connection."
        continue
      }
    fi
    echo "[$name] Ready at $target"
    echo ""
  done

  echo "=== Done ==="
}

summarize_fe_handbook() {
  local repo_dir="$TEMP_DIR/front-end-interview-handbook"

  if [ ! -d "$repo_dir" ]; then
    echo "[front-end-interview-handbook] Not found. Run --clone first."
    return 1
  fi

  echo "## front-end-interview-handbook"
  echo ""

  # Find question files
  local question_dirs=(
    "packages/quiz/questions"
    "contents"
    "packages/front-end-interview-guidebook/contents"
  )

  for dir in "${question_dirs[@]}"; do
    local full_path="$repo_dir/$dir"
    if [ -d "$full_path" ]; then
      echo "### Directory: $dir"
      local count
      count=$(find "$full_path" -name "*.md" -o -name "*.mdx" -o -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
      echo "  Files found: $count"

      # List topics by subdirectory
      find "$full_path" -maxdepth 1 -type d 2>/dev/null | sort | while read -r subdir; do
        if [ "$subdir" != "$full_path" ]; then
          local topic
          topic=$(basename "$subdir")
          local sub_count
          sub_count=$(find "$subdir" -name "*.md" -o -name "*.mdx" -o -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
          if [ "$sub_count" -gt 0 ]; then
            echo "  - $topic: $sub_count files"
          fi
        fi
      done
      echo ""
    fi
  done
}

summarize_system_design() {
  local repo_dir="$TEMP_DIR/system-design-primer"

  if [ ! -d "$repo_dir" ]; then
    echo "[system-design-primer] Not found. Run --clone first."
    return 1
  fi

  echo "## system-design-primer"
  echo ""

  # Count main topics from README sections
  if [ -f "$repo_dir/README.md" ]; then
    echo "### Main Topics (from README headers)"
    grep -E "^#{2,3} " "$repo_dir/README.md" 2>/dev/null | head -30 | while read -r line; do
      echo "  $line"
    done
    echo ""
  fi

  # Count solution directories
  local solutions_dir="$repo_dir/solutions"
  if [ -d "$solutions_dir" ]; then
    echo "### System Design Solutions"
    local sol_count
    sol_count=$(find "$solutions_dir" -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
    echo "  Solution directories: $((sol_count - 1))"
    find "$solutions_dir" -maxdepth 1 -type d 2>/dev/null | sort | while read -r dir; do
      if [ "$dir" != "$solutions_dir" ]; then
        echo "  - $(basename "$dir")"
      fi
    done
    echo ""
  fi
}

check_coverage() {
  echo "=== Knowledge File Coverage Check ==="
  echo ""

  if [ ! -d "$KNOWLEDGE_DIR" ]; then
    echo "Knowledge directory not found: $KNOWLEDGE_DIR"
    return 1
  fi

  echo "### Existing Knowledge Files"
  echo ""
  local total_questions=0

  for file in "$KNOWLEDGE_DIR"/*.md; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "_index.md" ]; then
      local filename
      filename=$(basename "$file")
      local q_count
      q_count=$(grep -c "^## Q[0-9]" "$file" 2>/dev/null || echo "0")
      total_questions=$((total_questions + q_count))
      printf "  %-35s %3d questions\n" "$filename" "$q_count"
    fi
  done

  echo ""
  echo "  Total: $total_questions questions across $(find "$KNOWLEDGE_DIR" -name "*.md" ! -name "_index.md" 2>/dev/null | wc -l | tr -d ' ') files"
  echo ""

  # Check file sizes
  echo "### File Size Check (target: <= 600 lines)"
  echo ""
  for file in "$KNOWLEDGE_DIR"/*.md; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "_index.md" ]; then
      local lines
      lines=$(wc -l < "$file" | tr -d ' ')
      local status="OK"
      if [ "$lines" -gt 600 ]; then
        status="OVER LIMIT"
      fi
      printf "  %-35s %4d lines  [%s]\n" "$(basename "$file")" "$lines" "$status"
    fi
  done
}

# Main
case "${1:-}" in
  --clone)
    clone_repos
    ;;
  --summary)
    echo "=== Source Repository Summary ==="
    echo ""
    summarize_fe_handbook
    summarize_system_design
    ;;
  --check)
    check_coverage
    ;;
  --help|"")
    usage
    ;;
  *)
    echo "Unknown option: $1"
    usage
    exit 1
    ;;
esac
