#!/usr/bin/env bash
#
# Deploys Zacs Hills Estate to the Profitcast KVM.
#
#   bash .claude/tools/deploy.sh
#
# Run it from Git Bash (it needs ssh, scp and tar). Key-based access to the box
# is already set up; there is no password prompt.
#
# The box runs ~26 client sites and this docroot is SHARED with the eight Zacs
# Valley resort landing pages, so this script is deliberately add-only: it
# extracts over the docroot and never deletes. The five asset files whose names
# collide with the landing pages (the two logos, the two favicons, span-400.woff2)
# were verified byte-identical, so overwriting them is a no-op.
#
# The page ships as zacs-hills-estate.html, not index.html. This docroot has no
# index of its own on purpose: nginx 302s / to the first landing page.

set -euo pipefail

HOST=root@187.127.149.216
DOCROOT=/var/www/zacsvalley-lp
URL=https://lp.zacsvalley.com/zacs-hills-estate.html
REMOTE_TMP=/tmp/zacs-hills-estate.tgz

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE="$(mktemp -d)"
# The tarball lives outside STAGE, or tar would be writing into the tree it reads.
TARBALL="$(mktemp -d)/zacs-hills-estate.tgz"
trap 'rm -rf "$STAGE" "$(dirname "$TARBALL")"' EXIT

echo "Staging from $ROOT"
cp "$ROOT/index.html" "$STAGE/zacs-hills-estate.html"
cp "$ROOT/robots.txt" "$ROOT/sitemap.xml" "$ROOT/llms.txt" "$STAGE/"
cp -r "$ROOT/assets" "$STAGE/assets"

tar -czf "$TARBALL" -C "$STAGE" .
echo "Payload: $(du -h "$TARBALL" | cut -f1)"

echo "Uploading to $HOST"
scp -q "$TARBALL" "$HOST:$REMOTE_TMP"

echo "Extracting into $DOCROOT (add-only)"
ssh "$HOST" "set -euo pipefail
  tar -xzf '$REMOTE_TMP' -C '$DOCROOT'
  chown -R www-data:www-data '$DOCROOT'
  rm -f '$REMOTE_TMP'
  ls -la '$DOCROOT/zacs-hills-estate.html'"

echo
echo "Verifying"
printf 'IPv4  '; curl -s4 -o /dev/null -w '%{http_code}\n' "$URL"
printf 'IPv6  '; curl -s6 -o /dev/null -w '%{http_code}\n' "$URL"
printf 'robots.txt  '; curl -s -o /dev/null -w '%{http_code}\n' https://lp.zacsvalley.com/robots.txt
printf 'sitemap.xml '; curl -s -o /dev/null -w '%{http_code}\n' https://lp.zacsvalley.com/sitemap.xml

echo
echo -n 'X-Robots-Tag: '
curl -sI "$URL" | grep -i '^x-robots-tag' || echo '(absent - the page is indexable)'
echo
echo "Done: $URL"
