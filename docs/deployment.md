# Deployment safety

Esportiz deployments follow these release gates:

- Pull requests target `main` and keep unrelated release scopes separate.
- The head commit must be verified by GitHub before Vercel can build a Preview.
- Functional changes and build-toolchain upgrades are released independently.
- Lint, type checking, unit tests, production build, and relevant E2E journeys must pass before merge.
- Production is smoke-tested after deployment, with the previous healthy deployment kept available for rollback.
- Secrets belong in the Vercel and Supabase environment stores and must never be committed.
