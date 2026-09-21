# Contributing to TestPerch

Bug reports and focused pull requests are welcome. For a larger feature or a change to Amplitude integration behavior, open an issue first so the scope and safety constraints are clear.

## Set up and test

Use Node.js 22.22.2+ on the 22.x line, 24.15+ on the 24.x line, or 26+.

```sh
npm ci
npm test
```

The complete suite must pass before a pull request is opened. Do not disable, skip, or weaken an existing test to make a change pass.

## Required coverage

Every behavior change must test its normal path, invalid input, and relevant failure paths. Every bug fix must include a regression test that fails without the fix.

Changes involving testing IDs or assignments must cover, where applicable:

- exact, case-sensitive ID matching and special characters such as `+`;
- multiple simultaneous IDs, deduplication, and the 20-ID limit;
- including and excluding the signed-in account;
- adding and removing the first or last additional ID;
- restoring the selected IDs only for the same Amplitude account and organization;
- changing exactly one selected ID while preserving all other participants;
- stale versions, read-back failures, unavailable variants, and interrupted requests;
- experiments and feature flags, including custom variant names;
- archived configurations remaining excluded.

Avoid tests that merely repeat implementation details. Assert the user-visible behavior and the exact request or preserved data when that is part of the contract.

## UI verification

DOM tests do not prove that the popup fits. Check the actual 480 × 600 Chrome popup in light and dark themes. Exercise open panels and help text, long IDs, 20 IDs, empty results, validation errors, keyboard navigation, focus, and scrolling. Nothing may overlap, clip essential controls, or move outside the popup.

Include screenshots or a short recording for a visual change. Use fictional data and remove real emails, device IDs, tokens, organization names, and company data.

## Safety and privacy

- Never commit credentials, session data, captured API responses, or private screenshots.
- Do not add telemetry, a backend, remote executable code, or broader host permissions without prior discussion.
- Do not modify shared or production Amplitude assignments while testing without explicit permission.
- Keep writes limited to Testing assignments. Never change rollout targeting.
- Preserve unrelated participants and verify the result after every write.
- Do not present TestPerch as affiliated with or endorsed by Amplitude.

## Pull request checklist

- Explain the user problem and the resulting behavior.
- Link the issue when one exists.
- Add or update tests and run the complete suite.
- Describe manual Chrome checks, including both themes for UI work.
- Keep the change focused and exclude generated dependencies, credentials, and private data.
- Leave version bumps, release tags, and Store publishing to the maintainer.

By contributing, you agree that your contribution is licensed under the repository's MIT license.
