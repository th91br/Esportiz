# Authenticated E2E staging

The authenticated Playwright journey runs only against a dedicated,
non-production Supabase environment with an account reserved for automation.
The application under test is built from the current branch, so a protected
Vercel preview is not required by CI.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `E2E_STAGING_EMAIL`
- `E2E_STAGING_PASSWORD`
- `SUPABASE_STAGING_PROJECT_REF`
- `E2E_FORBIDDEN_SUPABASE_PROJECT_REF`

`E2E_STAGING_BASE_URL` is optional. Leave it unset in CI so Playwright starts
the code from the current branch locally while connecting it to the dedicated
staging Supabase project. A protected Vercel URL may be used for a manual smoke
test, but it is not the CI default.

Run the local branch journey with:

```powershell
npm run check:staging-env
npm run test:staging-env
npm run test:e2e:staging:local
```

The test reads the protected payments route, creates an empty comanda with a
unique name, validates persistence, and cancels it before finishing. Its
`finally` cleanup repeats the official cancellation flow when an assertion
fails after creation.

The environment validator fails before Playwright starts when credentials are
missing, project refs disagree, or the configured Supabase URL points to the
known production project. The browser test skips without credentials only for
ordinary local regression runs; the GitHub Actions gate fails earlier when its
staging environment is incomplete.
