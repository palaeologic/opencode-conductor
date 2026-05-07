#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

TARGET_ROOT="${OPENCODE_HOME:-$HOME/.config/opencode}"
DRY_RUN=0
WITH_TEMPLATES=0
SYNCED_COUNT=0

usage() {
  cat <<'EOF'
Usage: bash bin/install-opencode-conductor.sh [options]

Sync OpenCode kit files from this repository into ~/.config/opencode.

Options:
  -n, --dry-run        Show planned copy operations without writing
  --with-templates     Seed templates even when target files are missing
  -h, --help           Show this help message
EOF
}

warn_if_non_default_target() {
  local default_root="$HOME/.config/opencode"
  case "$TARGET_ROOT" in
    "$default_root"|"$default_root"/*) ;;
    *)
      echo "Warning: target '$TARGET_ROOT' is outside '$default_root'; proceeding."
      ;;
  esac
}

copy_file_if_exists() {
  local src="$1"
  local dest="$2"
  local dest_dir

  if [ ! -f "$src" ]; then
    return 0
  fi

  dest_dir=$(dirname "$dest")
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would copy $src -> $dest"
    SYNCED_COUNT=$((SYNCED_COUNT + 1))
    return 0
  fi

  mkdir -p "$dest_dir"
  cp -p "$src" "$dest"
  SYNCED_COUNT=$((SYNCED_COUNT + 1))
}

copy_glob() {
  local src_dir="$1"
  local pattern="$2"
  local dest_dir="$3"
  local src_file

  [ -d "$src_dir" ] || return 0

  for src_file in "$src_dir"/$pattern; do
    [ -f "$src_file" ] || continue
    copy_file_if_exists "$src_file" "$dest_dir/$(basename "$src_file")"
  done
}

copy_tree() {
  local src_root="$1"
  local dst_root="$2"
  local src_file
  local rel_path

  [ -d "$src_root" ] || return 0

  while IFS= read -r src_file; do
    rel_path="${src_file#"$src_root"/}"
    copy_file_if_exists "$src_file" "$dst_root/$rel_path"
  done < <(cd "$src_root" && find . -type f -print | sed 's|^\./||')
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=1
      ;;
    --with-templates)
      WITH_TEMPLATES=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

warn_if_non_default_target

copy_glob "$REPO_ROOT/commands" "*.md" "$TARGET_ROOT/commands"
copy_tree "$REPO_ROOT/skills" "$TARGET_ROOT/skills"

template_src="$REPO_ROOT/templates/mr/MERGE_REQUEST.md"
template_dst="$TARGET_ROOT/templates/mr/MERGE_REQUEST.md"
if [ "$WITH_TEMPLATES" -eq 1 ] || [ -f "$template_dst" ]; then
  copy_file_if_exists "$template_src" "$template_dst"
fi

echo "Synced $SYNCED_COUNT files from $REPO_ROOT to $TARGET_ROOT"
