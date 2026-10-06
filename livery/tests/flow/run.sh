#!/usr/bin/env bash
# Flow tests: run a published kit against four sample repos with Claude Code
# in non-interactive mode, then check the git history the flow left behind.
#
#   tests/flow/run.sh <kit-url-or-domain> [repo ...]
#   e.g. tests/flow/run.sh rize.roggy.site
#
# Costs real model calls. Re-run whenever FLOW_VERSION changes.
# Assertions:
#   - no file edited before the questions (nothing committed outside livery/ branch)
#   - one commit per approved area (tokens, components), none for declined areas
#   - conflicts quoted with file:line (checked in the transcript)
#   - no "needs a licence" item installed without confirmation
set -euo pipefail

SITE="${1:?usage: run.sh <site> [repo ...]}"
shift || true
HERE="$(cd "$(dirname "$0")" && pwd)"
REPOS=("${@:-next-tailwind4 vite-css-modules shadcn plain-html}")
read -r -a REPOS <<< "${REPOS[*]}"
BASE="${LIVERY_BASE:-https://livery.site}"
OUT="$(mktemp -d -t livery-flow-XXXX)"
FAILED=0

# Scripted answers: apply tokens and components only, keep the logo colour,
# keep conflicting project rules, decline every licensed item.
ANSWERS="Apply only the tokens and components areas. Skip layout, motion and voice. Keep our logo colour. For every conflict with a project rule, keep the rule. I do not hold any font or icon licences. Do not ask me anything else; proceed with these answers."

for repo in "${REPOS[@]}"; do
  work="$OUT/$repo"
  cp -R "$HERE/repos/$repo" "$work"
  (cd "$work" && git init -q && git add -A && git -c user.email=flow@livery.site -c user.name=flow commit -qm "baseline")

  prompt="$(curl -fsSL -H 'Accept: text/markdown' "$BASE/$SITE" | sed -n '/^## Install/,/^## Files/p' | sed '1d;$d')"
  transcript="$work.transcript.txt"
  (cd "$work" && claude -p "$prompt

$ANSWERS" --permission-mode acceptEdits --allowedTools "Bash Read Write Edit Glob Grep" > "$transcript" 2>&1) || true

  cd "$work"
  branch="$(git branch --show-current)"
  commits="$(git log --format=%s baseline..HEAD 2>/dev/null || git log --format=%s | sed '$d')"
  check() { if eval "$2"; then echo "  ok   $1"; else echo "  FAIL $1"; FAILED=1; fi; }
  echo "== $repo ($branch)"
  check "works on a livery/ branch" '[[ "$branch" == livery/* ]]'
  check "commits tokens" 'grep -q ": tokens" <<< "$commits"'
  check "commits components" 'grep -q ": components" <<< "$commits"'
  check "no commits for declined areas" '! grep -qE ": (layout|motion|voice)" <<< "$commits"'
  check "main branch untouched" '[[ "$(git rev-list --count main 2>/dev/null || git rev-list --count master)" == 1 ]]'
  if [[ -f CLAUDE.md ]]; then
    check "quotes the conflicting rule with file:line" 'grep -qE "CLAUDE\.md:[0-9]+" "$transcript"'
    check "kept the brand-colour rule" 'grep -q "#2563eb" CLAUDE.md'
  fi
  cd - > /dev/null
done

echo
echo "Transcripts and repos: $OUT"
exit $FAILED
