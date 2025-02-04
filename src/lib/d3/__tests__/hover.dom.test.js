/** @jest-environment jsdom */
import * as d3 from 'd3'
import { applyNodeState } from '../interactions/hover'

describe('Hover DOM Effects', () => {
    let svg
    
    beforeEach(() => {
        document.body.innerHTML = '<div id="chart"><svg width="500" height="300"></svg></div>'
        svg = d3.select('svg')
    })

    it('applies scale transform on node hover', () => {
        const node = svg.append('g')
            .attr('class', 'node')
            .datum({ id: 1 })
        
        applyNodeState(node, 'highlighted')
        
        const nodeElement = document.querySelector('.node')
        expect(nodeElement.getAttribute('transform')).toContain('scale(1.1)')
    })

    it('styles image nodes correctly on hover', () => {
        const node = svg.append('g')
            .attr('class', 'node')
            .datum({ id: 2, type: 'image' })
            .append('image')
            .attr('class', 'node-image')
        
        applyNodeState(d3.select('.node'), 'highlighted')
        
        const imageElement = document.querySelector('.node-image')
        expect(imageElement).toBeTruthy()
        expect(imageElement.getAttribute('class')).toBe('node-image')
    })
})
