import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);

test("install and Store archives include all runtime files and exclude dev/private files", () => {
  execFileSync(
    "python3",
    [
      "-c",
      `
import json, subprocess, zipfile
from pathlib import Path
manifest=json.loads(Path('manifest.json').read_text())
version=manifest['version']
assert 'class="beta"' not in Path('index.html').read_text()
assert manifest['background']=={'service_worker':'src/background.js','type':'module'}
assert 'alarms' in manifest['permissions']
assert 'sidePanel' in manifest['permissions']
assert manifest['side_panel']=={'default_path':'index.html'}
assert 'default_popup' not in manifest['action']
assert int(manifest['minimum_chrome_version']) >= 114
assert Path(manifest['background']['service_worker']).is_file()
for store in (False, True):
    subprocess.run(['python3','scripts/package.py']+(['--store'] if store else []),check=True,capture_output=True)
    suffix='-webstore' if store else ''
    prefix='' if store else 'testperch/'
    with zipfile.ZipFile(f'dist/testperch-v{version}{suffix}.zip') as z:
        names=set(z.namelist())
        assert json.loads(z.read(prefix+'manifest.json'))==manifest
        assert all(prefix+p in names for p in ['index.html','style.css',*manifest['icons'].values()])
        assert all(prefix+str(p) in names for p in Path('src').rglob('*.js'))
        assert not any(any(part in n for part in ['node_modules/','tests/','.git','TEST-REPORT','RELEASE-REVIEW','INQUIRY','package-lock','scripts/']) for n in names)
        demo_media=['assets/testperch-side-panel-demo.gif','assets/testperch-side-panel-demo.mp4']
        if store:
            assert not any(n.startswith('docs/') or n.endswith('.md') for n in names)
            assert not any(n in names for n in demo_media)
        else:
            assert all(prefix+n in names for n in ['README.md','CONTRIBUTING.md',*demo_media])
`,
    ],
    { cwd: root },
  );
});

test("packaging rejects a release tag that disagrees with the manifest", () => {
  const result = spawnSync(
    "python3",
    ["scripts/package.py", "--tag", "v999.0.0"],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Release tag must be/);
});
