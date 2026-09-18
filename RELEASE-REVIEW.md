# Release scope

TestPerch 0.0.1 is an independent, MIT-licensed browser extension. It is distributed as source and an unpacked Chrome extension, not through Chrome Web Store.

The integration uses the signed-in Amplitude web session and internal application endpoints. It has not been endorsed or approved by Amplitude. Publishing this source does not establish permission under any customer's agreement. The applicable agreement and organizational tool policies remain the responsibility of each user and customer. See [Legal notes](LEGAL-NOTES.md) and [API decision](API-DECISION.md).

The extension changes only the current account email's individual Testing assignment. It preserves other participants, verifies writes with a fresh read, and does not retry conflicts. It does not change rollout rules, start experiments, or edit cohorts.

Automated validation and explicitly authorized live checks are summarized in [CHANGELOG.md](CHANGELOG.md). They are not a security audit or a guarantee of compatibility with future Amplitude versions. EU hosting, simultaneous live editors, and multiple organizations have not been live-tested.

The TestPerch name has not undergone trademark clearance. Chrome Web Store distribution remains on hold while integration and legal questions are clarified.
