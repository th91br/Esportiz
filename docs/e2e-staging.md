# Authenticated E2E staging

The authenticated Playwright journey must run only against a dedicated,
non-production Esportiz environment with an account reserved for automation.

Required environment variables:

- `E2E_STAGING_BASE_URL`
- `E2E_STAGING_EMAIL`
- `E2E_STAGING_PASSWORD`

Run the journey with:

```powershell
npm run test:e2e:staging
```

The test reads the protected payments route, creates an empty comanda with a
unique name, validates that it was persisted, and removes it before finishing.
It skips when the staging variables are absent, preventing accidental use of
the production project.