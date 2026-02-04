#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"

stop_one() {
  local name="$1"
  local pid_file="$LOG_DIR/${name}.pid"
  [[ -f "$pid_file" ]] || { echo "[stop] ${name}: no pid file"; return 0; }

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "${pid}" ]] || { rm -f "$pid_file"; echo "[stop] ${name}: empty pid file removed"; return 0; }

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    rm -f "$pid_file"
    echo "[stop] ${name}: not running; pid file removed"
    return 0
  fi

  echo "[stop] ${name} (pid ${pid})"

  # If started with setsid, pid is a session leader; try to kill the whole process group.
  kill -TERM "-${pid}" >/dev/null 2>&1 || kill -TERM "${pid}" >/dev/null 2>&1 || true

  for _ in $(seq 1 30); do
    if kill -0 "$pid" >/dev/null 2>&1; then
      sleep 0.2
    else
      break
    fi
  done

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[stop] ${name}: forcing kill"
    kill -KILL "-${pid}" >/dev/null 2>&1 || kill -KILL "${pid}" >/dev/null 2>&1 || true
  fi

  rm -f "$pid_file"
}

stop_one "api"
stop_one "shared"

echo "[stop] done"
