#!/usr/bin/env bash
# Installs Playwright browsers and their system packages on a CI runner:
#   scripts/ci/playwright-install.sh chromium [webkit …]
#
# A dead Ubuntu mirror once kept `apt-get update` silent until the job's 30 minutes ran out
# (beta run 45159623133). A slow mirror is normal, though: healthy installs have taken up to
# 14 minutes. So an attempt is stopped only when it writes nothing for STALL_SECONDS, and then
# retried once; apt itself gives up on a silent connection after 30 seconds.
set -uo pipefail

STALL_SECONDS=${STALL_SECONDS:-300}
ATTEMPTS=2

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <browser> [browser …]" >&2
  exit 2
fi

# The lock timeout lets a retry wait for a dpkg that a stopped attempt left behind.
printf '%s\n' 'Acquire::Retries "3";' 'Acquire::http::Timeout "30";' 'Acquire::https::Timeout "30";' \
  'DPkg::Lock::Timeout "300";' | sudo tee /etc/apt/apt.conf.d/99ci-timeouts >/dev/null

log=$(mktemp)
trap 'rm -f "$log"' EXIT

# Runs one attempt; returns its exit code, or 124 when it wrote nothing for STALL_SECONDS.
attempt() {
  : >"$log"
  setsid pnpm --filter @cocoar/playground exec playwright install --with-deps "$@" > >(tee -a "$log") 2>&1 &
  local pid=$! size=-1 quiet=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 5
    local now
    now=$(stat -c %s "$log")
    if [ "$now" = "$size" ]; then quiet=$((quiet + 5)); else quiet=0; size=$now; fi
    if [ "$quiet" -ge "$STALL_SECONDS" ]; then
      kill -TERM -- "-$pid" 2>/dev/null
      # apt runs under sudo in a session of its own: the group signal does not reach it.
      sudo pkill -TERM -x apt-get
      sleep 5
      kill -KILL -- "-$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      return 124
    fi
  done
  wait "$pid"
}

for n in $(seq 1 "$ATTEMPTS"); do
  attempt "$@"
  status=$?
  [ "$status" -eq 0 ] && exit 0
  if [ "$status" -eq 124 ]; then
    reason="wrote nothing for ${STALL_SECONDS} seconds and was stopped"
  else
    reason="failed with exit code $status"
  fi
  echo "::warning ::playwright install $* (attempt $n of $ATTEMPTS) $reason"
done

echo "::error ::playwright install $* failed $ATTEMPTS times"
exit 1
