# Release considerations

Reviewed public sources on September 18, 2026. This is an engineering risk note, not legal advice or clearance to publish.

## Internal session integration

The extension calls undocumented GraphQL endpoints and reads web application state. Amplitude's [Terms of Service](https://www.amplitude.com/terms), section 2.2, restrict reverse engineering and certain other uses. Its [Acceptable Use Policy](https://www.amplitude.com/aup) also addresses reverse engineering, automated access, service limitations, and unauthorized access. These provisions could affect this integration; an authenticated session does not itself resolve contractual permission.

The public Terms distinguish customers with separate paid agreements. The actual company agreement, applicable law, and organizational policies must be checked before drawing conclusions for a particular account. Potential consequences can include access suspension or a contractual dispute; the existence of a restriction is not by itself a conclusion about criminal liability.

Before public distribution, seek Amplitude's written clarification for the integration or evaluate a documented API approach. The official [Experiment Management API](https://amplitude.com/docs/apis/experiment/experiment-management-api-flags) documents reading, adding, and removing variant users, but has different credentials and permission requirements. Using that API still requires compliance with the applicable agreement.

## Company and publication

Confirm authorization to connect tools to the work account and ownership of code developed in a work context. Do not publish company identifiers, captured responses, credentials, internal screenshots, or Amplitude implementation bundles. Open-source licensing does not override service terms or employer intellectual-property rights.

TestPerch uses independent branding and an affiliation disclaimer. Its name is provisional: trademark and marketplace availability have not been cleared. Review these and Chrome Web Store privacy/permission requirements before a public launch, with counsel where appropriate.
