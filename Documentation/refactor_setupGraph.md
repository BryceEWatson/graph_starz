# setupGraph.js Refactoring Plan

## Current System Analysis

### Data Flow
```
AI Model → Neo4j Database → API (/api/graph) → D3 Graph Visualization
```

### Current Issues in setupGraph.js

#### 1. Monolithic Structure
The current `setupGraph.js` (600+ lines) handles multiple responsibilities:
- Graph initialization
- Force simulation setup
- Node creation and styling
- Layout calculations
- Event handling

#### 2. Complex Data Management
```javascript
// Current data filtering in setupGraph.js
const userNodes = data.nodes.filter(n => n.type === 'user')
userNodes.forEach(user => {
    const userImages = data.nodes.filter(n => 
        n.type === 'image' && 
        data.links.some(l => 
            (l.source.id === user.id && l.target.id === n.id) ||
            (l.target.id === user.id && l.source.id === n.id)
        )
    )
})
```

This code shows several issues:
- Multiple nested filters
- Complex relationship checks
- Direct data mutation
- No clear separation between data and layout

## Proposed Architecture

### 1. Data Management Layer
Handles interaction with `/api/graph` endpoint and data transformation.

```javascript
// Proposed interface
interface GraphData {
    nodes: {
        id: string
        type: 'user' | 'image' | 'attribute'
        properties: {
            value?: string
            graphUrl?: string
            category?: string
            prominence?: number
        }
    }[]
    links: {
        source: string
        target: string
        type: string
        properties?: {
            prominence?: number
        }
    }[]
}

class GraphDataManager {
    async loadGraphData(): Promise<GraphData>
    getUserSubgraphs(): Map<string, {user: Node, images: Node[]}>
    getAttributeNodes(): Node[]
    subscribeToUpdates(callback: (data: GraphData) => void): void
}
```

### 2. Layout Management Layer
Integrates with existing `layouts/spiralLayout.js`:

```javascript
// Current spiralLayout.js integration
import { calculateSpiralPositions, createSpiralForce } from './layouts/spiralLayout'

// Proposed enhanced interface
class LayoutManager {
    calculateUserSpirals(userSubgraphs: Map<string, {user: Node, images: Node[]}>): LayoutUpdate[]
    calculateAttributePositions(attributes: Node[], bounds: Bounds): LayoutUpdate[]
    createForces(simulation: d3.Simulation): void
}
```

### 3. State Management Layer
Coordinates updates between data, layout, and visualization:

```javascript
class GraphStateManager {
    applyLayoutUpdates(updates: LayoutUpdate[]): void
    handleDataUpdate(newData: GraphData): void
    subscribeToChanges(callback: (state: GraphState) => void): void
}
```

## Module Interfaces

### 1. GraphDataManager

```typescript
interface GraphNode {
    id: string
    type: 'user' | 'image' | 'attribute'
    properties: {
        value?: string
        graphUrl?: string
        category?: string
        prominence?: number
        size?: number
    }
}

interface GraphLink {
    source: string
    target: string
    type: 'UPLOADED' | 'HAS_ATTRIBUTE'
    properties?: {
        prominence?: number
    }
}

interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

interface UserSubgraph {
    user: GraphNode
    images: GraphNode[]
    attributes: GraphNode[]
}

class GraphDataManager {
    // Current API call in src/app/page.js will be moved here
    async initialize(): Promise<void>
    getUserSubgraphs(): Map<string, UserSubgraph>
    getAttributeNodes(): GraphNode[]
    subscribeToUpdates(callback: (data: GraphData) => void): () => void
}
```

### 2. LayoutManager

```typescript
interface Position {
    x: number
    y: number
}

interface SpiralParams {
    theta: number
    radius: number
    userNodeId: string
}

interface LayoutUpdate {
    nodeId: string
    position: Position
    params: SpiralParams
}

interface LayoutResult {
    userId: string
    maxRadius: number
    positions: LayoutUpdate[]
}

class LayoutManager {
    calculateLayouts(subgraphs: Map<string, UserSubgraph>): LayoutResult[]
    setupForces(simulation: d3.Simulation): void
    updateLayout(updates: LayoutUpdate[]): void
}
```

