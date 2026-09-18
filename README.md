<p align="center"><img src="assets/icon.svg" width="72" alt="TestPerch bird on a perch" /></p>
<h1 align="center">TestPerch</h1>
<p align="center">Experiment & flag testing for Amplitude.</p>

An independent Chrome extension for your own Amplitude **Testing Assignments** and feature flag **Testing**. Find your assignments, choose any available variant, or leave a test. Light and dark themes included.

## What it does

- Connects to your existing Amplitude session without an API key.
- Shows your testing assignments by project.
- Searches existing experiments and feature flags by name or key.
- Adds you to a test group, switches variants, or removes only your assignment.
- Supports custom variants and refreshes while the popup is open.
- Includes **Try the demo** with fictional data; changes stay local.

## Video

https://github.com/user-attachments/assets/428f4f84-04e1-45dc-816d-6130aca37c52

Recorded with fictional data.

## Install

1. Open [**Releases**](https://github.com/skvortsov-dev/testperch/releases), download **`testperch-v<version>.zip`** from **Assets**, and unzip it into a permanent folder. You can also clone this repository.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
3. Open TestPerch. It connects automatically to an open, signed-in Amplitude Experiment tab. If needed, use **Sign in to Amplitude**, finish signing in, and reopen TestPerch.
4. Choose a project. **My tests** shows your assignments; **Find tests** searches existing experiments and flags in the selected project. Choose an available variant → **Add me to test**. For an existing assignment, use **Apply variant** to switch groups or **Leave test** to remove yourself.

Keep the popup open while saving. Leaving Testing restores normal targeting; it does not exclude you from a 100% rollout. Matching uses your exact Amplitude account email, not device IDs or cohort membership. The account must have permission to edit the configuration.

## Disconnect / switch account

Use the **exit icon** next to the theme button to disconnect from TestPerch. This clears the connection and pauses automatic reconnection, including after reopening the popup. **Check connection** resumes it. Your Amplitude session remains signed in; to switch accounts, sign out or switch accounts in Amplitude, then reconnect TestPerch.

## Updates

**Current version: 0.0.1.** Releases are distributed through **GitHub Releases** while legal and integration questions are being clarified. Chrome Web Store publication is on hold; this does not establish legal clearance for GitHub distribution.

Each published release will include an installable **`testperch-v<version>.zip`** and a SHA-256 checksum. The included GitHub Actions workflow runs tests, checks the version against the release tag, then attaches these assets.

Subscribe with **Watch → Custom → Releases** ([GitHub instructions](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications)). Download the latest release into the same installation folder, then click **Reload** at `chrome://extensions`. Git users can pull changes instead. Unpacked installations do not update automatically.

Assignment data refreshes every 30 seconds while the popup is visible, pausing during edits. Reopening loads fresh data. This is separate from installing a new extension version.

## Development

No runtime dependencies or build step. Use Node.js 20+ for tests:

```sh
npm test
python3 -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/` and choose **Try the demo**. Real account access works in the installed extension.

- `src/amplitude/` — session connector and guarded assignment changes.
- `src/popup/` — UI, connection, filters, menus, and preferences.
- `assets/` — shared bird icon and Chrome PNG sizes.
- `tests/` — mocked connector and UI-logic tests.

## Making a release

1. Set the same new version in `manifest.json` and `package.json`; update the version in the interface and this README.
2. Run `npm test` and `npm run package`. The ZIP appears in `dist/`.
3. Commit, push, and publish a GitHub Release with the matching tag, e.g. `v0.0.1`. The workflow attaches the ZIP and checksum automatically. Publication remains a deliberate maintainer action.

The local package contains the extension, documentation, and walkthrough video. It excludes Git history, tests, dependencies, and credentials. Node.js and Python are needed only to develop/package it, not to install the ZIP.

## Privacy & status

No telemetry, backend, or stored credentials. Uses the existing browser session and internal Amplitude endpoints, which can change without notice. Not affiliated with or endorsed by Amplitude.

[Privacy](PRIVACY.md) · [Integration review](API-DECISION.md) · [Legal notes](LEGAL-NOTES.md) · [MIT license](LICENSE)
