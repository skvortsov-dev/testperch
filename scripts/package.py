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
files += list(ROOT.glob('*.md'))
for folder in ('src', 'assets', 'docs'):
    files += [p for p in (ROOT / folder).rglob('*') if p.is_file() and not p.name.startswith('.')]
for icon in manifest['icons'].values():
    if not (ROOT / icon).is_file():
        parser.error(f'Missing icon: {icon}')

destination = ROOT / 'dist'
destination.mkdir(exist_ok=True)
archive = destination / f'testperch-v{version}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for file in sorted(set(files)):
        if file.is_symlink():
            parser.error(f'Refusing to package a symlink: {file}')
        output.write(file, Path('testperch') / file.relative_to(ROOT))
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{checksum}  {archive.name}\n')
print(archive)