### 3. GraphStateManager

```typescript
interface GraphState {
    nodes: Map<string, GraphNode & Position & { spiralParams?: SpiralParams }>
    links: Map<string, GraphLink>
    selection: string | null
    hoveredNode: string | null
}

class GraphStateManager {
    constructor(simulation: d3.Simulation, initialNodes: GraphNode[])
    getState(): GraphState
    applyLayouts(layouts: LayoutResult[]): void
    updateNode(nodeId: string, updates: Partial<GraphNode>): void
    selectNode(nodeId: string | null): void
    hoverNode(nodeId: string | null): void
    subscribeToChanges(callback: (state: GraphState) => void): () => void
}
```

## API Integration Context

The current graph data fetching logic is located in `src/app/page.js` and includes:

1. **API Call Location**: Inside the `fetchGraphData` callback function, which is used by:
   - Initial data load when a whitelisted user first loads the page
   - Graph refresh event handler
   - Whitelist status check effect

2. **Current Implementation**:
```typescript
const fetchGraphData = useCallback(async () => {
    if (!whitelistStatus) return
    setIsLoadingGraph(true)
    try {
        const res = await fetch('/api/graph')
        if (!res.ok) {
            if (res.status === 403) {
                throw new Error('Early access not yet granted')
            }
            throw new Error('Failed to fetch graph data')
        }
        const graphData = await res.json()
        setData(graphData)
    } catch (err) {
        console.error('Error:', err)
        setError(err.message)
    } finally {
        setIsLoadingGraph(false)
    }
}, [whitelistStatus])
```

3. **Integration Points**:
   - Used by `GraphVisualization` component via `data={data}` prop
   - Triggered by 'refreshGraph' window event
   - Connected to whitelist status management

### Moving to GraphDataManager

Following our coding guidelines:

1. **KISS Principle**:
   - Simplify error handling by using specific error types
   - Remove nested conditionals in favor of guard clauses

2. **POLA Compliance**:
   - Use camelCase for method names
   - Follow React hooks naming conventions
   - Maintain Next.js API route patterns

3. **SRP Implementation**:
```typescript
// src/lib/data/GraphDataManager.ts
class GraphDataManager {
    private loadingState = {
        isLoading: false,
        error: null
    }

    private subscribers = new Set<(state: LoadingState) => void>()

    async fetchData() {
        this.setLoading(true)
        try {
            const data = await this.makeRequest()
            return this.processData(data)
        } catch (error) {
            this.handleError(error)
            throw error
        } finally {
            this.setLoading(false)
        }
    }

    private async makeRequest() {
        const res = await fetch('/api/graph')
        if (!res.ok) {
            throw this.createHttpError(res.status)
        }
        return res.json()
    }

    private createHttpError(status: number) {
        return status === 403
            ? new Error('Early access not yet granted')
            : new Error('Failed to fetch graph data')
    }
}
```

4. **Error Handling (FailFast)**:
```typescript
class GraphApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code: string
    ) {
        super(message)
        this.name = 'GraphApiError'
    }
}

// Usage in GraphDataManager
private handleError(error: unknown) {
    if (error instanceof GraphApiError) {
        console.error(`Graph API Error (${error.code}):`, error)
    } else {
        console.error('Unexpected error:', error)
    }
    this.notifyError(error)
}
```

### Test Structure (Following TestFiles guideline)

```
src/
├── __tests__/
│   ├── data/
│   │   └── GraphDataManager.test.js
│   └── __mocks__/
│       └── graphApiResponse.js
└── lib/
    └── data/
        └── GraphDataManager.ts
```

### Integration Tests

