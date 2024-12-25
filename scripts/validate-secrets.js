const { exec } = require('child_process');
const { promisify } = require('util');
const debug = require('debug');

const execAsync = promisify(exec);
const log = debug('app:secrets');

// Required secrets from .env.example with descriptions
const REQUIRED_SECRETS = {
    'NEO4J_URI': 'Neo4j database connection URI',
    'NEO4J_USER': 'Neo4j database username',
    'NEO4J_PASSWORD': 'Neo4j database password',
    'GOOGLE_CLIENT_ID': 'Google OAuth client ID for authentication',
    'GOOGLE_CLIENT_SECRET': 'Google OAuth client secret for authentication',
    'ANTHROPIC_API_KEY': 'Anthropic API key for AI services',
    'GCS_BUCKET_NAME': 'Google Cloud Storage bucket for storing images',
    'NEXTAUTH_SECRET': 'Secret key for NextAuth.js session encryption',
    'NEXTAUTH_URL': 'Base URL for NextAuth.js authentication',
    'FRONTEND_URL': 'Base URL for frontend application'
};

async function getSecretValue(secretName) {
    try {
        const { stdout } = await execAsync(`gcloud secrets versions access latest --secret=${secretName}`);
        return stdout.trim();
    } catch (error) {
        throw new Error(`Failed to get value for secret ${secretName}: ${error.message}`);
    }
}

async function getSecretValues() {
    try {
        const values = {};
        for (const secretName of Object.keys(REQUIRED_SECRETS)) {
            values[secretName] = await getSecretValue(secretName);
        }
        return values;
    } catch (error) {
        throw new Error(`Failed to get secret values: ${error.message}`);
    }
}

async function validateSecrets() {
    log('Validating secrets in Secret Manager');
    try {
        // List all secrets in the project
        const { stdout } = await execAsync('gcloud secrets list --format="value(name)"');
        const availableSecrets = stdout.split('\n').map(s => s.trim());
        const missingSecrets = Object.keys(REQUIRED_SECRETS).filter(secret => !availableSecrets.includes(secret));

        if (missingSecrets.length > 0) {
            const missingDetails = missingSecrets.map(secret => 
                `  - ${secret}: ${REQUIRED_SECRETS[secret]}`
            ).join('\n');
            
            throw new Error(
                'Missing required secrets in Secret Manager:\n' + 
                missingDetails + '\n\n' +
                'Please ensure these secrets are configured in Google Cloud Secret Manager.'
            );
        }

        return await getSecretValues();
    } catch (error) {
        throw new Error(`Failed to validate secrets: ${error.message}`);
    }
}

// Run validation if called directly
if (require.main === module) {
    const command = process.argv[2] || 'validate';
    
    if (command === 'values') {
        getSecretValues()
            .then(secrets => {
                console.log(JSON.stringify(secrets));
            })
            .catch(error => {
                console.error(error.message);
                process.exit(1);
            });
    } else {
        validateSecrets()
            .then(secrets => {
                // Output in a format that won't confuse gcloud
                const safeSecrets = {};
                for (const key of Object.keys(secrets)) {
                    safeSecrets[key] = secrets[key] ? '[PRESENT]' : '[MISSING]';
                }
                console.log(JSON.stringify(safeSecrets, null, 2));
            })
            .catch(error => {
                console.error(error.message);
                process.exit(1);
            });
    }
}

module.exports = { validateSecrets, getSecretValues, REQUIRED_SECRETS };
