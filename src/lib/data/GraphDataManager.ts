import { GraphNode, GraphLink, GraphData, UserSubgraph, GraphApiError } from './types'

export class GraphDataManager {
    private graphData: GraphData | null = null
    private userSubgraphs: Map<string, UserSubgraph> = new Map()
    private subscribers = new Set<(data: GraphData) => void>()

    async initialize(): Promise<void> {
        try {
            const data = await this.fetchGraphData()
            await this.processApiResponse(data)
            this.notifySubscribers()
        } catch (error) {
            this.handleError(error)
            throw error
        }
    }

    getUserSubgraphs(): Map<string, UserSubgraph> {
        if (!this.graphData) {
            throw new Error('Graph data not initialized')
        }
        return this.userSubgraphs
    }

    getAttributeNodes(): GraphNode[] {
        if (!this.graphData) {
            throw new Error('Graph data not initialized')
        }
        return this.graphData.nodes.filter(n => n.type === 'attribute')
    }

    subscribeToUpdates(callback: (data: GraphData) => void): () => void {
        this.subscribers.add(callback)
        return () => this.subscribers.delete(callback)
    }

    private async fetchGraphData(): Promise<GraphData> {
        const res = await fetch('/api/graph')
        if (!res.ok) {
            throw new GraphApiError(
                this.getErrorMessage(res.status),
                res.status,
                'FETCH_ERROR'
            )
        }
        return res.json()
    }

    private getErrorMessage(status: number): string {
        switch (status) {
            case 401: return 'Unauthorized: Please sign in to view graph data'
            case 403: return 'Unauthorized: Early access not yet granted'
            case 429: return 'Too many requests. Please try again later'
            case 503: return 'Database connection failed'
            default: return 'Failed to fetch graph data'
        }
    }

    private async processApiResponse(data: GraphData): Promise<void> {
        if (!this.validateGraphData(data)) {
            throw new Error('Invalid graph data structure')
        }

        this.graphData = data
        await this.createUserSubgraphs()
    }

    private validateGraphData(data: GraphData): boolean {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid graph data: data must be an object')
        }
        if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
            throw new Error('Invalid graph data: nodes and links must be arrays')
        }
        
        // Validate each node has required fields and correct structure
        data.nodes.forEach((node, index) => {
            if (!node.id || !node.type || !node.properties) {
                throw new Error(`Invalid node at index ${index}: missing required fields`)
            }
            
            if (!['user', 'image', 'attribute'].includes(node.type)) {
                throw new Error(`Invalid node type "${node.type}" at index ${index}`)
            }
            
            // Type-specific validation
            switch (node.type) {
                case 'image':
                    if (!node.properties.graphUrl) {
                        throw new Error(`Image node at index ${index} missing required graphUrl`)
                    }
                    if (!node.properties.previewUrl) {
                        throw new Error(`Image node at index ${index} missing required previewUrl`)
                    }
                    if (!node.properties.fullUrl) {
                        throw new Error(`Image node at index ${index} missing required fullUrl`)
                    }
                    break
                    
                case 'attribute':
                    if (!node.properties.category) {
                        throw new Error(`Attribute node at index ${index} missing required category`)
                    }
                    if (!node.properties.value) {
                        throw new Error(`Attribute node at index ${index} missing required value`)
                    }
                    const validCategories = ['color', 'object', 'technique', 'mood', 'composition', 'style', 'lighting']
                    if (!validCategories.includes(node.properties.category)) {
                        throw new Error(`Invalid category "${node.properties.category}" at index ${index}`)
                    }
                    break
                    
                case 'user':
                    if (!node.properties.email) {
                        throw new Error(`User node at index ${index} missing required email`)
                    }
                    break
            }
        })
        
        // Validate links have correct structure and reference existing nodes
        const nodeIds = new Set(data.nodes.map(n => n.id))
        data.links.forEach((link, index) => {
            if (!link.source || !link.target || !link.type) {
                throw new Error(`Invalid link at index ${index}: missing required fields`)
            }
            
            if (!['UPLOADED', 'HAS_ATTRIBUTE'].includes(link.type)) {
                throw new Error(`Invalid link type "${link.type}" at index ${index}`)
            }
            
            if (!nodeIds.has(link.source)) {
                throw new Error(`Link at index ${index} references non-existent source node: ${link.source}`)
            }
            
            if (!nodeIds.has(link.target)) {
                throw new Error(`Link at index ${index} references non-existent target node: ${link.target}`)
            }
        })
        
        return true
    }

    private async createUserSubgraphs(): Promise<void> {
        if (!this.graphData) return

        const userNodes = this.graphData.nodes.filter(n => n.type === 'user')
        
        userNodes.forEach(user => {
            const userLinks = this.graphData!.links.filter(l => 
                l.source === user.id || l.target === user.id
            )
            
            const imageNodes = this.graphData!.nodes.filter(n => 
                n.type === 'image' && 
                userLinks.some(l => l.source === n.id || l.target === n.id)
            )
            
            const attributeNodes = this.graphData!.nodes.filter(n =>
                n.type === 'attribute' &&
                userLinks.some(l => l.source === n.id || l.target === n.id)
            )
            
            this.userSubgraphs.set(user.id, {
                user,
                images: imageNodes,
                attributes: attributeNodes
            })
        })
    }

    private handleError(error: unknown): void {
        if (error instanceof GraphApiError) {
            console.error(`Graph API Error: ${error.message} (Status: ${error.status})`)
        } else if (error instanceof Error) {
            console.error(`Error in GraphDataManager: ${error.message}`)
        } else {
            console.error('Unknown error in GraphDataManager:', error)
        }
    }

    private notifySubscribers(): void {
        if (!this.graphData) return
        this.subscribers.forEach(callback => callback(this.graphData!))
    }
}
