# Changelog

## 0.0.2 — Custom testing identities

- Add multiple email/user/device IDs with the **person-plus icon next to the profile**.
- Independently include or exclude your own account with **Include me**. Up to 20 selected IDs; exact matching without automatic alias expansion.
- Remove ID chips from the view without changing their assignments. An empty selection never falls back to the signed-in account.
- View assignments for any selected ID, with each row labeled by its email or ID.
- Add, switch, or remove one ID at a time without changing other participants or rollout settings.
- Restore selected IDs within the current browser session for the same Amplitude account and organization; disconnect clears them.
- Try email aliases and device IDs with fictional demo data.
- Add contribution guidelines and clarify manual versus future Chrome Web Store updates.

Version 0.0.2 has been submitted to Chrome Web Store and is awaiting review, with automatic publication after approval. It is available now as an unpacked extension through GitHub Releases. Existing Amplitude permissions are required; archived configurations and cohort-based assignments remain excluded.

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

- Archived configurations are excluded.
- Matches the current Amplitude account's exact email in individual Testing assignments; does not match device IDs or cohorts.
- Requires existing permission to edit the selected configuration. Other participants and rollout settings are preserved.
- Leaving Testing does not exclude you from a 100% rollout.
- Disconnecting TestPerch does not sign out of Amplitude or remove saved assignments.
- Keep the popup open while saving. Conflicts are surfaced without automatic retries; writes are checked with a fresh read.
- Uses internal Amplitude session endpoints. Not affiliated with or endorsed by Amplitude; compatibility can change. Chrome Web Store publication is on hold while integration and legal questions are clarified.
