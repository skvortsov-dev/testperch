<p align="center"><img src="assets/icon.svg" width="72" alt="TestPerch bird on a perch" /></p>
<h1 align="center">TestPerch</h1>
<p align="center">Experiment & flag testing for Amplitude.</p>

An independent Chrome extension for QA engineers, developers, and product managers working with Amplitude **Testing Assignments** and feature flag **Testing**. Find assignments for your account or selected email/user/device IDs, choose a variant, or leave a test. Light and dark themes included.

## What it does

- Connects to your existing Amplitude session without an API key.
- Shows testing assignments by project for up to 20 selected email/user/device IDs, with or without your own account.
- Searches existing experiments and feature flags by name or key, and opens any of them on its Amplitude page in one click.
- Lives in Chrome's side panel: stays open across tab switches, shows the last snapshot instantly, and refreshes in the background.
- Adds, switches, or removes one selected ID’s assignment at a time, preserving everyone else.
- Supports custom variants and refreshes while the side panel is open.
- Includes **Try the demo** with fictional data; changes stay local.

## Video

https://github.com/user-attachments/assets/87f0036e-9b5d-4473-bc6b-d3cb4d8bdfcf

19 seconds: the side panel, Testing IDs with a device ID, assignments per identity, search with one-click clearing, and both themes. Recorded from the installed extension in **Try the demo** with fictional data.

## Install

1. Install [**TestPerch from the Chrome Web Store**](https://chromewebstore.google.com/detail/testperch/mdnkmboonnachlkkjcogeeiphohfnofl). To install a specific version unpacked instead, download **`testperch-v<version>.zip`** from [**Releases**](https://github.com/skvortsov-dev/testperch/releases) (or clone this repository), unzip it into a permanent folder, then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
2. Click the TestPerch toolbar icon to open its side panel. It stays open while you switch tabs or reload the page and connects automatically to an open, signed-in Amplitude Experiment tab. If needed, use **Sign in to Amplitude**, finish signing in, and return to the TestPerch panel.
3. Choose a project. **My tests** shows your assignments; **Find tests** searches existing experiments and flags in the selected project. Choose an available variant → **Add me to test**. For an existing assignment, use **Apply variant** to switch groups or **Leave test** to remove yourself.

Keep the panel open until a save finishes. Leaving Testing restores normal targeting; it does not exclude you from a 100% rollout. IDs are matched exactly; cohorts and automatic rollout participation are not included. Archived configurations are excluded. The account must have permission to edit the configuration.

## Test another account or device

Click the **person-plus icon next to your profile**. In the compact **Testing IDs** popover, enter one email or device ID and press **Enter** or **Add**. Repeat to add more; existing IDs stay selected. Pasting a comma-separated or multiline list is also supported. You can select up to 20 IDs in total.

**Include my account** is always available inside the popover and lets you include or exclude your signed-in email while another ID is selected. Removing the last additional ID returns the view to your own account. **Escape**, clicking outside, or clicking the person-plus icon again closes the popover. The **×** beside an ID only removes it from this view; it does not change any testing assignments.

**Assigned tests** shows configurations matching any selected ID. Each assignment is labeled with its ID; each save or removal affects only that row. **Find tests** also lets you assign an ID that is not yet in a test; choose it from the compact **Testing ID** selector on the configuration. This keeps large projects responsive even with 20 selected IDs. Use the exact ID the application sends to Amplitude; the extension does not look up emails from device IDs or expand aliases automatically. Your Amplitude account's permissions still apply.

Selected IDs are remembered for the current browser session and the same Amplitude account/organization. Disconnect clears them. To try this in demo mode, use `alex+checkout@example.com` and `demo-device-01`.

## Disconnect / switch account

Use the **exit icon** next to the theme button to disconnect from TestPerch. This clears the connection and pauses automatic reconnection, including after reopening the panel. **Check connection** resumes it. Your Amplitude session remains signed in; to switch accounts, sign out or switch accounts in Amplitude, then reconnect TestPerch.

## Updates

Install from the [**Chrome Web Store**](https://chromewebstore.google.com/detail/testperch/mdnkmboonnachlkkjcogeeiphohfnofl): Store installations receive each approved update automatically, and what changed is always in the [Changelog](CHANGELOG.md). Delivery is not instant, and unpacked installations need to be replaced by the Store version to use Store updates.

Each published release will include an installable **`testperch-v<version>.zip`** and a SHA-256 checksum.

Subscribe with **Watch → Custom → Releases** ([GitHub instructions](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications)). Download the latest release into the same installation folder, then click **Reload** at `chrome://extensions`. Git users can pull changes instead. Unpacked installations do not update automatically.

Assignment data refreshes every five minutes in the background when an authorized Amplitude tab is ready, and every 30 seconds while the side panel is visible. Opening the panel shows the latest browser-session snapshot immediately and quietly verifies the Amplitude account; a recent snapshot avoids another catalog request. If the original Amplitude tab closes, TestPerch adopts another authorized Amplitude tab. If the session expires, cached results stay visible but read-only until **Reconnect** succeeds. This is separate from installing a new extension version.

## Contributing

Bug reports and focused pull requests are welcome. Every behavior change needs tests, and UI changes must also be checked in the resizable Chrome side panel in both themes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the required test matrix, privacy rules, and pull request checklist.

## Privacy & status

No telemetry, backend, or stored credentials. Uses the existing browser session and internal Amplitude endpoints, which can change without notice. Not affiliated with or endorsed by Amplitude.

[Contributing](CONTRIBUTING.md) · [Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