```typescript
// src/__tests__/data/GraphDataManager.test.js
import { GraphDataManager } from '../../lib/data/GraphDataManager'
import { mockGraphResponse } from '../__mocks__/graphApiResponse'

describe('GraphDataManager', () => {
    let manager

    beforeEach(() => {
        manager = new GraphDataManager()
        global.fetch = jest.fn()
    })

    test('handles successful data fetch', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockGraphResponse)
        })

        const data = await manager.fetchData()
        expect(data.nodes).toBeDefined()
        expect(data.links).toBeDefined()
    })

    test('handles 403 error appropriately', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 403
        })

        await expect(manager.fetchData()).rejects
            .toThrow('Early access not yet granted')
    })
})

## Neo4j Data Contract

The `/api/graph` endpoint provides a strongly typed graph data structure with the following schema:

```typescript
interface GraphResponse {
    nodes: Node[]
    links: Link[]
    stats: GraphStats
    layout: LayoutConfig
}

interface Node {
    id: string
    type: 'user' | 'image' | 'attribute'
    name: string
    properties: {
        id: string
        email?: string
        title?: string
        thumbnailUrl?: string
        previewUrl?: string
        fullUrl?: string
        description?: string
        category?: 'color' | 'object' | 'technique' | 'mood' | 'composition' | 'style' | 'lighting'
        value?: string
        context?: string
        prominence?: number
        reasoning?: string
        size: number
        color: string
    }
}

interface Link {
    source: string
    target: string
    type: 'UPLOADED' | 'HAS_ATTRIBUTE'
    properties: {
        prominence?: number
        context?: string
        reasoning?: string
    }
}

interface GraphStats {
    users: number
    images: number
    attributes: number
    categories: Record<string, number>
}

interface LayoutConfig {
    name: 'force'
    options: {
        maxDistance: number  // 300
        minDistance: number  // 30
        gravity: number      // 0.1
        springLength: number // 100
        springCoeff: number  // 0.0008
        dragCoeff: number    // 0.02
        theta: number        // 0.8
    }
}
```

### Node Types and Properties

1. **User Nodes**
   - Fixed size: 80
   - Color: '#4A90E2' (Blue)
   - Required properties: `id`, `email`
   - No optional properties

2. **Image Nodes**
   - Fixed size: 200
   - Color: '#50C878' (Green)
   - Required properties: `id`
   - Optional properties: `title`, `thumbnailUrl`, `previewUrl`, `fullUrl`, `description`

3. **Attribute Nodes**
   - Fixed size: 40
   - Color based on category:
     ```typescript
     const AttributeColors = {
         color: '#FFB6C1',       // Pink
         object: '#DEB887',      // Brown
         technique: '#20B2AA',   // Turquoise
         mood: '#FFD700',        // Gold
         composition: '#FF7F50', // Coral
         style: '#C7B8EA',       // Purple
         lighting: '#9370DB'     // Purple
     }
     ```
   - Required properties: `value`, `category`
   - Optional properties: `context`, `prominence`, `reasoning`

### Link Types and Properties

1. **UPLOADED Links**
   - Connects `User` nodes to `Image` nodes
   - Direction: User → Image
   - Optional properties: `prominence`

2. **HAS_ATTRIBUTE Links**
   - Connects `Image` nodes to `Attribute` nodes
   - Direction: Image → Attribute
   - Optional properties: `prominence`, `context`, `reasoning`

### Data Validation Rules

1. **Node Validation**
   ```typescript
   const validateNode = (node: Node): boolean => {
       const validTypes = ['user', 'image', 'attribute']
       return (
           typeof node.id === 'string' &&
           validTypes.includes(node.type) &&
           typeof node.properties === 'object'
       )
   }
   ```

2. **Link Validation**
   ```typescript
   const validateLink = (link: Link): boolean => {
       const validTypes = ['UPLOADED', 'HAS_ATTRIBUTE']
       return (
           typeof link.source === 'string' &&
           typeof link.target === 'string' &&
           validTypes.includes(link.type)
       )
   }
   ```

### Error Handling

The API follows standard HTTP status codes:

```typescript
type APIError = {
    401: 'Unauthorized: Please sign in to view graph data'
    403: 'Unauthorized: Early access not yet granted'
    429: 'Too many requests. Please try again later'
    500: 'Internal server error' | 'Failed to fetch graph data' | 'Invalid graph data'
    503: 'Database connection failed'
}
```

### Rate Limiting

```typescript
const RateLimits = {
    authenticated: 60,   // requests per minute
    unauthenticated: 10, // requests per minute
    unknownIP: 5        // requests per minute
}
```

This data contract will be enforced by the `GraphDataManager` through TypeScript interfaces and runtime validation.

## Data Processing Details

### 1. API Response Processing

```typescript
// src/lib/data/GraphDataManager.ts
class GraphDataManager {
    private async processApiResponse(data: GraphData): Promise<void> {
        // Validate data structure
        if (!this.validateGraphData(data)) {
            throw new Error('Invalid graph data structure')
        }

        // Index nodes by type for efficient access
        const nodesByType = new Map<string, GraphNode[]>()
        data.nodes.forEach(node => {
            const nodes = nodesByType.get(node.type) || []
            nodes.push(node)
            nodesByType.set(node.type, nodes)
        })

        // Create user subgraphs
        const userNodes = nodesByType.get('user') || []
        this.userSubgraphs = new Map(
            userNodes.map(user => {
                // Find all images uploaded by this user
                const userImages = this.findConnectedNodes(
                    data,
                    user.id,
                    'UPLOADED',
                    'image'
                )

                // Find all attributes connected to these images
                const imageAttributes = new Set<GraphNode>()
                userImages.forEach(image => {
                    const attributes = this.findConnectedNodes(
                        data,
                        image.id,
                        'HAS_ATTRIBUTE',
                        'attribute'
                    )
                    attributes.forEach(attr => imageAttributes.add(attr))
                })

                return [
                    user.id,
                    {
                        user,
                        images: userImages,
                        attributes: Array.from(imageAttributes)
                    }
                ]
            })
        )
    }

