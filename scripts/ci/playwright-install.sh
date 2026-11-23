#!/usr/bin/env bash
# Installs Playwright browsers and their system packages on a CI runner:
#   scripts/ci/playwright-install.sh chromium [webkit …]
#
# A dead Ubuntu mirror once kept `apt-get update` waiting until the job's 30 minutes ran out
# (beta run 45159623133). Here apt gives up on a silent mirror after 30 seconds, and each
# attempt is cut off after ATTEMPT_MINUTES (it normally takes well under one), then retried once.
set -uo pipefail

ATTEMPT_MINUTES=${ATTEMPT_MINUTES:-4}
ATTEMPTS=2

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <browser> [browser …]" >&2
  exit 2
fi

printf 'Acquire::Retries "3";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' |
  sudo tee /etc/apt/apt.conf.d/99ci-timeouts >/dev/null

for attempt in $(seq 1 "$ATTEMPTS"); do
  timeout --kill-after=30s "${ATTEMPT_MINUTES}m" \
    pnpm --filter @cocoar/playground exec playwright install --with-deps "$@"
  status=$?
  [ "$status" -eq 0 ] && exit 0
  if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then
    reason="timed out after ${ATTEMPT_MINUTES} minutes"
  else
    reason="failed with exit code $status"
  fi
  echo "::warning ::playwright install $* (attempt $attempt of $ATTEMPTS) $reason"
done

echo "::error ::playwright install $* failed $ATTEMPTS times"
exit 1
