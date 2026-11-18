#!/bin/sh
set -e
echo "COPY satir sayisi:"
zcat /db/medusa.sql.gz | grep -c '^COPY public\.' || true
echo "--- onemli tablolar ---"
zcat /db/medusa.sql.gz | grep -o '^COPY public\.[a-z_\"]*' | sort -u | grep -E 'product|user|store_setting|sync_log|kinguin' | head -15
echo "--- surum/dosya sonu ---"
zcat /db/medusa.sql.gz | tail -5
