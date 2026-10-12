#!/usr/bin/env bash
# Run the copy included at the root of nepos-tei-update.tar.gz with sudo.
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  printf 'Run this installer with sudo.\n' >&2
  exit 1
fi
payload_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
web_dir='/var/www/nepos/web'
if [[ ! -f "$payload_dir/SHA256SUMS" || ! -f "$payload_dir/web/index.html" ]]; then
  printf 'Extract nepos-tei-update.tar.gz first, then run its install-tei.sh.\n' >&2
  exit 1
fi
if [[ ! -f "$web_dir/index.html" || ! -d "$web_dir/assets" ]]; then
  printf 'The existing Nepos website was not found at %s. Nothing was installed.\n' "$web_dir" >&2
  exit 1
fi
if [[ "$web_dir" == "$payload_dir/web" ]]; then
  printf 'Extract the update in your home directory, outside the live website.\n' >&2
  exit 1
fi
(cd "$payload_dir" && sha256sum --check SHA256SUMS)
backup_dir="/var/www/nepos/web-backup-tei-$(date +%Y%m%d-%H%M%S)"
if [[ -e "$backup_dir" ]]; then
  printf 'Backup path already exists: %s. Run the installer again later.\n' "$backup_dir" >&2
  exit 1
fi
cp -a -- "$web_dir" "$backup_dir"
printf 'Backup created: %s\n' "$backup_dir"
install -d -m 0755 "$web_dir/tei"
install -m 0644 "$payload_dir/web/tei/nepos-assertions-tei.xml" "$web_dir/tei/nepos-assertions-tei.xml"
install -m 0644 "$payload_dir/web/tei/index.html" "$web_dir/tei/index.html"
for asset in "$payload_dir"/web/assets/*.js; do
  install -m 0644 "$asset" "$web_dir/assets/$(basename -- "$asset")"
done
# Activate the new script only after its assets and TEI resources are present.
temporary_index="$(mktemp "$web_dir/.index-tei-XXXXXX")"
trap 'rm -f -- "$temporary_index"' EXIT
install -m 0644 "$payload_dir/web/index.html" "$temporary_index"
mv -f -- "$temporary_index" "$web_dir/index.html"
trap - EXIT
printf 'TEI update installed. No API restart or configuration change was made.\n'
printf 'Open https://nepos.humanisticadigitalia.eu/tei/index.html\n'
printf 'If necessary, restore the previous entry page with:\n'
printf 'sudo cp -- %q %q\n' "$backup_dir/index.html" "$web_dir/index.html"
