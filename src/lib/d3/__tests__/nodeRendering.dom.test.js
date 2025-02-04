/**
 * @jest-environment jsdom
 */
import * as d3 from 'd3'
import { setupGraph } from '../setupGraph'

console.log('nodeRendering.dom.test.js is loading')

describe('Node Rendering DOM Tests', () => {
    let container
    const testNodes = [
        {
            id: '1',
            type: 'circle',
            name: 'Test Circle Node',
            properties: {
                radius: 10,
                title: 'Circle Node'
            }
        },
        {
            id: '2',
            type: 'image',
            name: 'Test Image Node',
            properties: {
                url: 'https://example.com/image.jpg',
                width: 100,
                height: 50,
                title: 'Image Node'
            }
        }
    ]

    beforeEach(() => {
        document.body.innerHTML = '<div id="chart"><svg width="800" height="600"></svg></div>'
        container = d3.select('#chart svg')
    })

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('creates correct number of node groups', () => {
        const mockGraphData = {
            nodes: testNodes,
            links: []
        }
        setupGraph(container, mockGraphData, 800, 600)
        const nodeGroups = document.querySelectorAll('.node')
        expect(nodeGroups).toHaveLength(2)
    })

    it('assigns correct classes and data attributes', () => {
        const mockGraphData = {
            nodes: testNodes,
            links: []
        }
        setupGraph(container, mockGraphData, 800, 600)
        const nodeGroups = document.querySelectorAll('.node')
        nodeGroups.forEach((group, index) => {
            expect(group.classList.contains('node')).toBe(true)
            expect(group.__data__).toBeDefined()
            expect(group.__data__.id).toBe(testNodes[index].id)
        })
    })

    describe('Image Node Tests', () => {
        const imageNode = testNodes[1]
        
        it('renders image with correct URL', () => {
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            }
            setupGraph(container, mockGraphData, 800, 600)
            const imageElement = document.querySelector('.node image')
            expect(imageElement).toBeTruthy()
            expect(imageElement.getAttribute('xlink:href')).toBe(imageNode.properties.url)
        })

        it('preserves aspect ratio within bounds', () => {
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            }
            setupGraph(container, mockGraphData, 800, 600)
            const imageElement = document.querySelector('.node image')
            expect(imageElement).toBeTruthy()
            // Add assertion for aspect ratio
        })

        it('maintains transform attributes', () => {
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            }
            setupGraph(container, mockGraphData, 800, 600)
            const imageElement = document.querySelector('.node image')
            expect(imageElement).toBeTruthy()
            // Add assertion for transform attributes
        })
    })

    describe('Label Behavior', () => {
        it('creates labels with correct text content', () => {
            const mockGraphData = {
                nodes: testNodes,
                links: []
            }
            setupGraph(container, mockGraphData, 800, 600)
            const labelElements = document.querySelectorAll('.node text')
            expect(labelElements).toHaveLength(2)
            labelElements.forEach((label, index) => {
                expect(label.textContent).toBe(testNodes[index].name)
            })
        })

        it('positions labels correctly relative to nodes', () => {
            const mockGraphData = {
                nodes: testNodes,
                links: []
            }
            setupGraph(container, mockGraphData, 800, 600)
            const labelElements = document.querySelectorAll('.node text')
            expect(labelElements).toHaveLength(2)
            // Add assertion for label positions
        })
    })
})
