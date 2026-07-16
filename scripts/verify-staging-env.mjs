import { pathToFileURL } from 'node:url';

const PRODUCTION_PROJECT_REF = 'crwaerhlrzqzxqaijkqc';

const REQUIRED_VARIABLES = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'E2E_STAGING_EMAIL',
  'E2E_STAGING_PASSWORD',
  'SUPABASE_STAGING_PROJECT_REF',
];

function getProjectRef(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname;
    const [projectRef, ...domainParts] = hostname.split('.');

    if (!projectRef || domainParts.join('.') !== 'supabase.co') {
      return null;
    }

    return projectRef;
  } catch {
    return null;
  }
}

export function validateStagingEnvironment(environment = process.env) {
  const missing = REQUIRED_VARIABLES.filter((name) => !environment[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing staging variables: ${missing.join(', ')}`);
  }

  const projectRef = getProjectRef(environment.VITE_SUPABASE_URL);
  if (!projectRef) {
    throw new Error('VITE_SUPABASE_URL must use a valid <project-ref>.supabase.co URL.');
  }

  const expectedProjectRef = environment.SUPABASE_STAGING_PROJECT_REF.trim();
  if (projectRef !== expectedProjectRef) {
    throw new Error('VITE_SUPABASE_URL does not match SUPABASE_STAGING_PROJECT_REF.');
  }

  const forbiddenProjectRef = (
    environment.E2E_FORBIDDEN_SUPABASE_PROJECT_REF?.trim() || PRODUCTION_PROJECT_REF
  );

  if (projectRef === PRODUCTION_PROJECT_REF || projectRef === forbiddenProjectRef) {
    throw new Error('Authenticated E2E is blocked against the production Supabase project.');
  }

  return {
    projectRef,
    productionProtected: true,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = validateStagingEnvironment();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Staging environment validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
