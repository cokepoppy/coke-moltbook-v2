#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$LOG_DIR"

has_cmd() { command -v "$1" >/dev/null 2>&1; }

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "${pid}" ]] || return 1
  kill -0 "$pid" >/dev/null 2>&1
}

start_one() {
  local name="$1"
  local cmd="$2"
  local pid_file="$LOG_DIR/${name}.pid"
  local log_file="$LOG_DIR/${name}.log"

  if is_running "$pid_file"; then
    echo "[start] ${name} already running (pid $(cat "$pid_file"))"
    return 0
  fi

  echo "[start] ${name} -> ${log_file}"
  : >>"$log_file"

  if has_cmd setsid; then
    (
      cd "$ROOT_DIR"
      setsid bash -lc "unset NODE_OPTIONS; $cmd" >>"$log_file" 2>&1 &
      echo $! >"$pid_file"
    )
  else
    (
      cd "$ROOT_DIR"
      bash -lc "unset NODE_OPTIONS; $cmd" >>"$log_file" 2>&1 &
      echo $! >"$pid_file"
    )
  fi

  sleep 0.2
  if is_running "$pid_file"; then
    echo "[start] ${name} started (pid $(cat "$pid_file"))"
  else
    echo "[start] ${name} failed to start; check ${log_file}"
    exit 1
  fi
}

echo "[start] ensuring MySQL is up"
(cd "$ROOT_DIR" && pnpm db:up >/dev/null)

start_one "shared" "pnpm --filter @moltbook/shared dev"
start_one "api" "pnpm --filter @moltbook/api dev"

echo "[start] done"
