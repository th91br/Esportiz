# Deployment safety

Esportiz deployments follow these release gates:

- Pull requests target main and keep unrelated release scopes separate.
- The pull request head commit must be verified by GitHub before Vercel can build a Preview.
- Quality gate, Public E2E, and Vercel must succeed before merge.
- The protected main branch requires current checks and resolved review conversations.
- Functional changes and build-toolchain upgrades are released independently.
- Lint, type checking, unit tests, production build, and relevant E2E journeys must pass before merge.
- Production is checked hourly for public routes, PWA assets, and the expected Supabase project.
- Production is smoke-tested after deployment, with the previous healthy deployment kept available for rollback.
- Secrets belong in the Vercel and Supabase environment stores and must never be committed.
- Rollbacks promote the previous healthy deployment; release history is never rewritten.