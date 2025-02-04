/**
 * @jest-environment jsdom
 */

import * as d3 from 'd3'

describe('D3 Graph Rendering', () => {
    let container

    beforeEach(() => {
        container = document.createElement('div')
        container.setAttribute('id', 'chart')
        document.body.appendChild(container)
    })

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container)
        }
    })

    test('creates an SVG element', () => {
        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', '500')
            .attr('height', '300')

        const svgElement = document.querySelector('svg')
        expect(svgElement).toBeTruthy()
        expect(svgElement.getAttribute('width')).toBe('500')
    })
})
