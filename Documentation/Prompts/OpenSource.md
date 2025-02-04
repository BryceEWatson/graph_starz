# Prompt: Codebase cleanup for open source release

Today I'd like you to start by searching the codebase for any security risks or sensitive information that should be removed before the project is made open source.

A few initial concerns:
1. Sensitive information may be exposed in the @scripts folder, specifically the @prod-deploy-cloud-run.ps1 script, and others.
2. @Prompts folder may contain sensitive information in the prompts
3. Other unexpected files may contain sensitive information

Please take your time to thoroughly review the codebase and identify any potential security risks or sensitive information that should be removed before the project is made open source.

# Prompt: Improve README.md for open source release

Today I'd like you to start by reading these files fully, in order:
1. @README.md
2. @prod-deploy-cloud-run.ps1
3. @package.json
4. @index.yml

Then please reiterate the codebase functionality that should be included in the README.md file for our open source release.

---

We should also mention the @.env.example file, which you can't see, but it contains these examples:
"""
# Server Configuration
PORT=3000
NODE_ENV=development  # Options: development, production

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000  # Update for production

# Development Neo4j Configuration
NEO4J_URI=neo4j+s://94855e5a.databases.neo4j.io  # Development database URI
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_dev_password_here

# Development Google Cloud Storage
GOOGLE_CLOUD_PROJECT=your-dev-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/dev-service-account-key.json
GCS_BUCKET_NAME=dev-starz-images

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/callback/google  # Update for production

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000  # Update for production

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

"""

---

Can we do more to ensure the @README.md is linking to relevant code and script files in the documentation wherever possible?