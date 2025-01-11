# D3 Graph Visualization

This module handles the graph visualization functionality for Graph Starz using D3.js.

## Core Components

### Force Configuration
The `forceConfig.js` module manages force simulation parameters for different node types and interactions:

```javascript
import { forceConfig } from './forceConfig';

// Example configuration usage
const linkDistance = forceConfig.link.distance.image; // 200
const chargeStrength = forceConfig.charge.image; // -800
```

#### Configuration Structure
- **Link Forces**: Controls the distance and strength between connected nodes
  - `distance`: Base distances for different node types
  - `variations`: Random variations to prevent uniform layouts

- **Charge Forces**: Controls node repulsion
  - Type-specific charge strengths
  - Distance limits for force application

- **Collision Forces**: Prevents node overlap
  - Type-specific collision radii
  - Iteration count for collision detection

## Error Handling
All configuration parameters are validated at runtime to ensure:
- Required parameters are present
- Numeric values are within valid ranges
- Type-specific configurations are complete

Example error handling:
```javascript
// Invalid configuration will throw descriptive errors
const invalidConfig = {
  link: { distance: null }
}; // Throws: "Missing link distance configuration"
```

## Usage Guidelines
1. Always validate configuration before use
2. Use type-specific parameters when available
3. Consider performance impact of force parameters

## Development
- Run tests: `npm test src/lib/d3/__tests__`
- Validate changes: `npm run validate`
