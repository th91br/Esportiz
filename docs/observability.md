# Observability

Esportiz reports browser failures through a privacy-first internal event model.
Every event is sanitized before it reaches a sink. Sensitive key names, email
addresses, bearer credentials, JWTs, and long payloads are redacted or bounded.

## Remote error reporting

Remote reporting is disabled by default. Set these variables in the deployment
environment to enable Sentry:

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_SAMPLE_RATE`
- `VITE_APP_RELEASE`

The browser loads the SDK only when a DSN is present. The adapter disables
default integrations, breadcrumbs, session replay, automatic stack attachment,
and default PII. It sends only the sanitized Esportiz event name, generated event
ID, level, message, and bounded sanitized context. Request cookies, bodies,
headers, user objects, URL query strings, and URL fragments are removed again in
`beforeSend` as defense in depth.

A Sentry project and DSN are external prerequisites. Source-map upload must be
configured only after a project-scoped Sentry token is stored in the deployment
secret manager; source maps must not be published as ordinary public assets.
