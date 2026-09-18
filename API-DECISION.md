# Supported API and release decision

September 18, 2026. Product name changed from Starling to TestPerch; no functional connector change was made.

## Verified capability gap

The [Developer API update-feature-flag reference](https://amplitude.com/docs/apis/developer/feature-flags/update-feature-flag) states that variant, tester, deployment, and link mutations are intended for later dedicated subresources. Its documented update body covers metadata and rollout settings, not tester assignments. The public search index exposed this reference; a subsequent direct page fetch failed. This is evidence of a documented gap, not a live account capability test.

The [Developer API authentication documentation](https://amplitude.com/docs/apis/developer) supports OAuth device authorization. That does not demonstrate that its token works with the separate Experiment Management API. Do not interchange tokens or promise full OAuth-based testing management without documentation or provider confirmation.

The [Experiment Management API](https://amplitude.com/docs/apis/experiment/experiment-management-api) documents separate Management API keys. Its [flag endpoints](https://amplitude.com/docs/apis/experiment/experiment-management-api-flags) include reading variant inclusions and adding/removing users. This is the documented candidate for our testing-assignment operations.

## Product consequence

A supported implementation may require users to provision an authorized Management API key and identify their test-user email. A key should not be assumed to identify the currently logged-in employee or provide the same account/project experience as a browser session. Key permissions, accessible projects, email identity, and safe handling need explicit design and validation.

Moving between variants may require multiple documented calls. Plan for partial failures, read-back verification, and concurrent edits; do not claim atomic moves unless the chosen API guarantees them. Any key provided to a client can be inspected by its owner. UI restrictions to editing only oneself do not narrow the server-side permissions of that key. Never embed a shared company key in a distributed build.

Recommendation: do not present the undocumented-session version as cleared for public distribution. Use a documented API under the applicable agreement, or obtain written permission that specifically covers the existing mechanism. An official API reduces the particular uncertainty around reverse-engineered endpoints; it is not blanket legal clearance.

## Naming screen

TestPerch is the selected name. A preliminary exact-name web query on September 18, 2026 did not surface a relevant software product. No trademark register search, phonetic/similarity search, or domain-availability check has been completed for TestPerch. Earlier, broader name screening applied to the former working name Flagfinch, not TestPerch. This is not trademark clearance.
