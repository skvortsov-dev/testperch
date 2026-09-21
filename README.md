<p align="center"><img src="assets/icon.svg" width="72" alt="TestPerch bird on a perch" /></p>
<h1 align="center">TestPerch</h1>
<p align="center">Experiment & flag testing for Amplitude.</p>

An independent Chrome extension for QA engineers, developers, and product managers working with Amplitude **Testing Assignments** and feature flag **Testing**. Find assignments for your account or selected email/user/device IDs, choose a variant, or leave a test. Light and dark themes included.

## What it does

- Connects to your existing Amplitude session without an API key.
- Shows testing assignments by project for up to 20 selected email/user/device IDs, with or without your own account.
- Searches existing experiments and feature flags by name or key.
- Adds, switches, or removes one selected ID’s assignment at a time, preserving everyone else.
- Supports custom variants and refreshes while the popup is open.
- Includes **Try the demo** with fictional data; changes stay local.

## Video

https://github.com/user-attachments/assets/bb7856df-c188-47ba-bc09-d4ab5fbda031

33 seconds: switching a variant, joining a test, testing other IDs, and the dark theme. Recorded in **Try the demo** with fictional data in version 0.0.2.

## Install

1. Open [**Releases**](https://github.com/skvortsov-dev/testperch/releases), download **`testperch-v<version>.zip`** from **Assets**, and unzip it into a permanent folder. You can also clone this repository.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
3. Open TestPerch. It connects automatically to an open, signed-in Amplitude Experiment tab. If needed, use **Sign in to Amplitude**, finish signing in, and reopen TestPerch.
4. Choose a project. **My tests** shows your assignments; **Find tests** searches existing experiments and flags in the selected project. Choose an available variant → **Add me to test**. For an existing assignment, use **Apply variant** to switch groups or **Leave test** to remove yourself.

Keep the popup open until a save finishes. Leaving Testing restores normal targeting; it does not exclude you from a 100% rollout. IDs are matched exactly; cohorts and automatic rollout participation are not included. Archived configurations are excluded. The account must have permission to edit the configuration.

## Test another account or device

Click the **person-plus icon next to your profile**. In the compact **Testing IDs** panel, enter one email or device ID and press **Enter** or **Add**. Repeat to add more; existing IDs stay selected. Pasting a comma-separated or multiline list is also supported. You can select up to 20 IDs in total.

**Include me** appears after you add another ID and lets you include or exclude your signed-in email. Removing the last additional ID returns the view to your own account and hides the toggle. **Done**, **Escape**, or clicking outside closes the panel. The **×** beside an ID only removes it from this view; it does not change any testing assignments.

**Assigned tests** shows configurations matching any selected ID. Each assignment is labeled with its ID; each save or removal affects only that row. **Find tests** also lets you assign selected IDs that are not yet in a test. Use the exact ID the application sends to Amplitude; the extension does not look up emails from device IDs or expand aliases automatically. Your Amplitude account's permissions still apply.

Selected IDs are remembered for the current browser session and the same Amplitude account/organization. Disconnect clears them. To try this in demo mode, use `alex+checkout@example.com` and `demo-device-01`.

## Disconnect / switch account

Use the **exit icon** next to the theme button to disconnect from TestPerch. This clears the connection and pauses automatic reconnection, including after reopening the popup. **Check connection** resumes it. Your Amplitude session remains signed in; to switch accounts, sign out or switch accounts in Amplitude, then reconnect TestPerch.

## Updates

**Current version: 0.0.2.** Install from **GitHub Releases** for now. Version 0.0.2 has been submitted to Chrome Web Store and is awaiting review. It is set to publish automatically after approval; Store installation is not available yet.

Once available, Store installations will receive approved updates automatically through Chrome. Delivery is not instant, and unpacked installations will need to be replaced by the Store version to use Store updates.

Each published release will include an installable **`testperch-v<version>.zip`** and a SHA-256 checksum.

Subscribe with **Watch → Custom → Releases** ([GitHub instructions](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications)). Download the latest release into the same installation folder, then click **Reload** at `chrome://extensions`. Git users can pull changes instead. Unpacked installations do not update automatically.

Assignment data refreshes every 30 seconds while the popup is visible, pausing during edits. Reopening loads fresh data. This is separate from installing a new extension version.

## Contributing

Bug reports and focused pull requests are welcome. Every behavior change needs tests, and UI changes must also be checked in the actual 480 × 600 Chrome popup in both themes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the required test matrix, privacy rules, and pull request checklist.

## Privacy & status

No telemetry, backend, or stored credentials. Uses the existing browser session and internal Amplitude endpoints, which can change without notice. Not affiliated with or endorsed by Amplitude.

[Contributing](CONTRIBUTING.md) · [Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
