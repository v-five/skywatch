#!/bin/sh
# Regenerates claude-code/tests/support/golden.ts by running the pre-refactor modules over tests/support/corpus/.
# Usage: sh scripts/golden.sh [git ref of the pre-refactor code, default 39dcedb]
set -eu

ref=${1:-39dcedb}
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

git -C "$root" archive "$ref" claude-code | tar -x -C "$work"
mkdir -p "$work/claude-code/tests/support"
cp -R "$root/claude-code/tests/support/corpus" "$work/claude-code/tests/support/"
cp "$root/scripts/golden/print-golden.test.ts" "$work/claude-code/tests/"

if ! claude plugin test "$work/claude-code" >"$work/output.txt" 2>&1; then
  cat "$work/output.txt" >&2
  exit 1
fi
node "$root/scripts/golden/write-golden.mjs" "$work/output.txt" "$root/claude-code/tests/support/golden.ts" "$ref"
