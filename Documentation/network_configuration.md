# GraphStarz Network Configuration Summary
*Last Updated: December 18, 2024*

## Domain Configuration
- **Domain Name:** `graphstarz.com`
- **DNS Provider:** Google Cloud DNS
- **DNS Zone Name:** `graphstarz-zone`
- **Zone Visibility:** Public

## DNS Records
| Record Type | Name | Value | TTL |
|------------|------|--------|-----|
| A | graphstarz.com | 34.117.86.20 | 300s |
| NS | graphstarz.com | ns-cloud-c[1-4].googledomains.com | 21600s |

## SSL Certificate
- **Active Certificate:**
  - ID: `mcrt-aaddf01f-5fdb-44e3-843a-155387708271`
  - Type: Managed (Google-managed through Cloud Run)
  - Status: ACTIVE
  - Domain: graphstarz.com
  - Expiration: February 20, 2025
  - Note: Certificate is automatically managed by Google Cloud Run

## IP Addresses
- **Primary IP:** 34.117.86.20
  - Used for main domain
  - Located in us-west1 region

## API Routing
- All API routes are served under `/api/*` on the main domain
- Examples:
  - Health check: `https://graphstarz.com/api/health`
  - Authentication: `https://graphstarz.com/api/auth/*`
  - Image upload: `https://graphstarz.com/api/images/upload`

## VPC Networks
- **Networks:**
  - `default` network (AUTO subnet mode, REGIONAL routing)
  - Note: Previously used `neo4j-network` has been removed as the project now uses an external Neo4j database

## Previous Infrastructure (Cleaned Up)
The following resources were previously used but have been cleaned up:
- GKE cluster `starz-cluster` in us-west1-b
- Compute Engine instances:
  - `graphstarz-backend-prod` (us-west1-a)
  - `graphstarz-frontend-prod` (us-west1-a)

## Notes for New Implementation
1. **DNS Configuration:**
   - Single A record for main domain
   - API routes served under `/api/*` path
   - SSL certificate automatically managed by Cloud Run

2. **SSL Management:**
   - Handled automatically by Google Cloud Run
   - No manual certificate renewal needed
   - No ACME challenges required

## Recommendations for New Setup
1. Review DNS TTL values before migration to minimize downtime
2. Monitor Cloud Run service status for SSL certificate health
3. Document new IP addresses and DNS changes when implementing new infrastructure