    private findConnectedNodes(
        data: GraphData,
        sourceId: string,
        linkType: string,
        targetType: string
    ): GraphNode[] {
        return data.nodes.filter(node =>
            node.type === targetType &&
            data.links.some(link =>
                link.type === linkType &&
                ((link.source === sourceId && link.target === node.id) ||
                 (link.target === sourceId && link.source === node.id))
            )
        )
    }

    private validateGraphData(data: GraphData): boolean {
        if (!data?.nodes?.length || !data?.links?.length) return false
        
        // Validate nodes
        const validNode = (node: GraphNode) =>
            node.id &&
            ['user', 'image', 'attribute'].includes(node.type) &&
            typeof node.properties === 'object'
            
        if (!data.nodes.every(validNode)) return false
        
        // Validate links
        const validLink = (link: GraphLink) =>
            link.source && link.target &&
            ['UPLOADED', 'HAS_ATTRIBUTE'].includes(link.type)
            
        if (!data.links.every(validLink)) return false
        
        return true
    }
}
```

## Test Plan

### 1. GraphDataManager Tests

```typescript
// __tests__/data/GraphDataManager.test.ts
describe('GraphDataManager', () => {
    describe('Data Validation', () => {
        test('validates complete graph data', () => {
            const manager = new GraphDataManager()
            const validData = {
                nodes: [
                    {id: 'u1', type: 'user', properties: {}},
                    {id: 'i1', type: 'image', properties: {graphUrl: 'url'}},
                    {id: 'a1', type: 'attribute', properties: {value: 'attr'}}
                ],
                links: [
                    {source: 'u1', target: 'i1', type: 'UPLOADED'},
                    {source: 'i1', target: 'a1', type: 'HAS_ATTRIBUTE'}
                ]
            }
            expect(() => manager.initialize(validData)).not.toThrow()
        })

        test('rejects invalid node types', () => {
            const manager = new GraphDataManager()
            const invalidData = {
                nodes: [{id: 'x1', type: 'invalid', properties: {}}],
                links: []
            }
            expect(() => manager.initialize(invalidData)).toThrow()
        })
    })

    describe('Subgraph Creation', () => {
        test('creates correct user subgraphs', () => {
            const manager = new GraphDataManager()
            // Test data setup...
            const subgraphs = manager.getUserSubgraphs()
            expect(subgraphs.size).toBe(1)
            const userSubgraph = subgraphs.get('u1')
            expect(userSubgraph.images).toHaveLength(1)
            expect(userSubgraph.attributes).toHaveLength(1)
        })

        test('handles disconnected nodes', () => {
            // Test isolated nodes...
        })

        test('handles circular relationships', () => {
            // Test circular relationships...
        })
    })
})
```

### 2. LayoutManager Tests

```typescript
// __tests__/layouts/LayoutManager.test.ts
describe('LayoutManager', () => {
    describe('Layout Calculation', () => {
        test('calculates spiral layout for single user', () => {
            const manager = new LayoutManager()
            // Test single user layout...
        })

        test('handles multiple user layouts', () => {
            // Test multiple user layouts...
        })

        test('maintains minimum spacing between images', () => {
            // Test image spacing...
        })
    })

    describe('Force Setup', () => {
        test('creates appropriate forces', () => {
            // Test force creation...
        })

        test('maintains spiral structure under force', () => {
            // Test force stability...
        })
    })
})
```

### 3. GraphStateManager Tests

```typescript
// __tests__/state/GraphStateManager.test.ts
describe('GraphStateManager', () => {
    describe('State Updates', () => {
        test('applies layout updates correctly', () => {
            const manager = new GraphStateManager(mockSimulation, mockNodes)
            // Test layout updates...
        })

        test('maintains node references', () => {
            // Test node reference stability...
        })

        test('handles invalid updates gracefully', () => {
            // Test error handling...
        })
    })

    describe('Selection Management', () => {
        test('manages node selection state', () => {
            // Test selection state...
        })

        test('handles hover state', () => {
            // Test hover state...
        })
    })
})
```

## Edge Cases and Error Handling

1. **Data Validation**
   - Missing or null nodes/links
   - Invalid node types
   - Duplicate node IDs
   - Circular relationships
   - Disconnected subgraphs

2. **Layout Calculation**
   - Single image per user
   - Many images per user (100+)
   - No images for user
   - Overlapping user subgraphs

3. **State Management**
   - Concurrent updates
   - Race conditions
   - Invalid node references
   - Force simulation stability

## Detailed Implementation Plan

### Phase 1: Data Integration

The current setupGraph.js directly manipulates node data. We'll create a proper data layer:

```javascript
// New: src/lib/data/GraphDataManager.ts
export class GraphDataManager {
    private graphData: GraphData
    private userSubgraphs: Map<string, {user: Node, images: Node[]}>

