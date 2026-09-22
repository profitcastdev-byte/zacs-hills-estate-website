#!/usr/bin/env bash
#
# Lets ONLY zacs-hills-estate.html out of the subdomain-wide noindex.
#
#   bash .claude/tools/enable-indexing.sh
#
# Why this is needed: the lp.zacsvalley.com vhost sends
#
#     add_header X-Robots-Tag "noindex, nofollow" always;
#
# at the server level and again inside `location ~* \.html$`. An HTTP noindex
# beats the page's own <meta name="robots" content="index, follow">, so without
# this change the canonical, schema, sitemap and llms.txt on the estate page are
# inert - Google and the AI crawlers will fetch it and refuse to index it.
#
# This adds an exact-match location for the one page. `location =` wins over the
# regex location regardless of where it sits in the file, and an add_header
# inside a location REPLACES every inherited add_header - which is exactly the
# mechanism used here to drop X-Robots-Tag while keeping the other three.
#
# The eight resort landing pages keep their noindex, because their rates, phone
# number and privacy policy are still unconfirmed per DEPLOYMENT-CHECKLIST.md.
#
# Safety: backs the vhost up first, runs `nginx -t` before reloading, and
# restores the backup if the test fails. This box runs ~26 client sites.

set -euo pipefail

HOST=root@187.127.149.216

ssh "$HOST" 'set -e
B=/etc/nginx/sites-available/zacsvalley-lp
BAK=$B.bak-$(date +%Y%m%d-%H%M%S)

if grep -q "location = /zacs-hills-estate.html" $B; then
  echo "Already present - nothing to do."
  exit 0
fi

cp -a $B $BAK
echo "Backup: $BAK"

cat > /tmp/hills-block.conf <<BLOCK

    # Zacs Hills Estate opts out of the subdomain-wide noindex above: it is
    # meant to rank. An add_header inside a location replaces every inherited
    # header, so the security and cache headers are repeated here on purpose.
    location = /zacs-hills-estate.html {
        add_header Cache-Control "no-cache, must-revalidate" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }
BLOCK

sed -i "/^    index kodaikanal-resorts\.html;$/r /tmp/hills-block.conf" $B
rm -f /tmp/hills-block.conf

if nginx -t; then
  systemctl reload nginx
  echo "RELOADED"
else
  cp -a $BAK $B
  echo "ROLLED BACK - config restored, nginx not reloaded"
  exit 1
fi'

echo
echo "Verifying headers:"
echo -n "  estate page  X-Robots-Tag: "
curl -sI https://lp.zacsvalley.com/zacs-hills-estate.html | grep -i '^x-robots-tag' || echo '(absent - indexable)'
echo -n "  a landing page X-Robots-Tag: "
curl -sI https://lp.zacsvalley.com/honeymoon-resort-kodaikanal.html | grep -i '^x-robots-tag' || echo '(absent - CHECK THIS, it should still be noindex)'
