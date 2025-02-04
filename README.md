# Graph Starz

Graph Starz is a comprehensive open source project built with [Next.js](https://nextjs.org) that delivers interactive graph visualizations, secure user management, AI-powered image analysis, and robust production deployment.

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
   - [User Authentication and Access Management](#user-authentication-and-access-management)
   - [Interactive Graph Visualization](#interactive-graph-visualization)
   - [Image Upload Workflow with AI Analysis](#image-upload-workflow-with-ai-analysis)
   - [Production Deployment and Environment Management](#production-deployment-and-environment-management)
   - [Theming and UI Enhancements](#theming-and-ui-enhancements)
3. [Getting Started](#getting-started)
4. [Development](#development)
5. [Deployment](#deployment)
6. [Environment Variables](#environment-variables)
7. [Contributing](#contributing)
8. [License](#license)
9. [Code References](#code-references)

## Overview

Graph Starz leverages Next.js and React to create a modern, responsive web application. Designed for interactive data visualization and secure image processing, it combines powerful features with a clean, maintainable codebase.

## Features

### User Authentication and Access Management
- **Google Sign-In & Session Persistence:** Seamless user login with robust session handling.
- **Early Access & Whitelist Management:** Manage early access requests and enforce controlled access.
- **API-Driven Security:** Uses NextAuth API routes and backend logic to handle authentication workflows.

### Interactive Graph Visualization
- **Dynamic Graph Rendering:** Interactive data visualization using D3.js.
- **Node Theming & Filtering:** Customize node properties and apply interactive filters for exploring relationships.
- **Data-Rich Visualizations:** Display images, user data, and attributes in comprehensive visual formats.

### Image Upload Workflow with AI Analysis
- **Secure Uploads:** Process images with a secure upload mechanism integrated with AI analysis via Anthropic.
- **Duplicate & Unauthorized Detection:** Automatic checks for duplicate images and unauthorized access.
- **Robust Error Handling:** Implements comprehensive error detection and recovery strategies.

### Production Deployment and Environment Management
- **Automated Deployment:** Includes a dedicated PowerShell script for production deployment on Google Cloud Run.
- **Docker Image Build and Push:** Automates Docker build, tagging, and image push to Google Container Registry.
- **Secret and Env Validation:** Validates required environment variables and secrets such as API keys, Neo4j credentials, and Google Cloud settings.

### Theming and UI Enhancements
- **SSR-Compatible Theme Management:** Provides theme initialization with dedicated Theme Providers and toggle functionality.
- **Customizable UI:** Ensures a modern and adaptable user interface optimized for performance and accessibility.

### Testing and Code Quality
- **Test-Driven Development:** Adopts TDD with tests organized in __tests__ and mocks in __mocks__.
- **Quality Assurance:** Includes scripts for linting, syntax checking, and coverage reporting.

### Developer and Operational Tools
- **Development Scripts:** Contains various scripts for syntax checking, secret validation, and database initialization.
- **Streamlined Workflow:** Supports both local development and seamless production deployment.

## Getting Started

### Prerequisites
- Node.js and npm/yarn installed.
- Google Cloud SDK configured (for production deployment).
- All necessary environment variables and secrets as outlined in the deployment documentation.

### Installation
```bash
git clone <repository-url>
cd graph_starz
yarn install
```

### Running Locally
```bash
yarn dev
```

## Development

### Available Scripts
- `yarn dev` - Start the development server.
- `yarn build` - Build the application for production.
- `yarn start` - Run the production server.
- `yarn test` - Execute the test suite.
- `yarn lint` - Run linting.

### Code Quality Guidelines
- Follow best practices: KISS, POLA, SRP, and DRY.
- Use client components in Next.js with the `use client` directive.
- Write tests before implementation and leverage Jest for testing.

## Deployment

### Production Deployment
- **Deployment Script:** Uses `scripts/prod-deploy-cloud-run.ps1` for deployment automation.
- **Docker & Cloud Run:** Automates Docker image creation, registry push, and Cloud Run deployment.
- **Environment Validation:** Ensures all required secrets and environment variables are set before deployment.

## Environment Variables

Graph Starz uses environment variables to configure the application. A sample configuration is provided in the `.env.example` file. Below is an example of the environment settings:

```bash
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
```

## Contributing

Contributions are welcome! Please adhere to the following guidelines:
- Keep the code simple and modular (KISS, SRP).
- Write tests prior to coding (Test-First approach).
- Follow established JavaScript/Node.js and Next.js conventions.

## License

This project is licensed under the [MIT License](LICENSE).

## Code References

Below are links to important code and configuration files in the repository:

- **Authentication & User Management**:
  - [NextAuth Options](./src/app/api/auth/[...nextauth]/options.js)
  - [User Repository](./src/lib/neo4j/userRepository.js)
  - [Whitelist Route](./src/app/api/auth/whitelist/route.js)

- **Interactive Graph Visualization**:
  - [Graph Visualization Component](./src/components/GraphVisualization.jsx)
  - [D3 Graph Hook](./src/hooks/useD3Graph.js)
  - [D3 Setup](./src/lib/d3/setupGraph.js)
  - [D3 Interactions](./src/lib/d3/interactions.js)

- **Image Upload Workflow with AI Analysis**:
  - [Image Upload API Route](./src/app/api/images/upload/route.js)
  - [Image Repository](./src/lib/neo4j/imageRepository.js)
  - [Image Analyzer](./src/lib/image/imageAnalyzer.js)

- **Production Deployment**:
  - [Production Deployment Script](./scripts/prod-deploy-cloud-run.ps1)
  - [Dockerfile](./Dockerfile)

- **Configuration**:
  - [package.json](./package.json)
  - [.env.example](./.env.example)

- **BDD Documentation**:
  - [Product BDD Documentation](./Documentation/BDD/product/index.yml)