    async initialize() {
        // Load from /api/graph endpoint
        const response = await fetch('/api/graph')
        this.graphData = await response.json()
        this.processData()
    }

    private processData() {
        // Move this filtering logic from setupGraph.js
        const userNodes = this.graphData.nodes.filter(n => n.type === 'user')
        this.userSubgraphs = new Map(
            userNodes.map(user => {
                // Find all images uploaded by this user
                const userImages = this.graphData.nodes.filter(n =>
                    n.type === 'image' &&
                    this.graphData.links.some(l =>
                        (l.source.id === user.id && l.target.id === n.id) ||
                        (l.target.id === user.id && l.source.id === n.id)
                    )
                )

                return [
                    user.id,
                    {
                        user,
                        images: userImages
                    }
                ]
            })
        )
    }

    getUserSubgraphs() {
        return this.userSubgraphs
    }
}
```

### Phase 2: Layout Enhancement

The existing `spiralLayout.js` already has good separation of concerns. We'll create a wrapper to integrate it with our new architecture:

```javascript
// New: src/lib/layouts/LayoutManager.ts
import { calculateSpiralPositions, createSpiralForce } from './spiralLayout'

export class LayoutManager {
    calculateLayouts(userSubgraphs: Map<string, {user: Node, images: Node[]}>) {
        const layouts = []
        
        // Use existing spiral calculation
        for (const [userId, {user, images}] of userSubgraphs) {
            const {maxRadius, imagePositions} = calculateSpiralPositions(user, images)
            layouts.push({
                userId,
                maxRadius,
                positions: imagePositions
            })
        }
        
        return layouts
    }

