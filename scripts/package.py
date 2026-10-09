#!/usr/bin/env python3
"""Build the installable release ZIP using only Python's standard library."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--tag', help='Expected release tag, such as v0.0.1')
parser.add_argument('--store', action='store_true', help='Build a runtime-only ZIP with manifest.json at the root for Chrome Web Store')
args = parser.parse_args()
manifest = json.loads((ROOT / 'manifest.json').read_text())
package = json.loads((ROOT / 'package.json').read_text())
version = manifest['version']
if not re.fullmatch(r'\d+\.\d+\.\d+(?:\.\d+)?', version):
    parser.error('Invalid extension version')
if package['version'] != version:
    parser.error('manifest.json and package.json versions must match')
if args.tag and args.tag != f'v{version}':
    parser.error(f'Release tag must be v{version}')

# An explicit list keeps credentials, Git history, build files, and dependencies out.
files = [ROOT / name for name in ('manifest.json', 'index.html', 'style.css', 'LICENSE')]
if not args.store:
    files += [ROOT / name for name in ('README.md', 'CONTRIBUTING.md', 'PRIVACY.md', 'CHANGELOG.md')]
for folder in (('src', 'assets') if args.store else ('src', 'assets', 'docs')):
    files += [p for p in (ROOT / folder).rglob('*') if p.is_file() and not p.name.startswith('.')]
for icon in manifest['icons'].values():
    if not (ROOT / icon).is_file():
        parser.error(f'Missing icon: {icon}')

destination = ROOT / 'dist'
destination.mkdir(exist_ok=True)
suffix = '-webstore' if args.store else ''
archive = destination / f'testperch-v{version}{suffix}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for file in sorted(set(files)):
        if file.is_symlink():
            parser.error(f'Refusing to package a symlink: {file}')
        relative = file.relative_to(ROOT)
        output.write(file, relative if args.store else Path('testperch') / relative)
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{checksum}  {archive.name}\n')
print(archive)
