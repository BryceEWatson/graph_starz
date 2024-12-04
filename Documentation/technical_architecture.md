# Technical Architecture

## Framework and Libraries

### Next.js
Graph Starz is built using Next.js 15.0, leveraging its App Router architecture for server-side rendering and API routes. Key features used include:

- **Server Components**: Most components are server components by default
- **Server Actions**: Used for database operations with the `'use server'` directive
- **API Routes**: Implemented in `app/api/` for graph data and health checks
- **Dynamic Routing**: All routes are dynamic to prevent caching where needed

### Database
- **Neo4j**: Graph database for storing users, images, and attributes
- **neo4j-driver**: Official JavaScript driver for Neo4j integration
- **Connection Management**: Singleton pattern with connection pooling

### Frontend
- **D3.js**: Used for interactive graph visualization
- **React**: For client-side interactivity where needed
- **Tailwind CSS**: For styling and responsive design

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── graph/        # Graph data endpoint
│   │   └── health/       # Health check endpoint
│   └── page.js           # Main page with graph visualization
├── lib/                   # Shared libraries
│   └── neo4j/            # Neo4j related code
│       ├── api-client.js # Neo4j client for API routes
│       ├── client.js     # Neo4j client for server components
│       └── init-db.js    # Database initialization script
└── components/           # React components
```

## Key Design Decisions

1. **Server-First Architecture**
   - Most operations are performed on the server
   - Client-side code is minimized to essential interactivity
   - Graph data is pre-processed on the server

2. **Database Connection Management**
   - Separate clients for API routes and server components
   - Connection pooling for optimal performance
   - Automatic cleanup of unused connections

3. **Error Handling**
   - Comprehensive error handling at all layers
   - Detailed error messages in development
   - Sanitized error responses in production

4. **Performance Considerations**
   - Dynamic routes are force-dynamic to prevent stale data
   - D3.js visualization is optimized with proper cleanup
   - Neo4j queries are optimized for graph traversal

## Development Guidelines

1. **Server Components**
   - Use server components by default
   - Only switch to client components when needed for interactivity
   - Mark client components with 'use client' directive

2. **API Routes**
   - Keep routes in appropriate directories under `app/api/`
   - Use consistent error handling patterns
   - Document all endpoints

3. **Database Operations**
   - Use server actions for database operations
   - Handle connection lifecycle properly
   - Include proper error handling and logging

4. **Frontend Development**
   - Follow React best practices
   - Use Tailwind CSS for styling
   - Ensure proper cleanup in useEffect hooks
