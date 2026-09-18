# Changelog

## 0.0.1 — First public release

TestPerch is an independent Chrome extension for managing your own Amplitude experiment and feature flag testing assignments.

### Available now

- Automatically connect to an existing, signed-in Amplitude Experiment tab.
- Select a project and see your own manual Testing assignments.
- Find existing experiments and feature flags by name or key.
- Add yourself to an available test variant, including custom variants.
- Switch your test variant or leave Testing to restore normal targeting.
- Refresh assignments every 30 seconds while the popup is visible; edits pause refresh.
- Use light, dark, or system appearance with keyboard-accessible menus.
- Disconnect with the exit icon; automatic reconnection stays paused until you reconnect.
- Try the interface with fictional data without changing an Amplitude account.

### Install and update

Download `testperch-v0.0.1.zip`, extract it to a permanent folder, then choose **Load unpacked** in `chrome://extensions` with Developer mode enabled. Choose the extracted `testperch` folder containing `manifest.json`.

Subscribe through **Watch → Custom → Releases**. Future releases include versioned ZIPs. Update the files in the same installation folder and click **Reload**. Unpacked extensions do not update automatically.

### Scope and limits

- Matches the current Amplitude account's exact email in individual Testing assignments; does not match device IDs or cohorts.
- Requires existing permission to edit the selected configuration. Other participants and rollout settings are preserved.
- Leaving Testing does not exclude you from a 100% rollout.
- Disconnecting TestPerch does not sign out of Amplitude or remove saved assignments.
- Keep the popup open while saving. Conflicts are surfaced without automatic retries; writes are checked with a fresh read.
- Uses internal Amplitude session endpoints. Not affiliated with or endorsed by Amplitude; compatibility can change. Chrome Web Store publication is on hold while integration and legal questions are clarified.

### Validation

27 automated tests cover identity checks, assignment preservation, custom variants, conflicts, read-back verification, session discovery, and persistent disconnect preferences. The search/join/leave flow and theme switching were checked with fictional demo data. An earlier authorized Dev test confirmed adding the current user and removing that assignment with an independent Amplitude read-back. Staging was checked read-only. EU hosting, multiple organizations, and competing live edits remain untested.
