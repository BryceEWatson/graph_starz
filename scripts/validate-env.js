#!/usr/bin/env node

const REQUIRED_VARS = [
  'NODE_ENV',
  'NEO4J_URI',
  'NEO4J_USER',
  'NEO4J_PASSWORD',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ANTHROPIC_API_KEY',
  'GCS_BUCKET_NAME',
  'FRONTEND_URL'
];

const VALID_NODE_ENVS = ['development', 'production', 'test'];

function validateEnvironment() {
  const missing = [];
  const invalid = [];

  // Check for production flag
  const isProduction = process.argv.includes('--production');
  if (isProduction) {
    process.env.NODE_ENV = 'production';
  }

  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
      continue;
    }

    // Additional validation for specific variables
    switch (varName) {
      case 'NODE_ENV':
        if (!VALID_NODE_ENVS.includes(value)) {
          invalid.push(`${varName} must be one of: ${VALID_NODE_ENVS.join(', ')}`);
        }
        break;
      case 'NEO4J_URI':
        const validSchemes = ['bolt://', 'neo4j://', 'neo4j+s://', 'bolt+s://', 'neo4j+ssc://', 'bolt+ssc://'];
        if (!validSchemes.some(scheme => value.startsWith(scheme))) {
          invalid.push(`${varName} must start with one of: ${validSchemes.join(', ')}`);
        }
        break;
      case 'FRONTEND_URL':
        try {
          new URL(value);
        } catch {
          invalid.push(`${varName} must be a valid URL`);
        }
        break;
    }
  }

  if (missing.length > 0) {
    console.error('\nMissing required environment variables:');
    missing.forEach(name => console.error(`  - ${name}`));
  }

  if (invalid.length > 0) {
    console.error('\nInvalid environment variables:');
    invalid.forEach(msg => console.error(`  - ${msg}`));
  }

  return missing.length === 0 && invalid.length === 0;
}

// Run validation and exit with appropriate code
if (!validateEnvironment()) {
  process.exit(1);
}

console.log(`Environment validation passed for ${process.env.NODE_ENV} environment`);
process.exit(0);
