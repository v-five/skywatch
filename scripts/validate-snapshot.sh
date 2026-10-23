#!/bin/sh
# Prints `claude plugin validate`'s hooks notes in a stable form, so a refactor can diff them against the baseline.
# Needs jq. Each note's list is sorted, since hook registration order depends on how handlers are grouped.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
json=$(claude plugin validate "$root/claude-code" --json)

printf '%s\n' "$json" | jq -e '.success' >/dev/null
printf '%s\n' "$json" |
  jq -r '.contents[] | select(.type == "hooks") | .notes[]' |
  sed -E 's#^\./[^ ]+ ##; s# \(via [^)]*\)##g' |
  awk '{
    title = $0; sub(/: .*$/, "", title)
    list = $0; sub(/^[^:]*: /, "", list)
    count = 0; depth = 0; item = ""
    for (pos = 1; pos <= length(list); pos++) {
      char = substr(list, pos, 1)
      if (char == "{") depth++
      if (char == "}") depth--
      if (char == "," && depth == 0) { items[++count] = item; item = ""; pos++; continue }
      item = item char
    }
    items[++count] = item
    for (next_index = 2; next_index <= count; next_index++) {
      value = items[next_index]; prev = next_index - 1
      while (prev > 0 && items[prev] > value) { items[prev + 1] = items[prev]; prev-- }
      items[prev + 1] = value
    }
    joined = items[1]; for (pos = 2; pos <= count; pos++) joined = joined ", " items[pos]
    print title ": " joined
  }' |
  sort
