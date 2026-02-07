/**
 * Environment Validation
 *
 * Validates required environment variables on startup to fail fast
 * rather than encountering errors during runtime.
 */

// Required in all environments
const REQUIRED_ENV_VARS = [
  'SOLANA_RPC_URL',
];

// Required only in production
const REQUIRED_IN_PRODUCTION = [
  'ESCROW_WALLET_ADDRESS',
  'TREASURY_WALLET_ADDRESS',
  'ESCROW_PRIVATE_KEY',
  'JWT_SECRET',
];

// Optional but recommended
const RECOMMENDED_ENV_VARS = [
  'LOG_LEVEL',
  'CORS_ORIGINS',
];

interface ValidationResult {
  valid: boolean;
  missing: string[];
  missingProduction: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): ValidationResult {
  const missing: string[] = [];
  const missingProduction: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check production-required vars
  if (process.env.NODE_ENV === 'production') {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) {
        missingProduction.push(key);
      }
    }
  }

  // Check recommended vars
  for (const key of RECOMMENDED_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(`Recommended: ${key} is not set`);
    }
  }

  // Check for dangerous configurations
  if (process.env.NODE_ENV === 'production' && process.env.SOLANA_SIMULATION_MODE === 'true') {
    warnings.push('DANGER: SOLANA_SIMULATION_MODE=true in production allows fake transactions!');
  }

  return {
    valid: missing.length === 0 && missingProduction.length === 0,
    missing,
    missingProduction,
    warnings,
  };
}

/**
 * Validate and exit on failure
 */
export function validateAndExit(): void {
  const result = validateEnvironment();

  // Print warnings
  for (const warning of result.warnings) {
    console.warn(`[ENV WARNING] ${warning}`);
  }

  // Exit on missing required vars
  if (!result.valid) {
    console.error('========================================');
    console.error('FATAL: Missing required environment variables');
    console.error('========================================');

    if (result.missing.length > 0) {
      console.error('\nRequired (all environments):');
      result.missing.forEach((key) => console.error(`  - ${key}`));
    }

    if (result.missingProduction.length > 0) {
      console.error('\nRequired (production):');
      result.missingProduction.forEach((key) => console.error(`  - ${key}`));
    }

    console.error('\nPlease set these in your .env file or environment.');
    console.error('See .env.example for reference.');
    console.error('========================================');

    process.exit(1);
  }
}

/**
 * Get a required environment variable
 * Throws if not set
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
