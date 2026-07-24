#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

TARGET_ROOT="${OPENCODE_HOME:-$HOME/.config/opencode}"
DRY_RUN=0
WITH_RUNTIME_DEPS=0
WITH_PDF_ENGINES=0
WITH_SYSTEM_DEPS=0
AUTO_NODE=0
SEED_AGENTS_DIR=""
PROMPT_SEED_AGENTS=1
NODE_RUNTIME_SKIPPED=0
NODE_MIN_VERSION="20.17"
PYTHON_MIN_VERSION="3.10"
SYNCED_COUNT=0

usage() {
  cat <<'EOF'
Usage: bash bin/install-opencode-conductor.sh [options]

Sync OpenCode kit files from this repository into ~/.config/opencode.

Seeds or safely merges opencode.json, then syncs rules/, commands/, skills/,
templates/, and tools-off/. Known legacy tool files under tools/ and lib/ are
archived under backups/. Existing user configuration and project files are preserved.

Options:
  -n, --dry-run              Show planned copy operations without writing
  --with-templates           Deprecated compatibility no-op; templates always sync
  --with-runtime-deps        Create/update the central runtime (Python >= 3.10; Node >= 20.17)
  --with-system-deps         With --with-runtime-deps, install missing artifact system tools
                             automatically where supported
  --with-pdf-engines         With --with-runtime-deps, install optional Python PDF-engine deps
                             for convert-to-pdf. System engines remain user-managed.
  --auto-node                With --with-runtime-deps, install/use Node 20.17 via nvm or fnm when
                             the active Node is too old; otherwise skip Node packages and continue
  --seed-agents DIR          Seed a generic AGENTS.md into an existing project directory
                             without overwriting an existing file
  --no-seed-agents           Do not offer the interactive AGENTS.md seed prompt
  -h, --help                 Show this help message
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

validate_target_root() {
  TARGET_ROOT="$(expand_user_path "$TARGET_ROOT")"
  case "$TARGET_ROOT" in
    ""|"/"|"."|"$HOME")
      echo "Error: refusing unsafe OPENCODE_HOME target '$TARGET_ROOT'." >&2
      exit 1
      ;;
  esac
  case "$TARGET_ROOT" in
    /*) ;;
    *)
      echo "Error: OPENCODE_HOME must be an absolute path or begin with ~/." >&2
      exit 1
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
  if path_has_symlink_component "$dest"; then
    echo "Warning: preserved destination reached through a symlink: $dest" >&2
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

expand_user_path() {
  local input="$1"

  case "$input" in
    "~")
      printf '%s\n' "$HOME"
      ;;
    "~/"*)
      printf '%s/%s\n' "$HOME" "${input#~/}"
      ;;
    *)
      printf '%s\n' "$input"
      ;;
  esac
}

path_has_symlink_component() {
  local candidate="$1"
  local relative
  local current="$TARGET_ROOT"
  local component
  local old_ifs
  local components=()

  case "$candidate" in
    "$TARGET_ROOT"/*)
      relative="${candidate#"$TARGET_ROOT"/}"
      ;;
    *)
      return 1
      ;;
  esac

  old_ifs="$IFS"
  IFS='/'
  read -r -a components <<< "$relative"
  IFS="$old_ifs"
  for component in "${components[@]}"; do
    [ -n "$component" ] || continue
    current="$current/$component"
    if [ -L "$current" ]; then
      return 0
    fi
  done
  return 1
}

should_skip_source_file() {
  case "$1" in
    .DS_Store|*/.DS_Store|*.pyc|*/__pycache__/*)
      return 0
      ;;
  esac
  return 1
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
  local rel_path

  [ -d "$src_root" ] || return 0

  while IFS= read -r rel_path; do
    [ -n "$rel_path" ] || continue
    should_skip_source_file "$rel_path" && continue
    copy_file_if_exists "$src_root/$rel_path" "$dst_root/$rel_path"
  done < <(cd "$src_root" && find . -type f -print | sed 's|^\./||')
}

run_or_echo() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf 'Would run:'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

shell_quote() {
  printf "'%s'" "$(printf "%s" "$1" | sed "s/'/'\\\\''/g")"
}

read_manifest_items() {
  local manifest="$1"

  [ -f "$manifest" ] || return 0
  sed -e 's/#.*$//' -e '/^[[:space:]]*$/d' "$manifest"
}

resolve_soffice_path() {
  if [ -n "${OPENCODE_SOFFICE:-}" ] && [ -x "${OPENCODE_SOFFICE/#\~/$HOME}" ]; then
    printf '%s\n' "${OPENCODE_SOFFICE/#\~/$HOME}"
    return 0
  fi

  if command -v soffice >/dev/null 2>&1; then
    command -v soffice
    return 0
  fi

  if command -v libreoffice >/dev/null 2>&1; then
    command -v libreoffice
    return 0
  fi

  if [ -x /Applications/LibreOffice.app/Contents/MacOS/soffice ]; then
    printf '%s\n' /Applications/LibreOffice.app/Contents/MacOS/soffice
    return 0
  fi

  return 1
}

write_text_file() {
  local dest="$1"
  local mode="$2"
  local content="$3"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would write $dest"
    return 0
  fi
  if path_has_symlink_component "$dest"; then
    echo "Error: refusing runtime write through a symlink: $dest" >&2
    return 1
  fi

  mkdir -p "$(dirname "$dest")"
  printf '%s\n' "$content" > "$dest"
  chmod "$mode" "$dest"
}

write_runtime_environment_files() {
  local runtime_bin="$TARGET_ROOT/bin"
  local runtime_python="$TARGET_ROOT/.venv/bin/python"
  local runtime_pip="$TARGET_ROOT/.venv/bin/pip"
  local node_prefix="$TARGET_ROOT/runtime/node"
  local node_modules="$node_prefix/node_modules"
  local soffice_path=""
  local quoted_target
  local quoted_python
  local quoted_node_modules
  local quoted_soffice

  if soffice_path="$(resolve_soffice_path)"; then
    :
  else
    soffice_path=""
  fi

  quoted_target="$(shell_quote "$TARGET_ROOT")"
  quoted_python="$(shell_quote "$runtime_python")"
  quoted_node_modules="$(shell_quote "$node_modules")"
  quoted_soffice="$(shell_quote "$soffice_path")"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would create $runtime_bin"
  else
    mkdir -p "$runtime_bin"
  fi

  write_text_file "$TARGET_ROOT/runtime.env" 600 "# Generated by bin/install-opencode-conductor.sh --with-runtime-deps
OPENCODE_HOME=$quoted_target
OPENCODE_PYTHON=$quoted_python
OPENCODE_PIP=$(shell_quote "$runtime_pip")
OPENCODE_NODE_MODULES=$quoted_node_modules
OPENCODE_NPM_PREFIX=$(shell_quote "$node_prefix")
OPENCODE_BIN=$(shell_quote "$runtime_bin")
OPENCODE_SOFFICE=$quoted_soffice
NODE_PATH=$quoted_node_modules"

  write_text_file "$TARGET_ROOT/runtime-env.sh" 755 "# Generated by bin/install-opencode-conductor.sh --with-runtime-deps
export OPENCODE_HOME=$quoted_target
export OPENCODE_PYTHON=$quoted_python
export OPENCODE_PIP=$(shell_quote "$runtime_pip")
export OPENCODE_NODE_MODULES=$quoted_node_modules
export OPENCODE_NPM_PREFIX=$(shell_quote "$node_prefix")
export OPENCODE_BIN=$(shell_quote "$runtime_bin")
export OPENCODE_SOFFICE=$quoted_soffice
export NODE_PATH=\"\$OPENCODE_NODE_MODULES\${NODE_PATH:+:\$NODE_PATH}\"
case \":\$PATH:\" in
  *\":\$OPENCODE_BIN:\"*) ;;
  *) PATH=\"\$OPENCODE_BIN:\$OPENCODE_HOME/.venv/bin:\$PATH\" ;;
esac
export PATH"

  write_text_file "$runtime_bin/opencode-python" 755 "#!/usr/bin/env sh
exec $quoted_python \"\$@\""

  write_text_file "$runtime_bin/opencode-pip" 755 "#!/usr/bin/env sh
exec $quoted_python -m pip \"\$@\""

  write_text_file "$runtime_bin/opencode-node" 755 "#!/usr/bin/env sh
export NODE_PATH=$quoted_node_modules\${NODE_PATH:+:\$NODE_PATH}
exec node \"\$@\""

  write_text_file "$runtime_bin/opencode-npm" 755 "#!/usr/bin/env sh
exec npm --prefix $(shell_quote "$node_prefix") \"\$@\""
}

setup_python_runtime_deps() {
  local python_requirements="$REPO_ROOT/runtime/python-requirements.txt"
  local runtime_python="$TARGET_ROOT/.venv/bin/python"
  local bootstrap_python

  if ! bootstrap_python="$(resolve_bootstrap_python)"; then
    echo "Error: Python $PYTHON_MIN_VERSION or newer is required for --with-runtime-deps." >&2
    echo "       Install a current Python or set OPENCODE_PYTHON_BOOTSTRAP to its executable." >&2
    return 1
  fi
  echo "Using $bootstrap_python ($("$bootstrap_python" --version 2>&1)) for the central Python runtime"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would create or reuse Python venv at $TARGET_ROOT/.venv"
  else
    mkdir -p "$TARGET_ROOT"
    if [ ! -x "$runtime_python" ]; then
      "$bootstrap_python" -m venv "$TARGET_ROOT/.venv"
    fi
  fi

  run_or_echo "$runtime_python" -m pip install --upgrade pip setuptools wheel
  run_or_echo "$runtime_python" -m pip install -r "$python_requirements"
}

python_version_meets_minimum() {
  local candidate="$1"
  "$candidate" -c '
import sys
raise SystemExit(0 if sys.version_info >= (3, 10) else 1)
' >/dev/null 2>&1
}

resolve_bootstrap_python() {
  local candidate
  if [ -n "${OPENCODE_PYTHON_BOOTSTRAP:-}" ]; then
    if command -v "$OPENCODE_PYTHON_BOOTSTRAP" >/dev/null 2>&1 && python_version_meets_minimum "$OPENCODE_PYTHON_BOOTSTRAP"; then
      command -v "$OPENCODE_PYTHON_BOOTSTRAP"
      return 0
    fi
    return 1
  fi

  for candidate in python3 python3.13 python3.12 python3.11 python3.10; do
    if command -v "$candidate" >/dev/null 2>&1 && python_version_meets_minimum "$candidate"; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

get_node_version() {
  if command -v node >/dev/null 2>&1; then
    node -p "process.versions.node"
  else
    printf 'unknown\n'
  fi
}

node_version_meets_minimum() {
  command -v node >/dev/null 2>&1 || return 1
  node -e '
const v = process.versions.node.split(".").map(Number);
const min = [20, 17, 0];
const ok =
  v[0] > min[0] ||
  (v[0] === min[0] && (v[1] > min[1] || (v[1] === min[1] && v[2] >= min[2])));
process.exit(ok ? 0 : 1);
' >/dev/null 2>&1
}

load_nvm_if_available() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  return 1
}

try_auto_node() {
  local node_version="$1"

  if load_nvm_if_available; then
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "Would run: nvm install $NODE_MIN_VERSION && nvm use $NODE_MIN_VERSION"
      return 0
    fi
    if nvm install "$NODE_MIN_VERSION" && nvm use "$NODE_MIN_VERSION"; then
      echo "  + switched to Node $(get_node_version) via nvm"
      return 0
    fi
  elif command -v fnm >/dev/null 2>&1; then
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "Would run: fnm install $NODE_MIN_VERSION && fnm use $NODE_MIN_VERSION"
      return 0
    fi
    # shellcheck disable=SC1090
    eval "$(fnm env)"
    if fnm install "$NODE_MIN_VERSION" && fnm use "$NODE_MIN_VERSION"; then
      echo "  + switched to Node $(get_node_version) via fnm"
      return 0
    fi
  elif [ "$DRY_RUN" -eq 1 ]; then
    echo "Warning: --auto-node requested but neither nvm nor fnm is available; would skip Node runtime install."
    return 1
  fi

  echo "Warning: --auto-node could not install Node $NODE_MIN_VERSION; skipping Node runtime packages." >&2
  return 1
}

skip_node_runtime() {
  local node_version="$1"
  local reason="$2"

  NODE_RUNTIME_SKIPPED=1
  echo "Warning: skipping Node runtime install ($reason)." >&2
  echo "         Node $node_version is below $NODE_MIN_VERSION for artifact packages such as pdfjs-dist." >&2
  echo "         Python and system tools will still be configured." >&2
  echo "         Fix: nvm install $NODE_MIN_VERSION && nvm use $NODE_MIN_VERSION && bash bin/install-opencode-conductor.sh --with-runtime-deps" >&2
  echo "         Or:  bash bin/install-opencode-conductor.sh --with-runtime-deps --auto-node" >&2
  return 0
}

print_runtime_summary() {
  if [ "$NODE_RUNTIME_SKIPPED" -ne 1 ]; then
    return 0
  fi

  echo ""
  echo "Runtime summary:"
  echo "  ✓ Python runtime configured"
  echo "  ✓ System tools checked"
  echo "  ✓ Runtime wrappers generated"
  echo "  ⚠ Node runtime skipped — pptx/docx/pdfjs helpers need Node >= $NODE_MIN_VERSION"
}

setup_node_runtime_deps() {
  local node_manifest="$REPO_ROOT/runtime/node-packages.txt"
  local node_packages=()
  local package_name
  local node_version

  node_version="$(get_node_version)"

  if ! command -v npm >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
    skip_node_runtime "$node_version" "node/npm not found on PATH"
    return 0
  fi

  if ! node_version_meets_minimum; then
    if [ "$AUTO_NODE" -eq 1 ]; then
      if try_auto_node "$node_version"; then
        if [ "$DRY_RUN" -eq 1 ]; then
          :
        elif node_version_meets_minimum; then
          node_version="$(get_node_version)"
        else
          skip_node_runtime "$node_version" "active Node is below $NODE_MIN_VERSION and --auto-node could not upgrade it"
          return 0
        fi
      else
        if [ "$DRY_RUN" -eq 1 ]; then
          return 0
        fi
        skip_node_runtime "$node_version" "active Node is below $NODE_MIN_VERSION and --auto-node could not upgrade it"
        return 0
      fi
    else
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "Warning: Node $node_version is below $NODE_MIN_VERSION; would skip Node runtime install (pass --auto-node to upgrade via nvm/fnm)."
        return 0
      fi
      skip_node_runtime "$node_version" "active Node is below $NODE_MIN_VERSION"
      return 0
    fi
  fi

  while IFS= read -r package_name; do
    node_packages+=("$package_name")
  done < <(read_manifest_items "$node_manifest")
  if [ "${#node_packages[@]}" -eq 0 ]; then
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would install Node runtime packages into $TARGET_ROOT/runtime/node"
  else
    mkdir -p "$TARGET_ROOT/runtime/node"
  fi
  run_or_echo npm --prefix "$TARGET_ROOT/runtime/node" install "${node_packages[@]}"
}

setup_homebrew_runtime_deps() {
  local formulas=(poppler qpdf tesseract pandoc coreutils)
  local missing_formulae=()
  local formula

  if [ "$(uname -s)" != "Darwin" ]; then
    echo "Note: automatic system dependency installation is macOS/Homebrew-only."
    echo "      Install LibreOffice, Poppler, qpdf, Tesseract, pandoc, and GNU coreutils with your OS package manager."
    return 0
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "Warning: Homebrew not found; install LibreOffice, Poppler, qpdf, Tesseract, pandoc, and coreutils manually."
    return 0
  fi

  for formula in "${formulas[@]}"; do
    if ! brew list --formula "$formula" >/dev/null 2>&1; then
      missing_formulae+=("$formula")
    fi
  done

  if [ "${#missing_formulae[@]}" -gt 0 ]; then
    run_or_echo brew install "${missing_formulae[@]}"
  fi

  if ! resolve_soffice_path >/dev/null 2>&1; then
    run_or_echo brew install --cask libreoffice
  fi
}

setup_pdf_engine_deps() {
  echo "Installing optional PDF-engine dependencies for the convert-to-pdf skill"
  local engine_requirements="$REPO_ROOT/runtime/python-requirements-pdf-engines.txt"
  local runtime_python="$TARGET_ROOT/.venv/bin/python"

  # WeasyPrint (and any future Python engines) install into the central venv.
  if [ ! -f "$engine_requirements" ]; then
    echo "Warning: $engine_requirements not found; skipping Python engine deps."
  elif [ ! -x "$runtime_python" ] && [ "$DRY_RUN" -ne 1 ]; then
    echo "Error: central runtime venv missing. Run with --with-runtime-deps first." >&2
    return 1
  else
    run_or_echo "$runtime_python" -m pip install -r "$engine_requirements"
  fi

  echo "Note: install wkhtmltopdf, a LaTeX engine, Chrome/Chromium, and mermaid-filter"
  echo "      separately if you select conversion engines that need them."
}

setup_runtime_deps() {
  local runtime_path
  for runtime_path in \
    "$TARGET_ROOT/.venv" \
    "$TARGET_ROOT/bin" \
    "$TARGET_ROOT/runtime" \
    "$TARGET_ROOT/runtime.env" \
    "$TARGET_ROOT/runtime-env.sh"
  do
    if path_has_symlink_component "$runtime_path"; then
      echo "Error: refusing runtime setup through a symlink: $runtime_path" >&2
      return 1
    fi
  done
  echo "Setting up central OpenCode runtime dependencies in $TARGET_ROOT"
  NODE_RUNTIME_SKIPPED=0
  setup_python_runtime_deps
  setup_node_runtime_deps
  if [ "$WITH_SYSTEM_DEPS" -eq 1 ]; then
    setup_homebrew_runtime_deps
  else
    echo "Note: system artifact tools were not changed; pass --with-system-deps to install supported dependencies."
  fi
  write_runtime_environment_files
  print_runtime_summary
}

merge_opencode_json() {
  local src="$REPO_ROOT/opencode.json.template"
  local dest="$TARGET_ROOT/opencode.json"
  local dest_dir
  local merge_result
  local config_prefix="$TARGET_ROOT"
  local default_root="$HOME/.config/opencode"

  [ -f "$src" ] || return 0
  if [ "$TARGET_ROOT" = "$default_root" ]; then
    config_prefix="~/.config/opencode"
  fi

  if [ -L "$dest" ]; then
    echo "Warning: preserved symlink $dest. Merge missing kit keys into its target manually." >&2
    return 0
  fi

  dest_dir=$(dirname "$dest")

  if [ ! -f "$dest" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "Would seed $dest from $src"
      SYNCED_COUNT=$((SYNCED_COUNT + 1))
      return 0
    fi

    if command -v python3 >/dev/null 2>&1; then
      python3 - "$src" "$dest" "$config_prefix" <<'PY'
import json
import os
import sys
import tempfile

template_path, dest_path, config_prefix = sys.argv[1:4]

def relocate(value):
    default = "~/.config/opencode"
    if isinstance(value, str):
        return config_prefix + value[len(default):] if value == default or value.startswith(default + "/") else value
    if isinstance(value, list):
        return [relocate(item) for item in value]
    if isinstance(value, dict):
        return {relocate(key): relocate(item) for key, item in value.items()}
    return value

with open(template_path, "r", encoding="utf-8") as handle:
    template = relocate(json.load(handle))

dest_dir = os.path.dirname(dest_path) or "."
os.makedirs(dest_dir, exist_ok=True)
fd, temporary = tempfile.mkstemp(prefix=".opencode-json.", suffix=".tmp", dir=dest_dir, text=True)
try:
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(template, handle, indent=2)
        handle.write("\n")
    os.replace(temporary, dest_path)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
PY
    elif [ "$TARGET_ROOT" = "$default_root" ]; then
      mkdir -p "$dest_dir"
      cp "$src" "$dest"
    else
      echo "Warning: python3 is required to render opencode.json for custom target $TARGET_ROOT." >&2
      return 0
    fi
    chmod 600 "$dest"
    SYNCED_COUNT=$((SYNCED_COUNT + 1))
    echo "  + seeded opencode.json from template (edit local provider setup before use)"
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "Warning: python3 not found; preserved existing $dest. Manually merge missing keys from $src."
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    merge_result=$(python3 - "$src" "$dest" "check" "$config_prefix" <<'PY'
import copy
import json
import sys

template_path, dest_path, mode, config_prefix = sys.argv[1:5]

def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)

def relocate(value):
    default = "~/.config/opencode"
    if isinstance(value, str):
        return config_prefix + value[len(default):] if value == default or value.startswith(default + "/") else value
    if isinstance(value, list):
        return [relocate(item) for item in value]
    if isinstance(value, dict):
        return {relocate(key): relocate(item) for key, item in value.items()}
    return value

def merge_missing(template, target, path=()):
    changed = False
    if not isinstance(template, dict) or not isinstance(target, dict):
        return False
    for key, value in template.items():
        current_path = path + (key,)
        if key not in target:
            target[key] = copy.deepcopy(value)
            changed = True
            continue
        if current_path == ("provider",):
            # Existing provider settings may contain local names and secrets. Do not
            # add placeholder providers into an already configured local file.
            continue
        if isinstance(value, dict) and isinstance(target[key], dict):
            changed = merge_missing(value, target[key], current_path) or changed
        elif isinstance(value, list) and isinstance(target[key], list):
            for item in value:
                if isinstance(item, str) and item not in target[key]:
                    target[key].append(item)
                    changed = True
    return changed

template = relocate(load_json(template_path))
target = load_json(dest_path)
print("changed" if merge_missing(template, target) else "unchanged")
PY
    ) || {
      echo "Warning: could not parse existing $dest; preserved it. Manually merge missing keys from $src."
      return 0
    }
    if [ "$merge_result" = "changed" ]; then
      echo "Would merge missing kit keys into $dest (existing values preserved)"
      SYNCED_COUNT=$((SYNCED_COUNT + 1))
    fi
    return 0
  fi

  merge_result=$(python3 - "$src" "$dest" "write" "$config_prefix" <<'PY'
import copy
import json
import os
import sys
import tempfile

template_path, dest_path, mode, config_prefix = sys.argv[1:5]

def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)

def relocate(value):
    default = "~/.config/opencode"
    if isinstance(value, str):
        return config_prefix + value[len(default):] if value == default or value.startswith(default + "/") else value
    if isinstance(value, list):
        return [relocate(item) for item in value]
    if isinstance(value, dict):
        return {relocate(key): relocate(item) for key, item in value.items()}
    return value

def merge_missing(template, target, path=()):
    changed = False
    if not isinstance(template, dict) or not isinstance(target, dict):
        return False
    for key, value in template.items():
        current_path = path + (key,)
        if key not in target:
            target[key] = copy.deepcopy(value)
            changed = True
            continue
        if current_path == ("provider",):
            # Existing provider settings may contain local names and secrets. Do not
            # add placeholder providers into an already configured local file.
            continue
        if isinstance(value, dict) and isinstance(target[key], dict):
            changed = merge_missing(value, target[key], current_path) or changed
        elif isinstance(value, list) and isinstance(target[key], list):
            for item in value:
                if isinstance(item, str) and item not in target[key]:
                    target[key].append(item)
                    changed = True
    return changed

template = relocate(load_json(template_path))
target = load_json(dest_path)
changed = merge_missing(template, target)
if changed:
    dest_dir = os.path.dirname(dest_path) or "."
    fd, tmp_path = tempfile.mkstemp(prefix=".opencode-json.", suffix=".tmp", dir=dest_dir, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(target, handle, indent=2)
            handle.write("\n")
        os.replace(tmp_path, dest_path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
print("changed" if changed else "unchanged")
PY
  ) || {
    echo "Warning: could not parse existing $dest; preserved it. Manually merge missing keys from $src."
    return 0
  }

  chmod 600 "$dest"
  if [ "$merge_result" = "changed" ]; then
    SYNCED_COUNT=$((SYNCED_COUNT + 1))
    echo "  + merged missing kit keys into opencode.json (existing local values preserved)"
  fi
}

archive_stale_file() {
  local source_path="$1"
  local category="$2"
  local backup_dir="$TARGET_ROOT/backups/opencode-conductor/legacy"
  local backup_path="$backup_dir/$category-$(basename "$source_path")"

  if path_has_symlink_component "$source_path"; then
    echo "Warning: preserved stale path reached through a symlink: $source_path" >&2
    return 0
  fi
  if path_has_symlink_component "$backup_dir"; then
    echo "Warning: preserved stale file because the backup path contains a symlink: $backup_dir" >&2
    return 0
  fi
  [ -f "$source_path" ] || return 0

  if [ -e "$backup_path" ]; then
    backup_path="$backup_path.$(date -u +%Y%m%dT%H%M%SZ).$$"
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would archive stale $source_path -> $backup_path"
    return 0
  fi
  mkdir -p "$backup_dir"
  mv "$source_path" "$backup_path"
  echo "  − archived stale $source_path -> $backup_path"
}

remove_stale_kit_tool_paths() {
  local f
  for f in \
    "$TARGET_ROOT/tools/_opencode_engine.ts" \
    "$TARGET_ROOT/tools/opencode_bootstrap_branch.ts" \
    "$TARGET_ROOT/tools/opencode_refresh_context.ts" \
    "$TARGET_ROOT/lib/_opencode_engine.ts"
  do
    archive_stale_file "$f" "tool"
  done
}

remove_stale_metadata_files() {
  local dir
  local f
  for dir in \
    "$TARGET_ROOT/rules" \
    "$TARGET_ROOT/commands" \
    "$TARGET_ROOT/skills" \
    "$TARGET_ROOT/tools" \
    "$TARGET_ROOT/tools-off" \
    "$TARGET_ROOT/templates"
  do
    [ -d "$dir" ] || continue
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "Would remove metadata file $f"
      else
        rm -f "$f"
        echo "  − removed metadata file $f"
      fi
    done < <(find "$dir" -name .DS_Store -type f -print)
  done
}

remove_stale_commands() {
  local stale_command
  local removed_collection_command="scaffold""-collection.md"

  for stale_command in \
    "$TARGET_ROOT/commands/$removed_collection_command"
  do
    archive_stale_file "$stale_command" "command"
  done
}

seed_generic_agents() {
  local requested_dir="$1"
  local expanded_dir
  local resolved_dir
  local source_file="$REPO_ROOT/project-rules/AGENTS.md"
  local destination

  [ -f "$source_file" ] || {
    echo "Warning: generic AGENTS.md template is missing; skipping project guidance seed." >&2
    return 0
  }

  expanded_dir="$(expand_user_path "$requested_dir")"
  if [ ! -d "$expanded_dir" ]; then
    echo "Warning: AGENTS.md target directory does not exist: $expanded_dir" >&2
    return 0
  fi
  resolved_dir="$(cd "$expanded_dir" && pwd -P)"
  case "$resolved_dir" in
    "/"|"$HOME")
      echo "Warning: refusing to seed project guidance into broad directory $resolved_dir" >&2
      return 0
      ;;
  esac
  destination="$resolved_dir/AGENTS.md"

  if [ -e "$destination" ] || [ -L "$destination" ]; then
    echo "Preserved existing $destination"
    return 0
  fi

  copy_file_if_exists "$source_file" "$destination"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would seed generic project guidance at $destination"
  else
    echo "  + seeded generic project guidance at $destination"
  fi
}

offer_generic_agents_seed() {
  local answer
  local target_dir

  if [ -n "$SEED_AGENTS_DIR" ]; then
    seed_generic_agents "$SEED_AGENTS_DIR"
    return 0
  fi
  [ "$PROMPT_SEED_AGENTS" -eq 1 ] || return 0
  [ -t 0 ] && [ -t 1 ] || return 0

  printf 'Seed a generic AGENTS.md into an existing project directory? [y/N] '
  IFS= read -r answer
  case "$answer" in
    y|Y|yes|YES)
      printf 'Target directory (project root or a specific source subtree): '
      IFS= read -r target_dir
      [ -n "$target_dir" ] && seed_generic_agents "$target_dir"
      ;;
  esac
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=1
      ;;
    --with-templates)
      echo "Note: --with-templates is no longer needed; templates always sync."
      ;;
    --with-runtime-deps)
      WITH_RUNTIME_DEPS=1
      ;;
    --with-pdf-engines)
      WITH_PDF_ENGINES=1
      ;;
    --with-system-deps)
      WITH_SYSTEM_DEPS=1
      ;;
    --auto-node)
      AUTO_NODE=1
      ;;
    --seed-agents)
      if [ "$#" -lt 2 ]; then
        echo "Error: --seed-agents requires a directory." >&2
        exit 1
      fi
      SEED_AGENTS_DIR="$2"
      shift
      ;;
    --no-seed-agents)
      PROMPT_SEED_AGENTS=0
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

if [ "$AUTO_NODE" -eq 1 ] && [ "$WITH_RUNTIME_DEPS" -ne 1 ]; then
  echo "Error: --auto-node requires --with-runtime-deps." >&2
  usage >&2
  exit 1
fi

if [ "$WITH_PDF_ENGINES" -eq 1 ] && [ "$WITH_RUNTIME_DEPS" -ne 1 ]; then
  echo "Error: --with-pdf-engines requires --with-runtime-deps." >&2
  usage >&2
  exit 1
fi

if [ "$WITH_SYSTEM_DEPS" -eq 1 ] && [ "$WITH_RUNTIME_DEPS" -ne 1 ]; then
  echo "Error: --with-system-deps requires --with-runtime-deps." >&2
  usage >&2
  exit 1
fi

validate_target_root
warn_if_non_default_target

merge_opencode_json
remove_stale_commands
remove_stale_metadata_files
copy_glob "$REPO_ROOT/rules" "*.md" "$TARGET_ROOT/rules"
copy_glob "$REPO_ROOT/commands" "*.md" "$TARGET_ROOT/commands"
copy_tree "$REPO_ROOT/skills" "$TARGET_ROOT/skills"
remove_stale_kit_tool_paths
copy_tree "$REPO_ROOT/tools-off" "$TARGET_ROOT/tools-off"

copy_tree "$REPO_ROOT/templates/mr" "$TARGET_ROOT/templates/mr"
copy_tree "$REPO_ROOT/templates/knowledge" "$TARGET_ROOT/templates/knowledge"
copy_tree "$REPO_ROOT/project-rules" "$TARGET_ROOT/project-rules"
copy_tree "$REPO_ROOT/runtime" "$TARGET_ROOT/runtime"
offer_generic_agents_seed

if [ "$WITH_RUNTIME_DEPS" -eq 1 ]; then
  setup_runtime_deps
fi

if [ "$WITH_PDF_ENGINES" -eq 1 ]; then
  setup_pdf_engine_deps
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Would sync $SYNCED_COUNT files from $REPO_ROOT to $TARGET_ROOT"
else
  echo "Synced $SYNCED_COUNT files from $REPO_ROOT to $TARGET_ROOT"
fi
echo "Note: Tool sources are in $TARGET_ROOT/tools-off/ and are not auto-registered."
echo "      Enable them deliberately when your host supports custom tools; otherwise use /manual-refresh"
echo "      and the manual fallback documented by /project-bootstrap."
echo "Note: Review $TARGET_ROOT/opencode.json locally. Add provider setup and secrets there only;"
echo "      this installer preserves existing local values and does not print provider headers or tokens."
echo "Note: Runtime dependencies are installed only when you pass --with-runtime-deps."
