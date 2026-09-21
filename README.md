<p align="center"><img src="assets/icon.svg" width="72" alt="TestPerch bird on a perch" /></p>
<h1 align="center">TestPerch</h1>
<p align="center">Experiment & flag testing for Amplitude.</p>

An independent Chrome extension for Amplitude **Testing Assignments** and feature flag **Testing**. Find assignments for your account or selected email/user/device IDs, choose a variant, or leave a test. Light and dark themes included.

## What it does

- Connects to your existing Amplitude session without an API key.
- Shows testing assignments by project for up to 20 selected email/user/device IDs, with or without your own account.
- Searches existing experiments and feature flags by name or key.
- Adds, switches, or removes one selected ID’s assignment at a time, preserving everyone else.
- Supports custom variants and refreshes while the popup is open.
- Includes **Try the demo** with fictional data; changes stay local.

## Video

https://github.com/user-attachments/assets/428f4f84-04e1-45dc-816d-6130aca37c52

Recorded with fictional data in version 0.0.1. Version 0.0.2 also supports custom testing IDs.

## Install

1. Open [**Releases**](https://github.com/skvortsov-dev/testperch/releases), download **`testperch-v<version>.zip`** from **Assets**, and unzip it into a permanent folder. You can also clone this repository.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
3. Open TestPerch. It connects automatically to an open, signed-in Amplitude Experiment tab. If needed, use **Sign in to Amplitude**, finish signing in, and reopen TestPerch.
4. Choose a project. **My tests** shows your assignments; **Find tests** searches existing experiments and flags in the selected project. Choose an available variant → **Add me to test**. For an existing assignment, use **Apply variant** to switch groups or **Leave test** to remove yourself.

Keep the popup open while saving. Leaving Testing restores normal targeting; it does not exclude you from a 100% rollout. IDs are matched exactly; cohorts and automatic rollout participation are not included. Archived configurations are excluded. The account must have permission to edit the configuration.

## Test another account or device

Click the **person-plus icon next to your profile**, paste additional emails or user/device IDs (one per line or separated by commas), and click **Apply**. Use **Include me** to include or exclude your signed-in email independently. You can select up to 20 IDs in total.

The **×** on an ID chip removes it from the view only; it does not change any testing assignments. If no IDs are selected, nothing is queried until you add an ID or enable **Include me**.

**Assigned tests** shows configurations matching any selected ID. Each assignment is labeled with its ID; each save or removal affects only that row. **Find tests** also lets you assign selected IDs that are not yet in a test. Use the exact ID the application sends to Amplitude; the extension does not look up emails from device IDs or expand aliases automatically. Your Amplitude account's permissions still apply.

Selected IDs are remembered for the current browser session and the same Amplitude account/organization. Disconnect clears them. To try this in demo mode, use `alex+checkout@example.com` and `demo-device-01`.

## Disconnect / switch account

Use the **exit icon** next to the theme button to disconnect from TestPerch. This clears the connection and pauses automatic reconnection, including after reopening the popup. **Check connection** resumes it. Your Amplitude session remains signed in; to switch accounts, sign out or switch accounts in Amplitude, then reconnect TestPerch.

## Updates

**Current version: 0.0.2.** Install from **GitHub Releases** for now. Chrome Web Store publication is being prepared; there is no Store listing yet.

Once available, Store installations will receive approved updates automatically through Chrome. Delivery is not instant, and unpacked installations will need to be replaced by the Store version to use Store updates.

Each published release will include an installable **`testperch-v<version>.zip`** and a SHA-256 checksum.

Subscribe with **Watch → Custom → Releases** ([GitHub instructions](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications)). Download the latest release into the same installation folder, then click **Reload** at `chrome://extensions`. Git users can pull changes instead. Unpacked installations do not update automatically.

Assignment data refreshes every 30 seconds while the popup is visible, pausing during edits. Reopening loads fresh data. This is separate from installing a new extension version.

## Contributing

Bug reports and focused pull requests are welcome. For larger changes, open an issue first. Include reproduction steps, expected behavior, Chrome and extension versions; remove real emails, device IDs, tokens, and company data from examples and screenshots.

Fork the repository, make your change on a branch, and run `npm ci` and `npm test` with Node.js 22.22.2+ (22.x), 24.15+ (24.x), or 26+. Add regression tests for behavior changes and check the UI in both themes. Use demo fixtures for tests; do not modify shared Amplitude assignments without explicit permission. Keep changes limited to Testing, preserve unrelated participants, and never commit credentials or remote executable code. Contributions use the MIT license. Maintainers handle version bumps and numbered releases.

## Privacy & status

No telemetry, backend, or stored credentials. Uses the existing browser session and internal Amplitude endpoints, which can change without notice. Not affiliated with or endorsed by Amplitude.

[Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