    setupForces(simulation: d3.Simulation) {
        // Use existing force creation
        simulation.force('spiral', createSpiralForce())
    }
}
```

### Phase 3: State Coordination

Create a state manager to handle updates:

```javascript
// New: src/lib/state/GraphStateManager.ts
export class GraphStateManager {
    private simulation: d3.Simulation
    private nodes: Node[]
    
    constructor(simulation: d3.Simulation, initialNodes: Node[]) {
        this.simulation = simulation
        this.nodes = initialNodes
    }
    
    applyLayouts(layouts: Layout[]) {
        layouts.forEach(layout => {
            layout.positions.forEach(pos => {
                const node = this.nodes.find(n => n.id === pos.id)
                if (node) {
                    // Preserve existing spiralParams structure
                    node.x = pos.x
                    node.y = pos.y
                    node.spiralParams = {
                        theta: pos.theta,
                        radius: pos.radius,
                        userNodeId: layout.userId
                    }
                }
            })
        })
        
        // Restart simulation with new positions
        this.simulation.alpha(1).restart()
    }
}
```

### Phase 4: Refactor setupGraph.js

The final setupGraph.js will be significantly simplified:

```javascript
export async function setupGraph(svgElement, width, height, theme) {
    // Initialize data
    const dataManager = new GraphDataManager()
    await dataManager.initialize()
    
    // Create basic simulation
    const simulation = d3.forceSimulation()
        .force('center', d3.forceCenter(width/2, height/2))
        .force('charge', d3.forceManyBody())
    
    // Initialize managers
    const layoutManager = new LayoutManager()
    const stateManager = new GraphStateManager(simulation, dataManager.getNodes())
    
    // Calculate and apply layouts
    const layouts = layoutManager.calculateLayouts(dataManager.getUserSubgraphs())
    stateManager.applyLayouts(layouts)
    
    // Setup forces
    layoutManager.setupForces(simulation)
    
    // Setup visualization (moved to separate module)
    setupVisualization(svgElement, stateManager, theme)
}
```

## Data Flow Details

1. **API to Data Manager:**
   - `/api/graph` returns Neo4j data in format:
   ```javascript
   {
       nodes: [
           {id: string, type: string, properties: Object},
           // ...
       ],
       links: [
           {source: string, target: string, type: string},
           // ...
       ]
   }
   ```
   - Data Manager processes this into user subgraphs

2. **Data Manager to Layout:**
   - Layout receives pre-filtered user subgraphs
   - Uses existing `calculateSpiralPositions` logic
   - Returns position updates

3. **Layout to State:**
   - State manager applies positions
   - Maintains consistency with simulation
   - Triggers visualization updates

4. **State to Visualization:**
   - D3 renders based on current state
   - Forces maintain layout structure
   - Updates happen through state manager

## Validation Strategy

### For Each Phase
1. Verify visual output matches current implementation
2. Ensure all existing tests pass
3. Add new tests for extracted modules
4. Validate data flow and state management

## Success Criteria
- Reduced setupGraph.js size (target: 200 lines)
- Clear separation of concerns
- Maintainable module structure
- Preserved visualization quality
