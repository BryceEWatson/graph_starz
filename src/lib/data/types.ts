export interface GraphNode {
    id: string
    type: 'user' | 'image' | 'attribute'
    name: string
    properties: {
        id: string
        // User properties
        email?: string
        name?: string
        // Image properties
        title?: string
        description?: string
        graphUrl?: string
        previewUrl?: string
        fullUrl?: string
        width?: number
        height?: number
        pHash?: string
        createdAt?: Date
        userId?: string
        uploadedBy?: {
            id: string
            name: string
            email: string
        }
        // Attribute properties
        category?: 'color' | 'object' | 'technique' | 'mood' | 'composition' | 'style' | 'lighting'
        value?: string
        context?: string
        prominence?: number
        reasoning?: string
        // Display properties
        size: number
        color: string
    }
}

export interface GraphLink {
    source: string
    target: string
    type: 'UPLOADED' | 'HAS_ATTRIBUTE'
    properties: {
        prominence?: number
        context?: string
        reasoning?: string
    }
}

export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
    stats: {
        users: number
        images: number
        attributes: number
        categories: Record<string, number>
    }
    layout: {
        name: 'force'
        options: {
            maxDistance: number
            minDistance: number
            gravity: number
            springLength: number
            springCoeff: number
            dragCoeff: number
            theta: number
        }
    }
}

export interface UserSubgraph {
    user: GraphNode
    images: GraphNode[]
    attributes: GraphNode[]
}

export class GraphApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code: string
    ) {
        super(message)
        this.name = 'GraphApiError'
    }
}
