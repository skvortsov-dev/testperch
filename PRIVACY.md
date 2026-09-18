# Privacy

TestPerch is a local Chrome extension. It has no analytics, telemetry, advertising, or developer-operated backend.

On opening TestPerch, it checks open Amplitude tabs for a ready session and automatically connects, preferring the last connected tab. While waiting for sign-in, lightweight readiness checks run every five seconds only while the extension window is visible. No background sign-in watcher is installed.

On connection, user actions, and automatic refresh while the popup is visible, a script runs in the selected Amplitude tab and uses that tab's existing session to request account, project, deployment, configuration, variant, and testing-assignment data from Amplitude. The tab processes assignment lists, which may include other participants' identifiers, to preserve them during changes. Only the current account, configuration metadata, available variants, and the current user's memberships are returned to the popup.

Cookies, passwords, API keys, and tokens are not extracted or stored by TestPerch. The browser attaches existing session credentials to same-origin requests. The extension does not send data to its developer or other third parties. Requests to Amplitude remain subject to its policies and the customer's agreement.

Assignment data is held in popup memory only. The theme preference and whether automatic connection is allowed are saved locally. Disconnect clears connection metadata and disables automatic connection until the user explicitly reconnects. It does not sign the user out of Amplitude. The selected tab ID and project ID are saved in Chrome session storage to reconnect during the current browser session. No credentials or assignment records are persisted. The storage permission also permits removing legacy API-key settings. Scripting and host permissions are limited to app.amplitude.com and app.eu.amplitude.com.

Demo data is fictional and changes only local in-memory state. Uninstalling the extension does not undo assignments already saved in Amplitude.
