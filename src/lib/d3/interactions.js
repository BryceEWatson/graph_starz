import * as d3 from 'd3';

export function setupInteractions(nodes, links) {
    const highlightConnections = (event, d) => {
        // Dim all nodes and links
        nodes.style('opacity', 0.15);
        links.style('opacity', 0.05);

        // Highlight connected nodes and links
        const connectedLinks = links.filter(l => l.source === d || l.target === d);
        const connectedNodes = nodes.filter(n => {
            return connectedLinks.data().some(l => l.source === n || l.target === n);
        });

        connectedLinks
            .style('opacity', 1)
            .attr('stroke-width', 3)
            .attr('stroke', '#3182ce')
            .attr('stroke-opacity', 0.8);

        connectedNodes
            .style('opacity', 1)
            .select('circle')
            .attr('stroke', '#3182ce')
            .attr('stroke-width', 3);
        
        // Highlight the hovered node
        d3.select(event.currentTarget)
            .style('opacity', 1)
            .select('circle')
            .attr('stroke', '#2c5282')
            .attr('stroke-width', 4)
            .attr('r', function() {
                return parseFloat(d3.select(this).attr('r')) * 1.2;
            });
    };

    const highlightPath = (event, d) => {
        // Dim all nodes and links
        nodes.style('opacity', 0.15);
        links.style('opacity', 0.05);

        // Highlight the connected nodes
        const sourceNode = nodes.filter(n => n === d.source);
        const targetNode = nodes.filter(n => n === d.target);

        sourceNode
            .style('opacity', 1)
            .select('circle')
            .attr('stroke', '#3182ce')
            .attr('stroke-width', 3);

        targetNode
            .style('opacity', 1)
            .select('circle')
            .attr('stroke', '#3182ce')
            .attr('stroke-width', 3);

        // Highlight the hovered link
        d3.select(event.currentTarget)
            .style('opacity', 1)
            .attr('stroke-width', 4)
            .attr('stroke', '#2c5282')
            .attr('stroke-opacity', 0.8);
    };

    const resetHighlight = () => {
        // Reset all nodes and links to original style with transition
        nodes
            .style('opacity', 1)
            .select('circle')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('r', d => {
                switch (d.type) {
                    case 'user': return 8;
                    case 'image': return 10;
                    case 'attribute': return 6;
                    default: return 7;
                }
            });

        links
            .style('opacity', 0.6)
            .attr('stroke', '#6b7280')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.6);
    };

    nodes
        .on('mouseover', highlightConnections)
        .on('mouseout', resetHighlight);

    links
        .on('mouseover', highlightPath)
        .on('mouseout', resetHighlight);
}
